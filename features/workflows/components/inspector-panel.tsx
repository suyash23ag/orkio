"use client"

import { Ban, CircleAlert, FileOutput } from "lucide-react"

import { cn } from "@/lib/utils"
import { NodeIcon } from "./right-sidebar"
import { SessionReplay } from "./session-replay"
import type { RunStep } from "../tasks/run-workflow"

function formatJson(value: unknown): string | undefined {
  try {
    const formatted = JSON.stringify(value, null, 2)
    return formatted === undefined ? undefined : formatted
  } catch {
    return String(value)
  }
}

export function InspectorPanel({
  step,
  sessionId,
}: {
  step?: RunStep
  sessionId?: string
}) {
  if (sessionId) {
    return (
      <aside className="flex size-full min-w-0 flex-col overflow-hidden bg-card">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="flex size-5 items-center justify-center rounded-md bg-violet-500/15 text-violet-500">
            <FileOutput className="size-3" />
          </span>
          <span className="truncate text-xs font-semibold">Replay</span>
        </div>
        <div className="min-h-0 flex-1 p-3">
          <SessionReplay sessionId={sessionId} />
        </div>
      </aside>
    )
  }

  if (!step) return null

  const isFailed = step.status === "failed"
  const isCanceled = step.status === "canceled"
  const value = isFailed ? step.error : step.output
  const formattedValue = isCanceled ? undefined : formatJson(value)
  const label = isFailed ? "Error" : isCanceled ? "Canceled" : "Output"

  return (
    <aside className="flex size-full min-w-0 flex-col overflow-hidden bg-card">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <NodeIcon type={step.nodeType} className="size-5 [&_svg]:size-3" />
        <span className="truncate text-xs font-semibold">{step.title}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div
          className={cn(
            "mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide",
            isFailed ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {isFailed ? (
            <CircleAlert className="size-3" />
          ) : isCanceled ? (
            <Ban className="size-3" />
          ) : (
            <FileOutput className="size-3" />
          )}
          {label}
        </div>

        {formattedValue ? (
          <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-2.5 font-mono text-[10px] leading-relaxed text-foreground">
            {formattedValue}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isFailed
              ? "This step failed without an error message."
              : isCanceled
                ? "This step was canceled."
              : step.status === "pending"
                ? "This step has not run yet."
                : step.status === "running"
                  ? "This step is still running."
                  : "This step produced no output."}
          </p>
        )}
      </div>
    </aside>
  )
}
