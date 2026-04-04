"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import type { UserSummary } from "@/lib/api"

interface LeftNavProps {
  user: UserSummary
}

interface NavItem {
  id: string
  href: string
  icon: typeof DashboardSquare01Icon
  label: string
}

function NavButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className="group relative"
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className={`size-11 rounded-[10px] border border-transparent bg-transparent hover:bg-[#141929] ${isActive ? "bg-[#1E2D50] border-[#2D4A80]" : ""}`}
      >
        <HugeiconsIcon
          icon={item.icon}
          strokeWidth={2}
          className={`size-5 ${isActive ? "text-[#3B82F6]" : "text-[#4A5568]"}`}
        />
      </Button>
      <span className="pointer-events-none absolute top-1/2 left-14 -translate-y-1/2 rounded-md border border-[#1E2640] bg-[#0D1220] px-2 py-1 text-[10px] text-[#94A3B8] opacity-0 transition-opacity group-hover:opacity-100">
        {item.label}
      </span>
    </Link>
  )
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export function LeftNav({ user }: LeftNavProps) {
  const pathname = usePathname()

  const mainItems: NavItem[] = [
    { id: "dashboard", icon: DashboardSquare01Icon, label: "Dashboard" },
  ].map((item) => ({ ...item, href: `/${item.id}` }))

  const profileInitials = getInitials(user.full_name)

  return (
    <div className="sticky top-0 flex h-svh w-16 shrink-0 flex-col items-center gap-2 overflow-hidden border-r border-r-solid border-r-[#1E2640] bg-[#0D1220] py-5">
      <div
        className="flex items-center justify-center mb-5 rounded-[10px] shrink-0 size-9"
        style={{
          backgroundImage:
            "linear-gradient(in oklab 135deg, oklab(62.3% -0.033 -0.185) 0%, oklab(58.5% 0.025 -0.202) 100%)",
        }}
      >
        <div className="flex text-white font-['Inter',system-ui,sans-serif] font-extrabold shrink-0 text-[15px]/4.5">
          R
        </div>
      </div>
      {mainItems.map((item) => (
        <NavButton key={item.id} item={item} isActive={pathname === item.href} />
      ))}
      <div className="grow shrink basis-[0%]" />
      <Link href="/profile" aria-label="Profile" className="group relative mb-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className={`size-11 rounded-[10px] border ${pathname === "/profile" ? "border-[#2D4A80] bg-[#1E2D50]" : "border-transparent bg-transparent hover:bg-[#141929]"}`}
        >
          <div className="flex size-7 items-center justify-center rounded-full border border-[#2D4A80] bg-[#141D33] text-[10px] font-semibold text-[#60A5FA]">
            {profileInitials}
          </div>
        </Button>
        <span className="pointer-events-none absolute top-1/2 left-14 -translate-y-1/2 rounded-md border border-[#1E2640] bg-[#0D1220] px-2 py-1 text-[10px] text-[#94A3B8] opacity-0 transition-opacity group-hover:opacity-100">
          Profile
        </span>
      </Link>
    </div>
  )
}
