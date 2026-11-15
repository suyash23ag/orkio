"use server"

import { auth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"
import { runs,tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { runWorkflowTask } from "./tasks/run-workflow"
import { liveblocks } from "@/lib/liveblocks"

import { createWorkflow, deleteWorkflow, getWorkflow, renameWorkflow, saveWorkflowGraph } from "./data"
import {WorkflowGraph} from "@/lib/db/schema"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  Sentry.logger.info("Creating workflow", { hasOrganization: Boolean(orgId) })

  if (!orgId) {
    throw new Error("No active organization")
  }

  const workflow = await createWorkflow(orgId, name)

  Sentry.logger.info("Workflow created", { workflowId: workflow.id })

  revalidatePath("/workflows", "layout")
  redirect(`/workflows/${workflow.id}`)
}

export async function deleteWorkflowAction(workflowId: string) {
  const { orgId } = await auth()

  Sentry.logger.info("Deleting workflow", {
    workflowId,
    hasOrganization: Boolean(orgId),
  })

  if (!orgId) {
    throw new Error("No active organization")
  }

  const workflow = await getWorkflow(orgId, workflowId)

  if (!workflow) {
    throw new Error("Workflow not found")
  }

  await liveblocks.deleteRoom(workflow.id)
  await deleteWorkflow(orgId, workflow.id)

  Sentry.logger.info("Workflow deleted", { workflowId: workflow.id })

  revalidatePath("/workflows", "layout")
  redirect("/")
}

export async function renameWorkflowAction(workflowId: string, name: string) {
  const { orgId } = await auth()
  const trimmedName = name.trim()

  if (!orgId) throw new Error("No active organization")
  if (!trimmedName) throw new Error("Workflow name cannot be empty")

  const workflow = await getWorkflow(orgId, workflowId)
  if (!workflow) throw new Error("Workflow not found")

  await renameWorkflow(orgId, workflowId, trimmedName)
  revalidatePath("/", "layout")
}

export async function runWorkflowAction({
  id,
  graph,
}:{
  id:string,
  graph:WorkflowGraph
}) {
  const { has, orgId } = await auth()

  Sentry.logger.info("Starting workflow", {
    workflowId: id,
    hasOrganization: Boolean(orgId),
    nodeCount: graph.nodes.length,
  })

  if (!orgId) {
    throw new Error("No active organization")
  }

  if (
    graph.nodes.some((node) => node.data.type === "agent") &&
    !has({ plan: "org:pro" })
  ) {
    throw new Error("Pro plan required to run workflows with Agent nodes")
  }

  await saveWorkflowGraph({ orgId, id, graph })
  const workflowRunId = crypto.randomUUID()

  const handle =  await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId: id, orgId, workflowRunId },
    {
      tags: [`workflow:${id}`],
      maxAttempts: 3,
    }
  )
  Sentry.logger.info("Workflow run triggered", { workflowId: id, runId: handle.id })
  return {
    runId: handle.id,
    publicAccessToken: handle.publicAccessToken,
  }
}

export async function cancelWorkflowAction(runId: string) {
  const { orgId } = await auth()

  Sentry.logger.info("Canceling workflow run", {
    runId,
    hasOrganization: Boolean(orgId),
  })
  
  if (!orgId) {
    throw new Error("No active organization")
  }
  await runs.cancel(runId)

  Sentry.logger.info("Workflow run canceled", { runId })

}
