import { Browserbase } from "@browserbasehq/sdk"
import { auth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"

export const dynamic = "force-dynamic"

function getErrorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status
  }

  return 500
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Replay request failed"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { has, isAuthenticated, orgId } = await auth()

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!orgId) {
    return Response.json({ error: "Organization required" }, { status: 403 })
  }

  if (!has({ plan: "org:sela" })) {
    return Response.json({ error: "Pro plan required" }, { status: 403 })
  }

  const { sessionId } = await params
  Sentry.logger.info("Replay request started", { sessionId })
  const apiKey = process.env.BROWSERBASE_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "BROWSERBASE_API_KEY is not configured" },
      { status: 500 }
    )
  }

  try {
    const browserbase = new Browserbase({ apiKey })
    const replay = await browserbase.sessions.replays.retrieve(sessionId)
    const firstPage = replay.pages[0]

    if (!firstPage) {
      Sentry.logger.info("Replay is not ready", { sessionId })
      return Response.json({ error: "Replay is not ready" }, { status: 202 })
    }

    const playlist = await browserbase.sessions.replays.retrievePage(
      sessionId,
      firstPage.pageId
    )

    return new Response(await playlist.text(), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/vnd.apple.mpegurl",
      },
    })
    Sentry.logger.info("Replay playlist returned", { sessionId })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "replay" }, extra: { sessionId } })
    Sentry.logger.error("Replay request failed", { sessionId })
    return Response.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    )
  }
}
