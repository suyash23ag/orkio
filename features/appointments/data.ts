import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appointments } from "@/lib/db/schema"

export function listAppointments(orgId: string) {
  return db
    .select()
    .from(appointments)
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
