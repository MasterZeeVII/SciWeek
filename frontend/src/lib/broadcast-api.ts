// Client for the admin broadcast console (ADMIN/MONITOR) — pushes a
// /notify command that the public tournament page picks up on its next poll.

import { request } from "@/lib/api"
import type { AdminBroadcastRecord } from "@/lib/public-api"

export const broadcastApi = {
  latest() {
    return request<{ broadcast: AdminBroadcastRecord | null }>("/api/broadcast/").then(
      (data) => data.broadcast,
    )
  },
  push(command: string) {
    return request<{ broadcast: AdminBroadcastRecord }>("/api/broadcast/", {
      method: "POST",
      body: JSON.stringify({ command }),
    }).then((data) => data.broadcast)
  },
  clear() {
    return request<{ broadcast: null }>("/api/broadcast/", { method: "DELETE" }).then(
      () => undefined,
    )
  },
}
