"use client";

import { ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { Spinner } from "@/components/ui/spinner";

export function Room({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint="/api/liveblocks/auth"
      resolveUsers={async ({ userIds }) => {
        try {
          const response = await fetch("/api/livebbloacks/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userids: userIds }),
          });

          if (!response.ok) {
            Sentry.logger.warn("Liveblocks user resolution failed", {
              status: response.status,
            });
            return undefined;
          }

          return await response.json();
        } catch (error) {
          Sentry.captureException(error);
          Sentry.logger.error("Liveblocks user resolution request failed");
          return undefined;
        }
      }}
    >
      <RoomProvider id={roomId}>
        <ClientSideSuspense fallback={<div className="flex min-h-svh items-center justify-center">
          <Spinner className="size-6 text-muted-foreground"/>
        </div>
      }
      >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
