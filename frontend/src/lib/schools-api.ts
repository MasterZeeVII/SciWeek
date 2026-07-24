// Client for the ADMIN-only school directory (used by the team form's picker).

import { request } from "@/lib/api"

export interface SchoolOption {
  id: number
  name: string
}

export const schoolsApi = {
  list() {
    return request<{ schools: SchoolOption[] }>("/api/schools/").then((res) => res.schools)
  },
}
