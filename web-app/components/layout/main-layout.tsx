import type { ReactNode } from "react"

import type { UserSummary } from "@/lib/api"
import { LeftNav } from "@/app/dashboard/left-nav"

interface MainLayoutProps {
  currentUser: UserSummary
  children: ReactNode
}

export function MainLayout({ currentUser, children }: MainLayoutProps) {
  return (
    <div className="min-h-svh bg-[#0A0E1A] text-[#E2E8F0]">
      <div className="flex min-h-svh">
        <LeftNav user={currentUser} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
