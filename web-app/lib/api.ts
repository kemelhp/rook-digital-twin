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

export interface GroupScore {
  group: string
  score: number
  weight: number
}

export interface HealthFactor {
  param_id: string
  label: string
  value: number
  unit: string
  normalized: number
  weight: number
  contribution: number
  group: string
  status: string
}

export interface HealthIndex {
  loco_id: string
  loco_type: string
  timestamp: number
  index: number
  grade: "A" | "B" | "C" | "D" | "E"
  group_scores: GroupScore[]
  top_factors: HealthFactor[]
  alert_penalty: number
}

export interface AlertItem {
  alert_id: string
  loco_id: string
  loco_type: string
  param_id: string
  label: string
  severity: "info" | "warning" | "critical"
  status: "active" | "resolved"
  value: number
  threshold: number
  unit: string
  message: string
  recommendation: string
  penalty: number
  triggered_at: number
  resolved_at: number | null
}

export interface TelemetryFrame {
  loco_type: "KZ8A" | "TE33A"
  loco_id: string
  timestamp: number
  scenario: string
  traction: {
    speed: number
    tractive_effort: number
    traction_motor_current: number[]
    controller_position: number
    brake_pipe_pressure: number
    brake_cylinder_pressure: number
    brake_force: number
  }
  resources: {
    fuel_level?: number
    fuel_consumption?: number
    coolant_temperature?: number
    engine_rpm?: number
    catenary_voltage?: number
    traction_power?: number
    battery_voltage?: number
  }
  nodes: {
    motor_temperatures: number[]
    axle_bearing_temps: number[]
    error_codes: string[]
    active_alerts: string[]
  }
  navigation: {
    latitude: number
    longitude: number
    odometer: number
    route_section: string
    speed_limit: number
    signal_status: "green" | "yellow" | "red"
    connection_status: "connected" | "disconnected"
  }
}

export interface TelemetryWsPayload {
  telemetry: TelemetryFrame
  health: HealthIndex
  alerts: {
    loco_id: string
    total: number
    critical: number
    warning: number
    info: number
    alerts: AlertItem[]
  }
}

export interface LocomotiveProfile {
  id: "KZ8A" | "TE33A"
  name: string
  manufacturer: string
  type: string
  max_speed_kmh: number
  power_kw: number
  axes: number
  traction: string
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

export function fetchLocomotiveProfiles() {
  return apiRequest<LocomotiveProfile[]>("/api/locomotive/profiles")
}

export function fetchCurrentHealth(locoId: string) {
  return apiRequest<HealthIndex>(`/api/health?loco_id=${encodeURIComponent(locoId)}`)
}

export function fetchActiveAlerts(locoId: string) {
  return apiRequest<AlertItem[]>(`/api/alerts?loco_id=${encodeURIComponent(locoId)}`)
}

export function fetchTelemetryReplay(locoId: string, minutes: number) {
  return apiRequest<TelemetryFrame[]>(
    `/api/telemetry/replay?loco_id=${encodeURIComponent(locoId)}&minutes=${minutes}`
  )
}
