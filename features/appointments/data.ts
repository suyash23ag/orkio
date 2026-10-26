import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appointmentEmailJobs, appointments } from "@/lib/db/schema"

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
