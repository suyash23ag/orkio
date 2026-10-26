import "server-only"

import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appointmentEmailJobs, appointments, workflowEmailLogs, workflows } from "@/lib/db/schema"

export function listAppointments(orgId: string) {
  return db
    .select({
      appointment: appointments,
      emailStatus: appointmentEmailJobs.status,
      emailProviderMessageId: appointmentEmailJobs.providerMessageId,
      emailLastError: appointmentEmailJobs.lastError,
    })
    .from(appointments)
    .leftJoin(
      appointmentEmailJobs,
      eq(appointmentEmailJobs.appointmentId, appointments.id)
    )
    .where(eq(appointments.orgId, orgId))
    .orderBy(asc(appointments.startsAt))
}

export function listWorkflowEmailActivity(orgId: string) {
  return db
    .select({
      id: workflowEmailLogs.id,
      recipient: workflowEmailLogs.recipient,
      subject: workflowEmailLogs.subject,
      status: workflowEmailLogs.status,
      lastError: workflowEmailLogs.lastError,
      createdAt: workflowEmailLogs.createdAt,
      workflowName: workflows.name,
    })
    .from(workflowEmailLogs)
    .leftJoin(workflows, eq(workflowEmailLogs.workflowId, workflows.id))
    .where(eq(workflowEmailLogs.orgId, orgId))
    .orderBy(desc(workflowEmailLogs.createdAt))
}

export async function getAppointmentByRequestKey(
  orgId: string,
  requestId: string
) {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.orgId, orgId),
        eq(appointments.idempotencyKey, requestId)
      )
    )
    .limit(1)

  return appointment
}
