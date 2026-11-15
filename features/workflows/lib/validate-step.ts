import type { NodeType } from "../nodes/node-registry"

export const MAX_RECOVERY_ATTEMPTS = 2

export type StepValidation = {
  ok: boolean
  message?: string
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
}

export function validateStepInputs(type: NodeType, values: Record<string, string>): StepValidation {
  const unresolved = Object.entries(values).find(([, value]) => value.includes("{{") || value.includes("}}"))
  if (unresolved) {
    return { ok: false, message: `Unresolved workflow placeholder in ${unresolved[0]}.` }
  }

  if (type === "open-url" && !/^https?:\/\//i.test(values.url?.trim() ?? "")) {
    return { ok: false, message: "Open URL requires an http or https URL." }
  }

  if (type === "send-email") {
    const recipient = values.to?.trim() ?? ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return { ok: false, message: "Send Email requires one valid recipient email address." }
    }
    if (!hasText(values.subject)) return { ok: false, message: "Send Email requires a subject." }
    if (!hasText(values.body)) return { ok: false, message: "Send Email requires a non-empty body." }
  }

  return { ok: true }
}

export function validateStepOutput(type: NodeType, output: unknown): StepValidation {
  if (type === "start") return { ok: true }
  if (!output || typeof output !== "object") {
    return { ok: false, message: `${type} returned no structured output.` }
  }

  const value = output as Record<string, unknown>
  switch (type) {
    case "open-url":
      return hasText(value.url) ? { ok: true } : { ok: false, message: "Open URL did not produce a final URL." }
    case "act":
    case "agent":
      return value.success === true ? { ok: true } : { ok: false, message: `${type} did not report success.` }
    case "observe":
      return Array.isArray(value.matches) ? { ok: true } : { ok: false, message: "Observe did not return matches." }
    case "extract":
      return hasText(value.extraction) ? { ok: true } : { ok: false, message: "Extract returned an empty result." }
    case "send-email":
      return hasText(value.id) ? { ok: true } : { ok: false, message: "Send Email did not return a provider message ID." }
    default:
      return { ok: true }
  }
}

export function canRecover(type: NodeType, error: unknown) {
  // An email provider may have accepted a message before the client observed
  // an error. Never automatically repeat that external side effect.
  if (type === "send-email") return false
  if (typeof error === "object" && error !== null && "recoverable" in error && error.recoverable === false) return false
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return !message.includes("idempotency") && !message.includes("unauthorized")
}
