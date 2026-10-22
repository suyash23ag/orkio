"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { bookAppointment, cancelAppointment } from "./service"
import type { AppointmentInput } from "./types"

export async function bookAppointmentAction(input: AppointmentInput) {
  const { orgId } = await auth()
  if (!orgId) {
    throw new Error("No active organization")
  }

  const { userId } = await auth()
  if (!userId) {
    throw new Error("You must be signed in to book an appointment")
  }

  const result = await bookAppointment({ orgId, hostUserId: userId, input })

  revalidatePath("/appointments")

  return result
}

export async function cancelAppointmentAction(appointmentId: string) {
  const { orgId, userId } = await auth()
  if (!orgId || !userId) {
    throw new Error("You must be signed in to cancel an appointment")
  }

  await cancelAppointment({ orgId, hostUserId: userId, appointmentId })

  revalidatePath("/appointments")
  return { ok: true as const }
}
