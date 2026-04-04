import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ProfileShell } from "@/components/auth/profile-shell"
import { serverApiBaseUrl, sessionCookieName } from "@/lib/config"
import type { UserSummary } from "@/lib/api"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Profile",
}

async function fetchProfileData(): Promise<{
  currentUser: UserSummary
  users: UserSummary[]
}> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(sessionCookieName)?.value

  if (!sessionCookie) {
    redirect("/login")
  }

  const cookieHeader = cookieStore.toString()
  const headers = new Headers()

  if (cookieHeader) {
    headers.set("cookie", cookieHeader)
  }

  const meResponse = await fetch(`${serverApiBaseUrl}/api/auth/me`, {
    headers,
    cache: "no-store",
  })

  if (!meResponse.ok) {
    redirect("/login")
  }

  const currentUser = (await meResponse.json()) as UserSummary
  let users: UserSummary[] = []

  if (currentUser.role === "staff" || currentUser.role === "admin") {
    const usersResponse = await fetch(`${serverApiBaseUrl}/api/users`, {
      headers,
      cache: "no-store",
    })

    if (usersResponse.ok) {
      users = (await usersResponse.json()) as UserSummary[]
    }
  }

  return { currentUser, users }
}

export default async function ProfilePage() {
  const { currentUser, users } = await fetchProfileData()

  return <ProfileShell initialUser={currentUser} initialUsers={users} />
}
