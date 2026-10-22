import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function PricingPage() {
  const { orgId } = await auth()

  if (!orgId) {
    redirect("/choose-organization")
  }

  return (
    <main className="min-h-svh overflow-y-auto bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the plan that fits your organization.
          </p>
        </div>
        <PricingTable for="organization" newSubscriptionRedirectUrl="/" />
      </div>
    </main>
  )
}
