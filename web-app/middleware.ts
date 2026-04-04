import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { sessionCookieName } from "@/lib/config"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value)

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? "/profile" : "/login", request.url)
    )
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/profile", request.url))
  }

  if (pathname === "/profile" && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/login", "/profile"],
}
