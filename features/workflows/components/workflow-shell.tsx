"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import type { Edge, OnConnect } from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useEffect } from "react"
import { Canvas } from "@/features/workflows/components/canvas"
import { RightSidebar } from "@/features/workflows/components/right-sidebar"
import { ConsolePanel } from "@/features/workflows/components/console-panel"
import {
  nodeRegistry,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"
import type { WorkflowGraph } from "@/lib/db/schema"

const initialNodes: StepNodeType[] = [
  {
    id: "start",
    type: "step",
    position: { x: 0, y: 0 },
    data: {
      type: "start",
      kind: "trigger",
      title: "Start",
      values: {},
    },
  },
]

const initialEdges: Edge[] = []

interface WorkflowShellProps {
  workflowId: string
  initialGraph?: WorkflowGraph
}

export function WorkflowShell({ workflowId, initialGraph }: WorkflowShellProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<StepNodeType, Edge>({
      suspense: true,
      nodes: {
        initial:
          initialGraph?.nodes?.length ? initialGraph.nodes : initialNodes,
      },
      edges: {
        initial:
          initialGraph?.edges?.length ? initialGraph.edges : initialEdges,
      },
    })

  // Hydrate an existing default room from the saved database graph. Rooms
  // created before the graph was persisted can contain only Start.
  useEffect(() => {
    if (!initialGraph?.nodes?.length || nodes.length > 1) return

    const savedNodeIds = new Set(initialGraph.nodes.map((node) => node.id))
    const nodeChanges = [
      ...nodes
        .filter((node) => !savedNodeIds.has(node.id))
        .map((node) => ({ type: "remove" as const, id: node.id })),
      ...initialGraph.nodes
        .filter((node) => !nodes.some((current) => current.id === node.id))
        .map((node) => ({ type: "add" as const, item: node })),
    ]
    const edgeChanges = initialGraph.edges
      .filter((edge) => !edges.some((current) => current.id === edge.id))
      .map((edge) => ({ type: "add" as const, item: edge }))

    if (nodeChanges.length) onNodesChange(nodeChanges)
    if (edgeChanges.length) onEdgesChange(edgeChanges)
  }, [edges, initialGraph, nodes, onEdgesChange, onNodesChange])
  const handleConnect: OnConnect = (connection) => {
    onConnect(connection)

    const sourceNode = nodes.find((node) => node.id === connection.source)
    const targetNode = nodes.find((node) => node.id === connection.target)

    if (!sourceNode || !targetNode) {
      return
    }

    const sourceDefinition = nodeRegistry[sourceNode.data.type]
    const targetDefinition = nodeRegistry[targetNode.data.type]
    if (!sourceDefinition || !targetDefinition) {
      return
    }

    const sourceOutputs = sourceDefinition.outputs ?? []
    const targetFields = targetDefinition.fields
    const matchingOutput = sourceOutputs.find((output) =>
      targetFields.some((field) => field.key === output.path)
    )

    if (!matchingOutput) {
      return
    }

    const targetField = targetFields.find(
      (field) => field.key === matchingOutput.path
    )

    if (!targetField) {
      return
    }

    onNodesChange([
      {
        type: "replace",
        id: targetNode.id,
        item: {
          ...targetNode,
          data: {
            ...targetNode.data,
            values: {
              ...targetNode.data.values,
              [targetField.key]: `{{ ${sourceNode.id}.${matchingOutput.path} }}`,
            },
          },
        },
      },
    ])
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="size-full"
      data-workflow-id={workflowId}
    >
      <ResizablePanel minSize="30rem">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize="18rem">
            <Canvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onDelete={onDelete}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="10rem" minSize="8rem">
            <ConsolePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="16rem" minSize="14rem" maxSize="36rem">
        <RightSidebar workflowId={workflowId} onNodesChange={onNodesChange} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
