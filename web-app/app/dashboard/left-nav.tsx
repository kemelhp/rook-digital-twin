"use client"

import { useState } from "react"

import {
  ChartLineData01Icon,
  DashboardSquare01Icon,
  FlashIcon,
  Settings02Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"

export function LeftNav() {
  const [activeSection, setActiveSection] = useState("dashboard")

  const primaryItems = [
    { id: "dashboard", icon: DashboardSquare01Icon, label: "Dashboard" },
    { id: "targets", icon: Target01Icon, label: "Targets" },
    { id: "analytics", icon: ChartLineData01Icon, label: "Analytics" },
    { id: "power", icon: FlashIcon, label: "Power" },
  ] as const

  return (
    <div className="w-16 h-225 flex flex-col items-center shrink-0 py-5 gap-2 bg-[#0D1220] border-r border-r-solid border-r-[#1E2640]">
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
      {primaryItems.map((item) => {
        const isActive = activeSection === item.id
        return (
          <Button
            key={item.id}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={item.label}
            aria-pressed={isActive}
            onClick={() => setActiveSection(item.id)}
            className={`size-11 rounded-[10px] border border-transparent bg-transparent hover:bg-[#141929] ${isActive ? "bg-[#1E2D50] border-[#2D4A80]" : ""}`}
          >
            <HugeiconsIcon
              icon={item.icon}
              strokeWidth={2}
              className={`size-5 ${isActive ? "text-[#3B82F6]" : "text-[#4A5568]"}`}
            />
          </Button>
        )
      })}
      <div className="grow shrink basis-[0%]" />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Settings"
        onClick={() => setActiveSection("settings")}
        className={`mb-2 size-11 rounded-[10px] border border-transparent bg-transparent hover:bg-[#141929] ${activeSection === "settings" ? "bg-[#1E2D50] border-[#2D4A80]" : ""}`}
      >
        <HugeiconsIcon
          icon={Settings02Icon}
          strokeWidth={2}
          className={`size-5 ${activeSection === "settings" ? "text-[#3B82F6]" : "text-[#4A5568]"}`}
        />
      </Button>
    </div>
  )
}
