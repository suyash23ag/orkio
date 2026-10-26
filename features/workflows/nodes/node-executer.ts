import type {Stagehand} from "@browserbasehq/stagehand"
import type {
    ActionNodeType,
    NodeType,
} from "@/features/workflows/nodes/node-registry"
import {act} from "@/features/workflows/nodes/act"
import {agent} from "@/features/workflows/nodes/agent"
import {extract} from "@/features/workflows/nodes/extract"
import {openUrl} from "@/features/workflows/nodes/open-url"
import {observe} from "@/features/workflows/nodes/observe"
import {sendEmail} from "@/features/workflows/nodes/send-email"

export type NodeContext = {
    values : Record<string,string>
    getStagehand: () => Promise<Stagehand>
    orgId: string
    workflowId: string
    emailIdempotencyKey: string
}

export type NodeExecutor = (ctx:NodeContext) => Promise<unknown>

export const nodeExecutors : Partial<Record<NodeType, NodeExecutor>> = {
"open-url" : async ({values,getStagehand}) => 
    openUrl({stagehand:await getStagehand(),url:values.url}),
"act": async ({values,getStagehand}) =>
    act({stagehand:await getStagehand(),instruction:values.instruction}),
"agent": async ({values,getStagehand}) =>
    agent({stagehand:await getStagehand(),instruction:values.instruction}),
"extract": async ({values,getStagehand}) =>
    extract({stagehand:await getStagehand(),instruction:values.instruction}),
"observe": async ({values,getStagehand}) =>
    observe({stagehand:await getStagehand(),instruction:values.instruction}),
"send-email": async ({values, orgId, workflowId, emailIdempotencyKey}) =>
    sendEmail({
        to:values.to,
        subject:values.subject,
        body:values.body,
        idempotencyKey:emailIdempotencyKey,
        activity:{orgId, workflowId},
    }),
} satisfies Record<ActionNodeType,NodeExecutor>
