import type { ReactNode } from "react"

import type { UserSummary } from "@/lib/api"
import { LeftNav } from "@/app/dashboard/left-nav"

interface MainLayoutProps {
  currentUser: UserSummary
  children: ReactNode
}

export function MainLayout({ currentUser, children }: MainLayoutProps) {
  return (
    <div className="min-h-svh bg-background">
      <div className="flex min-h-svh">
        <LeftNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
