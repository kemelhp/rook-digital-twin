"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  DashboardSquare01Icon,
  Moon01Icon,
  Sun03Icon,
  Train,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"

interface NavItem {
  id: string
  href: string
  icon: typeof DashboardSquare01Icon
}

function NavButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className="group relative"
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={`${isActive ? "border-primary" : "border-transparent"}`}
      >
        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
      </Button>
    </Link>
  )
}

export function LeftNav() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  const mainItems: NavItem[] = [
    { id: "dashboard", icon: DashboardSquare01Icon },
  ].map((item) => ({ ...item, href: `/${item.id}` }))

  return (
    <div className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 overflow-hidden border-r border-border py-4">
      <div className="flex items-center justify-center mb-4 rounded shrink-0 size-8">
        <HugeiconsIcon icon={Train} strokeWidth={2} />
      </div>
      {mainItems.map((item) => (
        <NavButton key={item.id} item={item} isActive={pathname === item.href} />
      ))}
      <div className="grow shrink basis-0" />
      <div className="group relative mb-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }}
        >
          <HugeiconsIcon icon={resolvedTheme === "dark" ? Moon01Icon : Sun03Icon} strokeWidth={2} />
        </Button>
      </div>
      <Link href="/profile" className="group relative mb-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`${pathname === "/profile" ? "border-primary" : "border-transparent"}`}
        >
          <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
        </Button>
      </Link>
    </div>
  )
}
