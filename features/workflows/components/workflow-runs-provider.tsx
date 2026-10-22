"use client"

import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"
import * as Sentry from "@sentry/nextjs"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { runWorkflowTask, RunStep } from "../tasks/run-workflow"
import type { StepNodeType } from "../nodes/node-registry"

export type WorkflowRun = {
  id: string
  status: string
  createdAt: Date
  startedAt?: Date
  finishedAt?: Date
  durationMs: number
  error?: unknown
  steps: RunStep[]
  sessionId?: string
}

type WorkflowRunsContextValue = {
  runs: WorkflowRun[]
  steps: RunStep[] | undefined
  isLive: boolean
  markRunCanceled: (runId: string) => void
  unmarkRunCanceled: (runId: string) => void
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | undefined>(
  undefined
)

function getRunSteps(
  value: unknown,
  nodesById: Map<string, StepNodeType>
): RunStep[] | undefined {
  if (typeof value === "string") {
    try {
      return getRunSteps(JSON.parse(value), nodesById)
    } catch (error) {
      Sentry.captureException(error)
      Sentry.logger.warn("Unable to parse workflow run steps")
      return undefined
    }
  }

  if (!Array.isArray(value)) return undefined

  const steps = value.flatMap((step): RunStep[] => {
    if (
      typeof step !== "object" ||
      step === null ||
      typeof step.nodeId !== "string" ||
      !["pending", "running", "done", "failed", "canceled"].includes(
        step.status
      )
    ) {
      return []
    }

    const node = nodesById.get(step.nodeId)

    return [
      {
        ...(step as RunStep),
        nodeType:
          typeof step.nodeType === "string"
            ? step.nodeType
            : node?.data.type ?? "unknown",
        title:
          typeof step.title === "string"
            ? step.title
            : node?.data.title ?? step.nodeId,
      },
    ]
  })

  return steps.length > 0 ? steps : undefined
}

function getStepsValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return getStepsValue(JSON.parse(value))
    } catch (error) {
      Sentry.captureException(error)
      Sentry.logger.warn("Unable to parse workflow run output")
      return undefined
    }
  }

  if (typeof value !== "object" || value === null || !("steps" in value)) {
    return undefined
  }

  return value.steps
}

function getSessionIdValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    try {
      return getSessionIdValue(JSON.parse(value))
    } catch (error) {
      Sentry.captureException(error)
      Sentry.logger.warn("Unable to parse workflow session metadata")
      return undefined
    }
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("sessionId" in value) ||
    typeof value.sessionId !== "string"
  ) {
    return undefined
  }

  return value.sessionId
}

export function WorkflowRunsProvider({
  workflowId,
  publicAccessToken,
  nodes,
  children,
}: {
  workflowId: string
  publicAccessToken: string
  nodes: StepNodeType[]
  children: ReactNode
}) {
  const [locallyCanceledRunIds, setLocallyCanceledRunIds] = useState<Set<string>>(
    () => new Set()
  )
  const { runs } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    { accessToken: publicAccessToken }
  )

  const markRunCanceled = useCallback((runId: string) => {
    setLocallyCanceledRunIds((current) => {
      const next = new Set(current)
      next.add(runId)
      return next
    })
  }, [])

  const unmarkRunCanceled = useCallback((runId: string) => {
    setLocallyCanceledRunIds((current) => {
      if (!current.has(runId)) return current

      const next = new Set(current)
      next.delete(runId)
      return next
    })
  }, [])

  const value = useMemo<WorkflowRunsContextValue>(() => {
    const nodesById = new Map(nodes.map((node) => [node.id, node]))
    const workflowRuns: WorkflowRun[] = runs
      .map((run) => {
        const steps =
          getRunSteps(getStepsValue(run.output), nodesById) ??
          getRunSteps(getStepsValue(run.metadata), nodesById) ??
          []

        return {
        id: run.id,
        status: run.status,
        createdAt: run.createdAt,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs: run.durationMs,
        error: run.error,
        // Recording data is available in the completed task output, not live
        // metadata, so keep this value output-only.
        sessionId: getSessionIdValue(run.output),
          steps:
            run.status === "CANCELED"
              ? steps.map((step) =>
                  step.status === "running"
                    ? { ...step, status: "canceled" as const }
                    : step
                )
              : steps,
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const latestRun = runs.reduce<(typeof runs)[number] | undefined>(
      (latest, run) =>
        !latest || run.createdAt > latest.createdAt ? run : latest,
      undefined
    )

    return {
      runs: workflowRuns,
      steps:
        (latestRun &&
          getRunSteps(getStepsValue(latestRun.output), nodesById)) ??
        (latestRun &&
          getRunSteps(getStepsValue(latestRun.metadata), nodesById)),
      isLive:
        Boolean(
          latestRun &&
            !locallyCanceledRunIds.has(latestRun.id) &&
            (latestRun.status === "QUEUED" || latestRun.status === "EXECUTING")
        ),
      markRunCanceled,
      unmarkRunCanceled,
    }
  }, [
    locallyCanceledRunIds,
    markRunCanceled,
    nodes,
    runs,
    unmarkRunCanceled,
  ])

  return (
    <WorkflowRunsContext.Provider value={value}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

export function useLatestRunSteps(): WorkflowRunsContextValue {
  const value = useContext(WorkflowRunsContext)

  if (!value) {
    throw new Error(
      "useLatestRunSteps must be used within a WorkflowRunsProvider"
    )
  }

  return value
}

export function useWorkflowRuns(): WorkflowRun[] {
  const value = useContext(WorkflowRunsContext)

  if (!value) {
    throw new Error("useWorkflowRuns must be used within a WorkflowRunsProvider")
  }

  return value.runs
}
