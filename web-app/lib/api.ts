import { apiBaseUrl } from "@/lib/config"

export type UserRole = "viewer" | "staff" | "admin"

export interface UserSummary {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: number
  last_login_at: number | null
}

export interface SessionResponse {
  user: UserSummary
  expires_at: number
}

export interface MessageResponse {
  detail: string
}

export interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  role: UserRole
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string }
    return data.detail ?? `Request failed with status ${response.status}.`
  } catch {
    return `Request failed with status ${response.status}.`
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function login(email: string, password: string) {
  return apiRequest<SessionResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return apiRequest<MessageResponse>("/api/auth/logout", {
    method: "POST",
  })
}

export function fetchCurrentUser() {
  return apiRequest<UserSummary>("/api/auth/me")
}

export function fetchUsers() {
  return apiRequest<UserSummary[]>("/api/users")
}

export function createUser(payload: CreateUserRequest) {
  return apiRequest<UserSummary>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
