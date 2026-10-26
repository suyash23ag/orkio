import "server-only"

import { idempotencyKeys, tasks } from "@trigger.dev/sdk"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { appointmentEmailJobs, appointments } from "@/lib/db/schema"
import { getAppointmentByRequestKey } from "./data"
import { localDateTimeToUtc } from "./lib/time"
import {
  appointmentInputSchema,
  type AppointmentInput,
} from "./types"
import type { sendAppointmentConfirmationTask } from "./tasks/send-confirmation"

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  )
}

export async function bookAppointment({
  orgId,
  hostUserId,
  input,
}: {
  orgId: string
  hostUserId: string
  input: AppointmentInput
}) {
  const parsed = appointmentInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid appointment",
    }
  }

  let startsAt: Date
  try {
    startsAt = localDateTimeToUtc(
      parsed.data.date,
      parsed.data.time,
      parsed.data.timezone
    )
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Invalid appointment time",
    }
  }

  if (startsAt <= new Date()) {
    return { ok: false as const, message: "Choose a future appointment time" }
  }

  let appointment = await getAppointmentByRequestKey(orgId, parsed.data.requestId)

  if (!appointment) {
    try {
      const [created] = await db
        .insert(appointments)
        .values({
          orgId,
          hostUserId,
          inviteeName: parsed.data.name,
          inviteeEmail: parsed.data.email,
          purpose: parsed.data.purpose,
          startsAt,
          timezone: parsed.data.timezone,
          status: "confirmed",
          idempotencyKey: parsed.data.requestId,
        })
        .returning()

      appointment = created
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error
      }

      appointment = await getAppointmentByRequestKey(orgId, parsed.data.requestId)
      if (!appointment) {
        return {
          ok: false as const,
          message: "That time slot is no longer available. Choose another time.",
        }
      }
    }
  }

  const [newJob] = await db
    .insert(appointmentEmailJobs)
    .values({ appointmentId: appointment.id, kind: "confirmation", status: "queued" })
    .onConflictDoNothing({
      target: [appointmentEmailJobs.appointmentId, appointmentEmailJobs.kind],
    })
    .returning()

  const jobId =
    newJob?.id ??
    (
      await db
        .select({ id: appointmentEmailJobs.id })
        .from(appointmentEmailJobs)
        .where(eq(appointmentEmailJobs.appointmentId, appointment.id))
        .limit(1)
    )[0]?.id

  if (!jobId) {
    throw new Error("Could not queue the confirmation email")
  }

  const triggerIdempotencyKey = await idempotencyKeys.create(
    `appointment-confirmation:${jobId}`,
    { scope: "global" }
  )

  await tasks.trigger<typeof sendAppointmentConfirmationTask>(
    "send-appointment-confirmation",
    { jobId },
    {
      idempotencyKey: triggerIdempotencyKey,
      tags: [`org:${orgId}`, `appointment:${appointment.id}`],
    }
  )

  return { ok: true as const, appointmentId: appointment.id }
}

export async function cancelAppointment({
  orgId,
  hostUserId,
  appointmentId,
}: {
  orgId: string
  hostUserId: string
  appointmentId: string
}) {
  await db
    .update(appointments)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.orgId, orgId),
        eq(appointments.hostUserId, hostUserId),
        eq(appointments.status, "confirmed")
      )
    )
}

export async function deleteAppointment({
  orgId,
  hostUserId,
  appointmentId,
}: {
  orgId: string
  hostUserId: string
  appointmentId: string
}) {
  await db
    .delete(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.orgId, orgId),
        eq(appointments.hostUserId, hostUserId)
      )
    )
}
