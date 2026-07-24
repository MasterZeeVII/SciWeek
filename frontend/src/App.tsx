import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { HomePage } from "@/pages/home-page"
import { TournamentPage } from "@/pages/tournament-page"
import { TournamentProvider } from "@/lib/tournament-context"
import { AdminApp } from "@/admin/admin-app"
import { AdminDashboard } from "@/admin/pages/admin-dashboard"
import { AdminTournaments } from "@/admin/pages/admin-tournaments"
import { AdminTournamentManage } from "@/admin/pages/admin-tournament-manage"
import { AdminParticipants } from "@/admin/pages/admin-participants"
import { AdminMatches } from "@/admin/pages/admin-matches"
import { AdminScan } from "@/admin/pages/admin-scan"
import { AdminBracket } from "@/admin/pages/admin-bracket"
import { AdminUsers } from "@/admin/pages/admin-users"

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
      <Routes>
        {/* Public site — no login required */}
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />

        {/* Staff control panel — the only place that asks for a login */}
        <Route
          path="/admin"
          element={
            <TournamentProvider>
              <AdminApp />
            </TournamentProvider>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="tournaments/:id" element={<AdminTournamentManage />} />
          <Route path="participants" element={<AdminParticipants />} />
          <Route path="matches" element={<AdminMatches />} />
          <Route path="scan" element={<AdminScan />} />
          <Route path="bracket" element={<AdminBracket />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
