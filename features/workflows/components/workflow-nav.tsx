"use client"

import { Check, Pencil, Plus, Workflow as WorkflowIcon, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import type { Workflow } from "@/lib/db/schema"

interface WorkflowNavProps {
  workflows: Workflow[]
  onCreateWorkflow: (name: string) => Promise<void>
  onRenameWorkflow: (workflowId: string, name: string) => Promise<void>
}

function WorkflowItem({ workflow, active, onRenameWorkflow }: { workflow: Workflow; active: boolean; onRenameWorkflow: WorkflowNavProps["onRenameWorkflow"] }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(workflow.name)
  const [isPending, startTransition] = useTransition()

  function saveName() {
    const nextName = name.trim()
    if (!nextName || nextName === workflow.name) {
      setName(workflow.name)
      setEditing(false)
      return
    }
    startTransition(async () => {
      await onRenameWorkflow(workflow.id, nextName)
      setEditing(false)
    })
  }

  if (editing) {
    return <div className="flex items-center gap-1 px-1">
      <input aria-label={`Rename ${workflow.name}`} autoFocus className="h-7 min-w-0 flex-1 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring" disabled={isPending} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveName(); if (event.key === "Escape") { setName(workflow.name); setEditing(false) } }} />
      <button aria-label="Save workflow name" className="rounded p-1 hover:bg-sidebar-accent" disabled={isPending} onClick={saveName} type="button"><Check className="size-3.5" /></button>
      <button aria-label="Cancel rename" className="rounded p-1 hover:bg-sidebar-accent" disabled={isPending} onClick={() => { setName(workflow.name); setEditing(false) }} type="button"><X className="size-3.5" /></button>
    </div>
  }

  return <div className="group relative flex items-center">
    <SidebarMenuButton asChild isActive={active} size="sm" className="h-7 min-w-0 flex-1 px-2 pr-7 text-xs"><Link href={`/workflows/${workflow.id}`}><span className="truncate">{workflow.name}</span></Link></SidebarMenuButton>
    <button aria-label={`Rename ${workflow.name}`} className="absolute right-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100" onClick={() => setEditing(true)} type="button"><Pencil className="size-3" /></button>
  </div>
}

export function WorkflowNav({ workflows, onCreateWorkflow, onRenameWorkflow }: WorkflowNavProps) {
  const { state } = useSidebar()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const handleCreateWorkflow = () => startTransition(async () => { await onCreateWorkflow(generateSlug()) })
  const items = workflows.map((workflow) => <SidebarMenuItem key={workflow.id}><WorkflowItem workflow={workflow} active={pathname === `/workflows/${workflow.id}`} onRenameWorkflow={onRenameWorkflow} /></SidebarMenuItem>)

  if (state === "collapsed") return <SidebarGroup><SidebarMenu><SidebarMenuItem><Popover><PopoverTrigger asChild><SidebarMenuButton><WorkflowIcon /><span>Workflows</span></SidebarMenuButton></PopoverTrigger><PopoverContent side="right" align="start"><SidebarMenu><SidebarMenuItem><SidebarMenuButton disabled={isPending} onClick={handleCreateWorkflow}><Plus /><span>New workflow</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu><SidebarSeparator /><SidebarMenu>{items}</SidebarMenu></PopoverContent></Popover></SidebarMenuItem></SidebarMenu></SidebarGroup>

  return <SidebarGroup className="pt-2"><SidebarGroupLabel className="h-7 px-2 text-[11px]">Workflows</SidebarGroupLabel><SidebarGroupAction aria-label="Create workflow" title="Create workflow" disabled={isPending} onClick={handleCreateWorkflow}><Plus /></SidebarGroupAction><SidebarGroupContent><SidebarMenu>{items}</SidebarMenu></SidebarGroupContent></SidebarGroup>
}
