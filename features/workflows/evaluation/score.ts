import type { EvaluationConfiguration, EvaluationRun, TaskFamily } from "./protocol"

export type ObservedEvaluationRun = EvaluationRun & {
  finalStateCorrect: boolean
  autonomous: boolean
  humanIntervention: boolean
  recoveryAttempts: number
  latencyMs: number
  costUsd?: number
  extractionFieldsCorrect?: number
  extractionFieldsTotal?: number
}

export function scoreEvaluation(runs: ObservedEvaluationRun[]) {
  const configurations = ["B0", "B1", "B2"] as EvaluationConfiguration[]
  return configurations.map((configuration) => {
    const selected = runs.filter((run) => run.configuration === configuration)
    const executable = selected.filter((run) => run.executable)
    const successful = executable.filter((run) => run.finalStateCorrect)
    const recoverable = executable.filter((run) => run.perturbation === "recoverable-failure")
    const recovered = recoverable.filter((run) => run.finalStateCorrect)
    const extractionRuns = executable.filter((run) => run.extractionFieldsTotal && run.extractionFieldsTotal > 0)
    const extractionTotal = extractionRuns.reduce((sum, run) => sum + (run.extractionFieldsTotal ?? 0), 0)
    const extractionCorrect = extractionRuns.reduce((sum, run) => sum + (run.extractionFieldsCorrect ?? 0), 0)
    const orderedLatencies = executable.map((run) => run.latencyMs).sort((a, b) => a - b)

    return {
      configuration,
      runs: selected.length,
      endToEndSuccessRate: rate(successful.length, executable.length),
      autonomousSuccessRate: rate(executable.filter((run) => run.finalStateCorrect && run.autonomous).length, executable.length),
      humanInterventionRate: rate(executable.filter((run) => run.humanIntervention).length, executable.length),
      recoveryRate: rate(recovered.length, recoverable.length),
      extractionAccuracy: rate(extractionCorrect, extractionTotal),
      medianLatencyMs: percentile(orderedLatencies, 0.5),
      p95LatencyMs: percentile(orderedLatencies, 0.95),
      costPerSuccessfulCompletion: successful.length
        ? executable.reduce((sum, run) => sum + (run.costUsd ?? 0), 0) / successful.length
        : null,
      byFamily: scoreByFamily(executable),
    }
  })
}

function scoreByFamily(runs: ObservedEvaluationRun[]) {
  return (['navigation', 'extraction', 'extraction-to-email'] as TaskFamily[]).map((family) => {
    const selected = runs.filter((run) => run.family === family)
    return { family, successRate: rate(selected.filter((run) => run.finalStateCorrect).length, selected.length), runs: selected.length }
  })
}

function rate(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : null
}

function percentile(values: number[], position: number) {
  if (!values.length) return null
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * position))]
}
