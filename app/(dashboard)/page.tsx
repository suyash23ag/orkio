import { auth } from "@clerk/nextjs/server"
import { Plus, Workflow } from "lucide-react"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createWorkflowAction } from "@/features/workflows/actions"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    redirect("/sign-in")
  }

  const createWorkflow = createWorkflowAction.bind(null, generateSlug())

  return (
    <div className="flex min-h-svh bg-background">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-10 [&_svg]:size-5">
            <Workflow />
          </EmptyMedia>
          <EmptyTitle className="text-base">No workflow selected</EmptyTitle>
          <EmptyDescription className="max-w-xs text-base">
            Select a workflow from the sidebar
            <br/>
            or create a new one to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <form action={createWorkflow}>
            <Button type="submit" size="lg">
              <Plus data-icon="inline-start" />
              New workflow
            </Button>
          </form>
        </EmptyContent>
      </Empty>
    </div>
  )
}
