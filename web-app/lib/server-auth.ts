import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { UserSummary } from "@/lib/api"
import { serverApiBaseUrl, sessionCookieName } from "@/lib/config"

function buildCookieHeaders(cookieValue: string) {
  const headers = new Headers()
  headers.set("cookie", `${sessionCookieName}=${cookieValue}`)
  return headers
}

export async function requireCurrentUser(): Promise<UserSummary> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(sessionCookieName)?.value

  if (!sessionCookie) {
    redirect("/login")
  }

  const response = await fetch(`${serverApiBaseUrl}/api/auth/me`, {
    headers: buildCookieHeaders(sessionCookie),
    cache: "no-store",
  })

  if (!response.ok) {
    redirect("/login")
  }

  return (await response.json()) as UserSummary
}
