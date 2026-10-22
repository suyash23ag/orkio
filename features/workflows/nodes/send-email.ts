import { resend } from "@/lib/resend"
import * as Sentry from "@sentry/nextjs"

export async function sendEmail({
  to,
  subject,
  body,
  idempotencyKey,
}: {
  to: string
  subject: string
  body: string
  idempotencyKey?: string
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: [to],
    subject,
    html: body,
  }, idempotencyKey ? { idempotencyKey } : undefined)

  if (error || !data) {
    Sentry.logger.error("Workflow email delivery failed", {
      hasProviderError: Boolean(error),
    })
    throw new Error(error?.message ?? "Resend returned no email id")
  }

  Sentry.logger.info("Workflow email delivered")

  return { id: data.id }
}
