"use client"

import prettyMilliseconds from "pretty-ms"
import {
  Ban,
  Check,
  CircleAlert,
  Clock3,
  Film,
  LockKeyhole,
} from "lucide-react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { NodeIcon } from "./right-sidebar"
import { useProGate } from "../hooks/use-pro-gate"
import type { WorkflowRun } from "./workflow-runs-provider"
import type { RunStep } from "../tasks/run-workflow"

function formatDuration(durationMs: number | undefined) {
  return durationMs === undefined ? "—" : prettyMilliseconds(durationMs)
}

function formatRunTime(createdAt: Date) {
  return createdAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function StepStatusIcon({ step }: { step: RunStep }) {
  if (step.status === "canceled") {
    return <Ban className="size-3.5 text-muted-foreground" />
  }

  if (step.status === "running") {
    return <Spinner className="size-3.5 text-blue-500" />
  }

  if (step.status === "failed") {
    return <CircleAlert className="size-3.5 text-destructive" />
  }

  if (step.status === "done") {
    return <Check className="size-3.5 text-emerald-500" />
  }

  return <Clock3 className="size-3.5 text-muted-foreground" />
}

export function LogsPanel({
  runs,
  selectedKey,
  onStepSelect,
  onReplaySelect,
}: {
  runs: WorkflowRun[]
  selectedKey: string | undefined
  onStepSelect: (runId: string, step: RunStep) => void
  onReplaySelect: (runId: string) => void
}) {
  const { canUsePro, goToPricing } = useProGate()

  return (
    <div className="flex size-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-xs text-muted-foreground">
            No runs yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <section key={run.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full bg-muted-foreground",
                        run.status === "EXECUTING" && "bg-blue-500",
                        run.status === "COMPLETED" && "bg-emerald-500",
                        (run.status === "FAILED" || run.status === "CANCELED") &&
                          "bg-destructive"
                      )}
                    />
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {formatRunTime(run.createdAt)}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] lowercase text-muted-foreground">
                    {run.status.toLowerCase()}
                  </span>
                </div>

                <div className="mt-1.5 space-y-0.5 border-l border-border pl-3">
                  {run.sessionId &&
                    run.finishedAt &&
                    (() => {
                      const isLocked = !canUsePro

                      return (
                        <button
                          type="button"
                          aria-pressed={
                            !isLocked && selectedKey === `${run.id}:replay`
                          }
                          aria-label={
                            isLocked
                              ? "Upgrade to Pro to watch this replay"
                              : "Watch replay"
                          }
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                            !isLocked &&
                              selectedKey === `${run.id}:replay` &&
                              "bg-accent",
                            isLocked && "text-muted-foreground"
                          )}
                          onClick={() =>
                            isLocked ? goToPricing() : onReplaySelect(run.id)
                          }
                        >
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-500",
                              isLocked && "opacity-60"
                            )}
                          >
                            <Film className="size-3" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">
                            Replay
                          </span>
                          {isLocked && <LockKeyhole className="size-3.5" />}
                        </button>
                      )
                    })()}

                  {run.steps.map((step) => {
                    const stepKey = `${run.id}:${step.nodeId}`
                    const isSelected = selectedKey === stepKey
                    const isPending = step.status === "pending"

                    return (
                      <button
                        key={step.nodeId}
                        type="button"
                        aria-pressed={isSelected}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                          isSelected && "bg-accent",
                          isPending && "opacity-40",
                          step.status === "failed" && "text-destructive"
                        )}
                        onClick={() => onStepSelect(run.id, step)}
                      >
                        <NodeIcon
                          type={step.nodeType}
                          className={cn(
                            "size-5 [&_svg]:size-3",
                            step.status === "running" && "animate-spin",
                            step.status === "failed" &&
                              "bg-destructive text-white"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {step.title}
                        </span>
                        <StepStatusIcon step={step} />
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDuration(step.durationMs)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
