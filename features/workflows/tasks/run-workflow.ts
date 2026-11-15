import toposort from "toposort"
import { logger, metadata, retry, task } from "@trigger.dev/sdk"
import type { DeserializedJson } from "@trigger.dev/core/schemas"
import { getWorkflow, recordWorkflowStepEvidence } from "@/features/workflows/data"
import { Stagehand } from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executer"
import {
  interpolate,
  type WorkflowNodeOutputs,
} from "@/features/workflows/lib/interpolate"
import {
  canRecover,
  MAX_RECOVERY_ATTEMPTS,
  validateStepInputs,
  validateStepOutput,
} from "@/features/workflows/lib/validate-step"

export type RunStep = {
  nodeId: string
  nodeType: string
  title: string
  status: "pending" | "running" | "done" | "failed" | "canceled"
  durationMs?: number
  output?: unknown
  error?: SerializedStepError
}

export type SerializedStepError = {
  name: string
  message: string
  stack?: string
  cause?: unknown
}

export const runWorkflowTask = task({
  id: "run-workflow",
  retry: {
    maxAttempts: 3,
  },
  run: async ({ workflowId, orgId, workflowRunId }: { workflowId: string; orgId: string; workflowRunId: string }) => {
    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow?.graph)
      throw new Error(`Workflow ${workflowId} does not have a graph`)

    const { nodes, edges } = workflow.graph
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const aliases = new Map(
      nodes.map((node) => [
        node.data.title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        node.id,
      ])
    )

    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target])
      )
      .filter((id) => connected.has(id))

      logger.log(`Running workflow ${workflow.name}`,{steps:order.length})

    const steps: RunStep[] = order.map((nodeId) => {
      const node = byId.get(nodeId)

      return {
        nodeId,
        nodeType: node?.data.type ?? "unknown",
        title: node?.data.title ?? nodeId,
        status: "pending",
      }
    })
    metadata.set("steps", steps as unknown as DeserializedJson)

    const setStepStatus = (nodeId: string, status: RunStep["status"]) => {
      const step = steps.find((step) => step.nodeId === nodeId)
      if (!step) return

      step.status = status
      metadata.set(
        "steps",
        steps.map((currentStep) => ({ ...currentStep })) as unknown as DeserializedJson
      )
    }

    logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

    // The run owns one Browserbase session, opened lazily on the first browser
    // step and reused by every later one, so the recording spans the whole flow.
    let stagehand: Stagehand | undefined
    let sessionId: string | undefined
    const outputs: WorkflowNodeOutputs = {}
    const getStagehand = async () => {
      if (stagehand) return stagehand

      const browserbaseApiKey = process.env.BROWSERBASE_API_KEY
      if (!browserbaseApiKey) {
        throw new Error("BROWSERBASE_API_KEY is required to run browser workflows.")
      }

      stagehand = await retry.onThrow(
        async ({ attempt }) => {
          try {
            const initializedStagehand = new Stagehand({
              env: "BROWSERBASE",
              apiKey: browserbaseApiKey,
              model: {
                modelName: "auto",
              },
              // Trigger.dev provides the task logger; avoid Stagehand's Pino
              // worker, which cannot resolve its worker file from the bundle.
              disablePino: true,
            })
            await initializedStagehand.init()
            sessionId = initializedStagehand.browserbaseSessionID

            return initializedStagehand
          } catch (error) {
            logger.warn("Browserbase connection attempt failed", {
              attempt,
              error: serializeError(error),
            })
            throw error
          }
        },
        {
          maxAttempts: 3,
          minTimeoutInMs: 1_000,
          maxTimeoutInMs: 10_000,
          randomize: true,
        }
      )

      return stagehand!
    }

    try {
      for (const id of order) {
        const node = byId.get(id)
        if (!node) continue
        logger.log(`Running step: ${node.data.title}`)
        const executor = nodeExecutors[node.data.type]

        setStepStatus(id, "running")
        await metadata.flush()
        const startedAt = Date.now()
        const step = steps.find((currentStep) => currentStep.nodeId === id)

        try {
        const values = Object.fromEntries(
          Object.entries(node.data.values).map(([key, value]) => [
            key,
            interpolate(value, outputs, aliases),
          ])
        )
        let completed = false

        for (let attempt = 0; attempt <= MAX_RECOVERY_ATTEMPTS; attempt++) {
          try {
            const inputCheck = validateStepInputs(node.data.type, values)
            await recordEvidenceSafe({
              orgId,
              workflowId,
              runId: workflowRunId,
              nodeId: id,
              nodeType: node.data.type,
              attempt: attempt + 1,
              phase: "precondition",
              status: inputCheck.ok ? "passed" : "failed",
              message: inputCheck.message,
              inputSummary: summarize(values),
            })
            if (!inputCheck.ok) throw new NonRecoverableStepError(inputCheck.message ?? "Invalid step input")

            const output = executor
              ? await executor({
                  values,
                  getStagehand,
                  orgId,
                  workflowId,
                  emailIdempotencyKey: `workflow-email:${workflowRunId}:${id}`,
                })
              : { started: true }
            outputs[id] = output

            const outputCheck = validateStepOutput(node.data.type, output)
            await recordEvidenceSafe({
              orgId,
              workflowId,
              runId: workflowRunId,
              nodeId: id,
              nodeType: node.data.type,
              attempt: attempt + 1,
              phase: "postcondition",
              status: outputCheck.ok ? "passed" : "failed",
              message: outputCheck.message,
              outputSummary: summarize(output),
            })
            if (!outputCheck.ok) throw new Error(outputCheck.message ?? "Step postcondition failed")

            if (attempt > 0) {
              await recordEvidenceSafe({
                orgId,
                workflowId,
                runId: workflowRunId,
                nodeId: id,
                nodeType: node.data.type,
                attempt: attempt + 1,
                phase: "execution",
                status: "recovered",
                message: `Recovered after ${attempt} attempt(s).`,
              })
            }
            completed = true
            break
          } catch (error) {
            await recordEvidenceSafe({
              orgId,
              workflowId,
              runId: workflowRunId,
              nodeId: id,
              nodeType: node.data.type,
              attempt: attempt + 1,
              phase: "execution",
              status: "failed",
              message: error instanceof Error ? error.message : String(error),
            })
            if (attempt >= MAX_RECOVERY_ATTEMPTS || !canRecover(node.data.type, error)) throw error
            logger.warn("Recovering workflow step", {
              nodeId: id,
              attempt: attempt + 1,
              maxRecoveryAttempts: MAX_RECOVERY_ATTEMPTS,
            })
          }
        }

        if (!completed) throw new Error(`Step ${node.data.title} did not complete.`)
        if (step) {
          step.durationMs = Date.now() - startedAt
          step.output = outputs[id]
        }
        setStepStatus(id, "done")
        await metadata.flush()
      } catch (error) {
        if (step) {
          step.durationMs = Date.now() - startedAt
          step.error = serializeError(error)
        }
        setStepStatus(id, "failed")
        await metadata.flush()

        throw error
      }
      }
    } finally {
      // A Browserbase session can close its CDP socket before the SDK has
      // finished its shutdown handshake. Cleanup must not turn otherwise
      // successful node results into a failed (and therefore retried) run.
      try {
        await stagehand?.close()
      } catch (error) {
        logger.warn("Stagehand cleanup failed after workflow execution", {
          error: serializeError(error),
        })
      }

    }

    return { steps, outputs, sessionId }
  },
})

function serializeError(error: unknown): SerializedStepError {
  if (!(error instanceof Error)) {
    return { name: "Error", message: String(error) }
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause:
      error.cause instanceof Error ? serializeError(error.cause) : error.cause,
  }
}

class NonRecoverableStepError extends Error {
  recoverable = false
}

function summarize(value: unknown) {
  let output: string
  try {
    output = typeof value === "string" ? value : JSON.stringify(value)
  } catch {
    output = String(value)
  }
  return output.replace(/([\w.+-]+)@([\w.-]+\.[A-Za-z]{2,})/g, "[email]").slice(0, 4000)
}

async function recordEvidenceSafe(input: Parameters<typeof recordWorkflowStepEvidence>[0]) {
  try {
    await recordWorkflowStepEvidence(input)
  } catch (error) {
    logger.warn("Unable to record workflow evidence", { error: serializeError(error) })
  }
}
