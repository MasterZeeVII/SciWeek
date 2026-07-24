// Client for the ADMIN-only staff account endpoints.

import { request } from "@/lib/api"
import type { CurrentUser } from "@/lib/tournament-types"

export interface AdminUser {
  id: number
  username: string
  role: CurrentUser["role"]
  isActive: boolean
  createdAt: string
}

interface UsersResponse {
  users: AdminUser[]
}

export const usersApi = {
  list() {
    return request<UsersResponse>("/api/users/").then((data) => data.users)
  },
  create(data: { username: string; password: string; role: AdminUser["role"] }) {
    return request<UsersResponse>("/api/users/", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((res) => res.users)
  },
  update(id: number, data: { role?: AdminUser["role"]; isActive?: boolean; password?: string }) {
    return request<UsersResponse>(`/api/users/${id}/`, {
      method: "POST",
      body: JSON.stringify(data),
    }).then((res) => res.users)
  },
  remove(id: number) {
    return request<UsersResponse>(`/api/users/${id}/`, { method: "DELETE" }).then(
      (res) => res.users,
    )
  },
}
