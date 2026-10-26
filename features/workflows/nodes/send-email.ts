import { resend } from "@/lib/resend"
import * as Sentry from "@sentry/nextjs"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workflowEmailLogs } from "@/lib/db/schema"

export async function sendEmail({
  to,
  subject,
  body,
  idempotencyKey,
  activity,
}: {
  to: string
  subject: string
  body: string
  idempotencyKey?: string
  activity?: { orgId: string; workflowId: string }
}) {
  if (activity && idempotencyKey) {
    await db
      .insert(workflowEmailLogs)
      .values({
        orgId: activity.orgId,
        workflowId: activity.workflowId,
        recipient: to,
        subject,
        idempotencyKey,
      })
      .onConflictDoNothing({ target: workflowEmailLogs.idempotencyKey })
  }

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: [to],
    subject,
    html: body,
  }, idempotencyKey ? { idempotencyKey } : undefined)

  if (error || !data) {
    if (activity && idempotencyKey) {
      await db
        .update(workflowEmailLogs)
        .set({
          status: "failed",
          lastError: error?.message ?? "Resend returned no email id",
          updatedAt: new Date(),
        })
        .where(eq(workflowEmailLogs.idempotencyKey, idempotencyKey))
    }
    Sentry.logger.error("Workflow email delivery failed", {
      hasProviderError: Boolean(error),
    })
    throw new Error(error?.message ?? "Resend returned no email id")
  }

  if (activity && idempotencyKey) {
    await db
      .update(workflowEmailLogs)
      .set({
        status: "sent",
        providerMessageId: data.id,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(workflowEmailLogs.idempotencyKey, idempotencyKey))
  }

  Sentry.logger.info("Workflow email delivered")

  return { id: data.id }
}
