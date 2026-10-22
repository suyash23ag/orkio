import * as Sentry from "@sentry/node"
import { tasks } from "@trigger.dev/sdk"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
})

tasks.onFailure(({ ctx, error, payload }) => {
  Sentry.captureException(error, {
    extra: {
      payload,
      runId: ctx.run.id,
      taskId: ctx.task.id,
    },
    tags: {
      trigger_task: ctx.task.id,
      trigger_run: ctx.run.id,
    },
  })
})
