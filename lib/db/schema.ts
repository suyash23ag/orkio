// Define Drizzle tables in this module and generate migrations with `npm run db:generate`.

import { sql } from "drizzle-orm"
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type {Edge} from "@xyflow/react"
import type {StepNodeType} from "@/features/workflows/nodes/node-registry"

export type WorkflowGraph={nodes:StepNodeType[]; edges:Edge[]}


export const workflows=pgTable("workflows",{
    id:uuid("id").primaryKey().defaultRandom(),
    orgId:text("org_id").notNull(),
    name:text("name").notNull(),
    graph:jsonb("graph").$type<WorkflowGraph>(),
    createdAt:timestamp("created_at",{mode:"date"}).defaultNow().notNull(),
    updatedAt:timestamp("updated_at",{mode:"date"}).defaultNow().notNull(),
})

export type Workflow = typeof workflows.$inferSelect

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    hostUserId: text("host_user_id").notNull(),
    inviteeName: text("invitee_name").notNull(),
    inviteeEmail: text("invitee_email").notNull(),
    purpose: text("purpose").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    timezone: text("timezone").notNull(),
    status: text("status").notNull().default("confirmed"),
    idempotencyKey: text("idempotency_key").notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("appointments_org_created_idx").on(table.orgId, table.createdAt),
    uniqueIndex("appointments_request_key_unique").on(table.orgId, table.idempotencyKey),
    uniqueIndex("appointments_active_slot_unique")
      .on(table.orgId, table.hostUserId, table.startsAt)
      .where(sql`${table.status} = 'confirmed'`),
  ]
)

export const appointmentEmailJobs = pgTable(
  "appointment_email_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("confirmation"),
    status: text("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("appointment_email_jobs_appointment_kind_unique").on(
      table.appointmentId,
      table.kind
    ),
    index("appointment_email_jobs_status_idx").on(table.status),
  ]
)

export const workflowEmailLogs = pgTable(
  "workflow_email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("workflow_email_logs_org_created_idx").on(table.orgId, table.createdAt),
    uniqueIndex("workflow_email_logs_idempotency_key_unique").on(table.idempotencyKey),
  ]
)

export const workflowStepEvidence = pgTable(
  "workflow_step_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    runId: text("run_id").notNull(),
    nodeId: text("node_id").notNull(),
    nodeType: text("node_type").notNull(),
    attempt: integer("attempt").notNull(),
    phase: text("phase").notNull(),
    status: text("status").notNull(),
    message: text("message"),
    inputSummary: text("input_summary"),
    outputSummary: text("output_summary"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("workflow_step_evidence_run_idx").on(table.orgId, table.workflowId, table.runId),
    index("workflow_step_evidence_created_idx").on(table.orgId, table.createdAt),
  ]
)

export type Appointment = typeof appointments.$inferSelect
export type AppointmentEmailJob = typeof appointmentEmailJobs.$inferSelect
export type WorkflowEmailLog = typeof workflowEmailLogs.$inferSelect
export type WorkflowStepEvidence = typeof workflowStepEvidence.$inferSelect
