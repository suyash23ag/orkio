"use client"

import { useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { InspectorPanel } from "./inspector-panel"
import { LogsPanel } from "./logs-panel"
import { useWorkflowRuns, type WorkflowRun } from "./workflow-runs-provider"
import type { RunStep } from "../tasks/run-workflow"

type Selection =
  | { kind: "step"; runId: string; nodeId: string }
  | { kind: "replay"; runId: string }

export function ConsolePanel() {
  const runs = useWorkflowRuns()
  const [selection, setSelection] = useState<Selection>()

  const handleStepSelect = (runId: string, step: RunStep) => {
    setSelection((current) =>
      current?.kind === "step" &&
      current.runId === runId &&
      current.nodeId === step.nodeId
        ? undefined
        : { kind: "step", runId, nodeId: step.nodeId }
    )
  }

  const handleReplaySelect = (runId: string) => {
    setSelection((current) =>
      current?.kind === "replay" && current.runId === runId
        ? undefined
        : { kind: "replay", runId }
    )
  }

  const selectedKey = selection
    ? selection.kind === "replay"
      ? `${selection.runId}:replay`
      : `${selection.runId}:${selection.nodeId}`
    : undefined
  const selectedRun = selection
    ? runs.find((run) => run.id === selection.runId)
    : undefined
  const selectedStepData =
    selection?.kind === "step"
      ? selectedRun?.steps.find((step) => step.nodeId === selection.nodeId)
      : undefined
  const selectedReplaySessionId =
    selection?.kind === "replay" && selectedRun?.finishedAt
      ? selectedRun.sessionId
      : undefined

  const logs = (
    <LogsPanel
      runs={runs}
      selectedKey={selectedKey}
      onStepSelect={handleStepSelect}
      onReplaySelect={handleReplaySelect}
    />
  )

  if (!selectedStepData && !selectedReplaySessionId) {
    return <div className="size-full min-h-0 overflow-hidden">{logs}</div>
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="size-full min-h-0"
    >
      <ResizablePanel defaultSize="50%" minSize="12rem">
        {logs}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="50%" minSize="12rem">
        <InspectorPanel
          step={selectedStepData}
          sessionId={selectedReplaySessionId}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export type { WorkflowRun }
