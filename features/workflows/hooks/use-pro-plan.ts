"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

const PRICING_PATH = "/pricing"

export function useProPlan() {
  const { has, isLoaded, orgId } = useAuth()
  const router = useRouter()

  const isPro = Boolean(isLoaded && orgId && has?.({ plan: "pro" }))
  const goToPricing = useCallback(() => {
    router.push(PRICING_PATH)
  }, [router])

  return {
    isLoaded,
    isPro,
    goToPricing,
  }
}
