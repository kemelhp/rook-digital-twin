import type { ReactNode } from "react"

import { MainLayout } from "@/components/layout/main-layout"
import { requireCurrentUser } from "@/lib/server-auth"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const currentUser = await requireCurrentUser()

  return <MainLayout currentUser={currentUser}>{children}</MainLayout>
}
