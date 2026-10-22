"use client"

import { useProPlan } from "./use-pro-plan"

export function useProGate() {
  const { goToPricing, isLoaded, isPro } = useProPlan()

  return {
    canUsePro: isLoaded && isPro,
    goToPricing,
    isLoaded,
    isPro,
  }
}
