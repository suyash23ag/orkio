import { eq } from "drizzle-orm"
import { logger, task } from "@trigger.dev/sdk"

import { sendEmail } from "@/features/workflows/nodes/send-email"
import { appointmentEmailJobs, appointments } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { formatAppointmentDate } from "../lib/time"

export const sendAppointmentConfirmationTask = task({
  id: "send-appointment-confirmation",
  retry: { maxAttempts: 5 },
  run: async ({ jobId }: { jobId: string }) => {
    const [job] = await db
      .select({
        job: appointmentEmailJobs,
        appointment: appointments,
      })
      .from(appointmentEmailJobs)
      .innerJoin(appointments, eq(appointmentEmailJobs.appointmentId, appointments.id))
      .where(eq(appointmentEmailJobs.id, jobId))
      .limit(1)

    if (!job) {
      throw new Error(`Appointment email job ${jobId} was not found`)
    }

    if (job.job.status === "sent") {
      return { skipped: true, providerMessageId: job.job.providerMessageId }
    }

    let result
    try {
      result = await sendEmail({
        to: job.appointment.inviteeEmail,
        subject: `Appointment confirmed: ${job.appointment.purpose}`,
        body: `
          <h2>Appointment confirmed</h2>
          <p>Hi ${escapeHtml(job.appointment.inviteeName)},</p>
          <p>Your appointment for <strong>${escapeHtml(job.appointment.purpose)}</strong> is confirmed.</p>
          <p><strong>When:</strong> ${escapeHtml(
            formatAppointmentDate(job.appointment.startsAt, job.appointment.timezone)
          )}</p>
          <p><strong>Timezone:</strong> ${escapeHtml(job.appointment.timezone)}</p>
        `,
        idempotencyKey: `appointment-email:${job.appointment.id}`,
      })
    } catch (error) {
      await db
        .update(appointmentEmailJobs)
        .set({
          status: "failed",
          lastError: error instanceof Error ? error.message : "Email delivery failed",
          updatedAt: new Date(),
        })
        .where(eq(appointmentEmailJobs.id, jobId))
      throw error
    }

    await db
      .update(appointmentEmailJobs)
      .set({
        status: "sent",
        providerMessageId: result.id,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(appointmentEmailJobs.id, jobId))

    logger.info("Appointment confirmation email sent", {
      appointmentId: job.appointment.id,
    })

    return { skipped: false, providerMessageId: result.id }
  },
})

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character
  )
}
