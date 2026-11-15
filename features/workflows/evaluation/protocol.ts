export type EvaluationConfiguration = "B0" | "B1" | "B2"
export type TaskFamily = "navigation" | "extraction" | "extraction-to-email"
export type Perturbation = "normal" | "changed-layout" | "missing-information" | "recoverable-failure"

export type EvaluationTask = {
  id: string
  family: TaskFamily
  perturbation: Perturbation
  executable: boolean
  expectedOutcome: "complete" | "stop-or-clarify"
}

export type EvaluationRun = EvaluationTask & {
  configuration: EvaluationConfiguration
  repetition: number
}

export function createEvaluationPlan({
  totalBaseTasks = 60,
  developmentBaseTasks = 12,
  repetitions = 3,
}: {
  totalBaseTasks?: number
  developmentBaseTasks?: number
  repetitions?: number
} = {}) {
  if (developmentBaseTasks >= totalBaseTasks) throw new Error("Development tasks must be smaller than total tasks")

  const familySizes: Record<TaskFamily, number> = {
    navigation: Math.floor(totalBaseTasks / 3),
    extraction: Math.floor(totalBaseTasks / 3),
    "extraction-to-email": totalBaseTasks - Math.floor(totalBaseTasks / 3) * 2,
  }
  const tasks: EvaluationTask[] = []
  let sequence = 0

  for (const [family, count] of Object.entries(familySizes) as [TaskFamily, number][]) {
    for (let index = 0; index < count; index++) {
      sequence += 1
      const id = `task-${String(sequence).padStart(3, "0")}`
      tasks.push({ id, family, perturbation: "normal", executable: true, expectedOutcome: "complete" })
      tasks.push({ id: `${id}-changed`, family, perturbation: "changed-layout", executable: true, expectedOutcome: "complete" })
    }
  }

  const heldOut = tasks.filter((task) => Number(task.id.match(/\d+/)?.[0] ?? 0) > developmentBaseTasks)
  const runs = (['B0', 'B1', 'B2'] as EvaluationConfiguration[]).flatMap((configuration) =>
    heldOut.flatMap((task) => Array.from({ length: repetitions }, (_, index) => ({
      ...task,
      configuration,
      repetition: index + 1,
    })))
  )

  return {
    totalBaseTasks,
    developmentBaseTasks,
    heldOutBaseTasks: totalBaseTasks - developmentBaseTasks,
    instancesPerConfiguration: heldOut.length * repetitions,
    totalRuns: runs.length,
    tasks,
    runs,
  }
}
