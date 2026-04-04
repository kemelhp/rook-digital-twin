export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000"

export const serverApiBaseUrl =
  process.env.API_SERVER_URL?.replace(/\/$/, "") ?? apiBaseUrl

export const sessionCookieName =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? "rook_session"
