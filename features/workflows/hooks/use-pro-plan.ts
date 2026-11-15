"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

const PRICING_PATH = "/pricing"
// Clerk uses the plan Key for authorization. The current organization plan's
// key is `sela` even though its display name is `pro`.
const ORG_PRO_PLAN = "org:sela"

export function useProPlan() {
  const { has, isLoaded, orgId } = useAuth()
  const router = useRouter()

  const isPro = Boolean(isLoaded && orgId && has?.({ plan: ORG_PRO_PLAN }))
  const goToPricing = useCallback(() => {
    router.push(PRICING_PATH)
  }, [router])

  return {
    isLoaded,
    isPro,
    goToPricing,
  }
}
