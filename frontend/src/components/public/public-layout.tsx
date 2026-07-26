import { Outlet } from "react-router-dom"

import { BroadcastListener } from "./broadcast-listener"

// Wraps every public (no-login) route so BroadcastListener stays mounted
// across navigation between them — it needs to survive route changes to
// keep its "already seen" baseline and not replay on every click.
export function PublicLayout() {
  return (
    <>
      <Outlet />
      <BroadcastListener />
    </>
  )
}
