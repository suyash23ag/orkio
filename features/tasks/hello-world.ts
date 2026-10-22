import { schemaTask, wait } from "@trigger.dev/sdk"
import { z } from "zod"

/**
 * Small Trigger.dev task for testing the local worker.
 * Trigger it from the Trigger.dev dashboard with: { "name": "Suyash" }
 */
export const helloWorldTask = schemaTask({
  id: "hello-world",
  schema: z.object({
    name: z.string().min(1),
  }),
  run: async ({ name }) => {
    await wait.for({ seconds: 2 })

    return {
      message: `Hello, ${name}! Your Trigger.dev workflow ran successfully.`,
      completedAt: new Date().toISOString(),
    }
  },
})
