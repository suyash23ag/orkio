import { and, desc, eq } from "drizzle-orm"
import * as Sentry from "@sentry/nextjs"

import { db } from "@/lib/db"
import { workflows, workflowStepEvidence, WorkflowGraph } from "@/lib/db/schema"
import {validateGraph} from "@/features/workflows/lib/validate-graph"

export async function saveWorkflowGraph({
  orgId,
  id,
  graph,
}:{
  orgId:string,
  id:string,
  graph:WorkflowGraph
}){
  const problems = validateGraph(graph)
  if (problems.length > 0) {
    Sentry.logger.warn("Workflow graph validation failed", {
      problemCount: problems.length,
    })
    throw new Error(problems.join(" "))
  }
  await db
    .update(workflows)
    .set({graph, updatedAt:new Date() })
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
  Sentry.logger.debug("Workflow graph saved", { workflowId: id })
  }


export function listWorkflows(orgId: string) {
  return db
    .select()
    .from(workflows)
    .where(eq(workflows.orgId, orgId))
    .orderBy(desc(workflows.createdAt))
}

export async function getWorkflow(orgId: string, id: string) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
    .limit(1)

  return workflow
}

export async function createWorkflow(orgId: string, name: string) {
  const [workflow] = await db
    .insert(workflows)
    .values({ orgId, name })
    .returning()

  Sentry.logger.debug("Workflow record created", { workflowId: workflow.id })

  return workflow
}

export async function renameWorkflow(orgId: string, id: string, name: string) {
  return db
    .update(workflows)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
}

export async function deleteWorkflow(orgId: string, id: string) {
  return db
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
}

export async function recordWorkflowStepEvidence(input: {
  orgId: string
  workflowId: string
  runId: string
  nodeId: string
  nodeType: string
  attempt: number
  phase: "precondition" | "execution" | "postcondition"
  status: "passed" | "failed" | "recovered"
  message?: string
  inputSummary?: string
  outputSummary?: string
}) {
  await db.insert(workflowStepEvidence).values(input)
}
