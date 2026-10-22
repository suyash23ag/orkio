"use client"

import Hls from "hls.js"
import { useEffect, useRef, useState } from "react"

const POLL_INTERVAL_MS = 2_000

type ReplayStatus = "loading" | "playing" | "unsupported" | "error"

export function SessionReplay({ sessionId }: { sessionId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<ReplayStatus>("loading")

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const source = `/api/replays/${encodeURIComponent(sessionId)}`
    let hls: Hls | undefined
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const play = () => {
      if (cancelled) return

      if (Hls.isSupported()) {
        hls = new Hls()
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !cancelled) setStatus("error")
        })
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return
          setStatus("playing")
          void video.play().catch(() => undefined)
        })
        hls.loadSource(source)
        hls.attachMedia(video)
        return
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source
        video.addEventListener(
          "loadedmetadata",
          () => {
            if (cancelled) return
            setStatus("playing")
            void video.play().catch(() => undefined)
          },
          { once: true }
        )
        return
      }

      setStatus("unsupported")
    }

    const poll = async () => {
      try {
        const response = await fetch(source, { cache: "no-store" })
        if (response.ok) {
          play()
          return
        }

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) setStatus("error")
          return
        }
      } catch {
        // Keep polling while the recording endpoint is becoming available.
      }

      if (!cancelled) {
        pollTimer = setTimeout(() => void poll(), POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      hls?.destroy()
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [sessionId])

  return (
    <div className="relative flex size-full items-center justify-center overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="size-full object-contain"
        controls
        muted
        playsInline
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Preparing replay…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Replay unavailable
        </div>
      )}
      {status === "unsupported" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          This browser cannot play HLS video
        </div>
      )}
    </div>
  )
}
