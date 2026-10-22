import "server-only"

import { Resend } from "resend"
import * as Sentry from "@sentry/nextjs"

const apiKey = process.env.RESEND_API_KEY

if (!apiKey) {
  throw new Error("RESEND_API_KEY is required to initialize Resend")
}

export const resend = new Resend(apiKey)

Sentry.logger.debug("Resend client initialized")
