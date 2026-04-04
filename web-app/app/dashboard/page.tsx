"use client"

import { useState } from "react"

import {
  ArrowDown01Icon,
  ChartLineData01Icon,
  CircleIcon,
  DashboardSquare01Icon,
  FlashIcon,
  FuelStationIcon,
  InformationCircleIcon,
  PipelineIcon,
  RotateClockwiseIcon,
  Settings02Icon,
  Target01Icon,
  TemperatureIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { SpeedTrendChart, type TrendMetric, type TrendWindow } from "./speed-trend-chart"

export default function DashboardPage() {
  const [activeTrendTab, setActiveTrendTab] = useState<TrendMetric>("speed")
  const [activeWindowTab, setActiveWindowTab] = useState<TrendWindow>(5)

  const trendTabs: { key: TrendMetric; label: string }[] = [
    { key: "speed", label: "Скорость" },
    { key: "motor_temp", label: "Температуры ТЭД" },
    { key: "fuel", label: "Топливо" },
    { key: "motor_current", label: "Ток ТЭД" },
  ]

  const windowTabs: TrendWindow[] = [1, 5, 15]

   return (
     <div className="[font-synthesis:none] flex overflow-clip bg-[#0A0E1A] antialiased text-xs/4">
       <div className="flex w-360 h-225 overflow-clip bg-[#0A0E1A] shrink-0">
         <div className="w-16 h-225 flex flex-col items-center shrink-0 py-5 gap-2 bg-[#0D1220] border-r border-r-solid border-r-[#1E2640]">
           <div className="flex items-center justify-center mb-5 rounded-[10px] shrink-0 size-9" style={{ backgroundImage: 'linear-gradient(in oklab 135deg, oklab(62.3% -0.033 -0.185) 0%, oklab(58.5% 0.025 -0.202) 100%)' }}>
             <div className="flex text-white font-['Inter',system-ui,sans-serif] font-extrabold shrink-0 text-[15px]/4.5">
               R
             </div>
           </div>
           <div className="flex items-center justify-center rounded-[10px] bg-[#1E2D50] shrink-0 size-11">
             <HugeiconsIcon
               icon={DashboardSquare01Icon}
               strokeWidth={2}
               className="size-5 text-[#3B82F6]"
             />
           </div>
           <div className="flex items-center justify-center rounded-[10px] shrink-0 size-11">
             <HugeiconsIcon
               icon={Target01Icon}
               strokeWidth={2}
               className="size-5 text-[#4A5568]"
             />
           </div>
           <div className="flex items-center justify-center rounded-[10px] shrink-0 size-11">
             <HugeiconsIcon
               icon={ChartLineData01Icon}
               strokeWidth={2}
               className="size-5 text-[#4A5568]"
             />
           </div>
           <div className="flex items-center justify-center rounded-[10px] shrink-0 size-11">
             <HugeiconsIcon
               icon={FlashIcon}
               strokeWidth={2}
               className="size-5 text-[#4A5568]"
             />
           </div>
           <div className="grow shrink basis-[0%]" />
           <div className="flex items-center justify-center mb-2 rounded-[10px] shrink-0 size-11">
             <HugeiconsIcon
               icon={Settings02Icon}
               strokeWidth={2}
               className="size-5 text-[#4A5568]"
             />
           </div>
         </div>
         <div className="grow shrink basis-[0%] flex flex-col h-225 min-w-0 overflow-clip">
           <div className="h-14 flex items-center shrink-0 px-5 gap-3.5 bg-[#0D1220] border-b border-b-solid border-b-[#1E2640]">
             <div className="flex items-center rounded-lg py-1.5 px-3 gap-2.5 bg-[#141929] border border-solid border-[#1E2640]">
               <div className="rounded-[50%] bg-[#22C55E] [box-shadow:#22C55E_0px_0px_6px] shrink-0 size-2" />
               <div className="flex flex-col gap-px">
                 <div className="text-[#E2E8F0] font-sans text-[13px]/4">
                   ТЭ33А-001
                 </div>
                 <div className="text-[#64748B] font-['JetBrainsMono-Regular','JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                   TE33A-A1B2C3
                 </div>
               </div>
               <HugeiconsIcon
                 icon={ArrowDown01Icon}
                 strokeWidth={2}
                 className="size-3 shrink-0 text-[#64748B]"
               />
             </div>
             <div className="rounded-sm py-0.75 px-2.25 bg-[#1E2D50] border border-solid border-[#2D4A80]">
               <div className="text-[#60A5FA] font-sans text-[11px]/3.5">
                 ТЭ33А Тепловоз
               </div>
             </div>
             <div className="grow shrink basis-[0%] min-w-0" />
             <div className="text-[#94A3B8] font-sans shrink-0 text-[10px]/3">
               Сценарий:
             </div>
             <div className="rounded-[20px] py-1 px-2.5 bg-[#1E2D50] border border-solid border-[#3B82F6]">
               <div className="flex items-center gap-1 text-[#60A5FA] font-sans text-[11px]/3.5">
                 <HugeiconsIcon
                   icon={CircleIcon}
                   strokeWidth={2}
                   className="size-2 shrink-0 text-[#60A5FA]"
                 />
                 normal
               </div>
             </div>
             <div className="rounded-[20px] py-1 px-2.5 bg-[#141929] border border-solid border-[#1E2640]">
               <div className="text-[#64748B] font-sans text-[11px]/3.5">
                 acceleration
               </div>
             </div>
             <div className="rounded-[20px] py-1 px-2.5 bg-[#141929] border border-solid border-[#1E2640]">
               <div className="text-[#64748B] font-sans text-[11px]/3.5">
                 overheat
               </div>
             </div>
             <div className="rounded-[20px] py-1 px-2.5 bg-[#141929] border border-solid border-[#1E2640]">
               <div className="text-[#64748B] font-sans text-[11px]/3.5">
                 emergency
               </div>
             </div>
             <div className="w-px h-5 bg-[#1E2640] shrink-0" />
             <div className="flex items-center rounded-md py-1 px-2.5 gap-1.5 bg-[#0D1F14] border border-solid border-[#166534]">
               <div className="rounded-[50%] bg-[#22C55E] shrink-0 size-1.5" />
               <div className="inline-block text-[#22C55E] font-sans shrink-0 text-[11px]/3.5">
                 CONNECTED · 1Hz
               </div>
             </div>
             <div className="text-[#64748B] font-['JetBrainsMono-Regular','JetBrains_Mono',system-ui,sans-serif] shrink-0 text-xs/4">
               14:32:07
             </div>
           </div>
           <div className="grow shrink basis-[0%] flex min-h-0 h-211">
             <div className="w-65 flex flex-col shrink-0 bg-[#0A0E1A] border-r border-r-solid border-r-[#1E2640]">
               <div className="bg-origin-border border-b border-b-solid border-b-[#1E2640] p-5" style={{ backgroundImage: 'linear-gradient(in oklab 160deg, oklab(24.2% -0.011 -0.060) 0%, oklab(16.6% -.0003 -0.026) 100%)' }}>
                 <div className="tracking-[0.12em] uppercase mb-3.5 text-[#64748B] font-sans text-[10px]/3">
                   Индекс здоровья
                 </div>
                 <div className="flex items-center gap-4">
                   <svg width="84" height="84" viewBox="0 0 84 84" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: '0' }}>
                     <circle cx="42" cy="42" r="34" fill="none" stroke="#1E2640" strokeWidth="8" />
                     <circle cx="42" cy="42" r="34" fill="none" stroke="#22C55E" strokeWidth="8" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset="27.8" transform="rotate(-90 42 42)" />
                     <text x="42" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#22C55E" fontFamily="JetBrains Mono,monospace">
                       87
                     </text>
                   </svg>
                   <div className="flex flex-col gap-1.5">
                     <div className="text-[28px] leading-[round(up,100%,1px)] text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold">
                       87.3
                     </div>
                     <div className="w-fit rounded-[5px] py-0.75 px-2.5 bg-[#0D2A1A] border border-solid border-[#166534]">
                       <div className="text-[#22C55E] font-sans text-xs/4">
                         НОРМА — A
                       </div>
                     </div>
                     <div className="text-[#64748B] font-sans text-[11px]/3.5">
                       Все системы штатно
                     </div>
                   </div>
                 </div>
                 <div className="mt-4 flex flex-col gap-1.75">
                   <div className="flex items-center gap-2">
                     <div className="w-22 shrink-0 text-[#94A3B8] font-sans text-[10px]/3">
                       Тяга
                     </div>
                     <div className="grow shrink basis-[0%] h-1 rounded-xs overflow-clip bg-[#1E2640]">
                       <div className="w-[round(95%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                     <div className="w-6.5 text-right text-[#64748B] font-['JetBrainsMono-Regular','JetBrains_Mono',system-ui,sans-serif] shrink-0 text-[10px]/3">
                       95
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-22 shrink-0 text-[#94A3B8] font-sans text-[10px]/3">
                       Ресурсы
                     </div>
                     <div className="grow shrink basis-[0%] h-1 rounded-xs overflow-clip bg-[#1E2640]">
                       <div className="w-[round(91%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                     <div className="w-6.5 text-right text-[#64748B] font-['JetBrainsMono-Regular','JetBrains_Mono',system-ui,sans-serif] shrink-0 text-[10px]/3">
                       91
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-22 shrink-0 text-[#94A3B8] font-sans text-[10px]/3">
                       Узлы / ТЭД
                     </div>
                     <div className="grow shrink basis-[0%] h-1 rounded-xs overflow-clip bg-[#1E2640]">
                       <div className="w-[round(88%,1px)] h-full rounded-xs bg-[#3B82F6]" />
                     </div>
                     <div className="w-6.5 text-right text-[#64748B] font-['JetBrainsMono-Regular','JetBrains_Mono',system-ui,sans-serif] shrink-0 text-[10px]/3">
                       88
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-22 shrink-0 text-[#94A3B8] font-sans text-[10px]/3">
                       Тормоза
                     </div>
                     <div className="grow shrink basis-[0%] h-1 rounded-xs overflow-clip bg-[#1E2640]">
                       <div className="w-[round(97%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                     <div className="w-6.5 text-right text-[#64748B] font-['JetBrainsMono-Regular','JetBrains_Mono',system-ui,sans-serif] shrink-0 text-[10px]/3">
                       97
                     </div>
                   </div>
                 </div>
               </div>
               <div className="py-3.5 px-4 border-b border-b-solid border-b-[#1E2640]">
                 <div className="tracking-widest uppercase mb-2.5 text-[#64748B] font-sans text-[10px]/3">
                   Алерты
                 </div>
                 <div className="flex gap-2">
                   <div className="grow shrink basis-[0%] rounded-lg bg-[#0D1220] border border-solid border-[#1E2640] p-2">
                     <div className="text-center text-[#EF4444] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-xl/6">
                       0
                     </div>
                     <div className="uppercase tracking-[0.06em] mt-0.5 text-center text-[#64748B] font-sans text-[9px]/3">
                       Крит.
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] rounded-lg bg-[#0D1220] border border-solid border-[#1E2640] p-2">
                     <div className="text-center text-[#EAB308] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-xl/6">
                       0
                     </div>
                     <div className="uppercase tracking-[0.06em] mt-0.5 text-center text-[#64748B] font-sans text-[9px]/3">
                       Пред.
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] rounded-lg bg-[#0D1220] border border-solid border-[#1E2640] p-2">
                     <div className="text-center text-[#60A5FA] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-xl/6">
                       0
                     </div>
                     <div className="uppercase tracking-[0.06em] mt-0.5 text-center text-[#64748B] font-sans text-[9px]/3">
                       Инфо
                     </div>
                   </div>
                 </div>
               </div>
               <div className="grow shrink basis-[0%] flex flex-col items-center justify-center opacity-[0.35] gap-2">
                 <HugeiconsIcon
                   icon={Tick02Icon}
                   strokeWidth={2}
                   className="size-8 text-[#22C55E]"
                 />
                 <div className="text-[#64748B] font-sans text-xs/4">
                   Нет активных алертов
                 </div>
               </div>
             </div>
             <div className="grow shrink basis-[0%] flex flex-col min-w-0 gap-3.5 bg-[#0A0E1A] p-4">
               <div className="flex shrink-0 gap-2.5">
                 <div className="grow shrink basis-[0%] flex flex-col rounded-xl gap-1.5 bg-[#0D1220] border border-solid border-[#1E2640] p-3.5">
                   <div className="flex items-center gap-1.5 tracking-widest uppercase text-[#64748B] font-sans text-[10px]/3">
                     <HugeiconsIcon
                       icon={FlashIcon}
                       strokeWidth={2}
                       className="size-3 shrink-0 text-[#64748B]"
                     />
                     Скорость
                   </div>
                   <div className="flex items-baseline gap-1.25">
                     <div className="text-[30px] leading-[round(up,100%,1px)] text-[#E2E8F0] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold shrink-0">
                       68.4
                     </div>
                     <div className="text-[#64748B] font-sans shrink-0 text-[13px]/4">
                       км/ч
                     </div>
                   </div>
                   <div className="text-[#64748B] font-sans text-[10px]/3">
                     Лимит: 120 км/ч
                   </div>
                   <div className="h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                     <div className="w-[round(57%,1px)] h-full rounded-xs" style={{ backgroundImage: 'linear-gradient(in oklab 90deg, oklab(62.3% -0.033 -0.185) 0%, oklab(58.5% 0.025 -0.202) 100%)' }} />
                   </div>
                 </div>
                 <div className="grow shrink basis-[0%] flex flex-col rounded-xl gap-1.5 bg-[#0D1220] border border-solid border-[#1E2640] p-3.5">
                   <div className="flex items-center gap-1.5 tracking-widest uppercase text-[#64748B] font-sans text-[10px]/3">
                     <HugeiconsIcon
                       icon={FuelStationIcon}
                       strokeWidth={2}
                       className="size-3 shrink-0 text-[#64748B]"
                     />
                     Топливо
                   </div>
                   <div className="flex items-baseline gap-1.25">
                     <div className="text-[30px] leading-[round(up,100%,1px)] text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold shrink-0">
                       84.3
                     </div>
                     <div className="text-[#64748B] font-sans shrink-0 text-[13px]/4">
                       %
                     </div>
                   </div>
                   <div className="text-[#64748B] font-sans text-[10px]/3">
                     Расход: 285 л/ч
                   </div>
                   <div className="h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                     <div className="w-[round(84%,1px)] h-full rounded-xs bg-[#22C55E]" />
                   </div>
                 </div>
                 <div className="grow shrink basis-[0%] flex flex-col rounded-xl gap-1.5 bg-[#0D1220] border border-solid border-[#1E2640] p-3.5">
                   <div className="flex items-center gap-1.5 tracking-widest uppercase text-[#64748B] font-sans text-[10px]/3">
                     <HugeiconsIcon
                       icon={TemperatureIcon}
                       strokeWidth={2}
                       className="size-3 shrink-0 text-[#64748B]"
                     />
                     Темп. ОЖ
                   </div>
                   <div className="flex items-baseline gap-1.25">
                     <div className="text-[30px] leading-[round(up,100%,1px)] text-[#F97316] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold shrink-0">
                       82.1
                     </div>
                     <div className="text-[#64748B] font-sans shrink-0 text-[13px]/4">
                       °C
                     </div>
                   </div>
                   <div className="text-[#64748B] font-sans text-[10px]/3">
                     Норма: 70–95 °C
                   </div>
                   <div className="h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                     <div className="w-[round(62%,1px)] h-full rounded-xs bg-[#F97316]" />
                   </div>
                 </div>
                 <div className="grow shrink basis-[0%] flex flex-col rounded-xl gap-1.5 bg-[#0D1220] border border-solid border-[#1E2640] p-3.5">
                   <div className="flex items-center gap-1.5 tracking-widest uppercase text-[#64748B] font-sans text-[10px]/3">
                     <HugeiconsIcon
                       icon={PipelineIcon}
                       strokeWidth={2}
                       className="size-3 shrink-0 text-[#64748B]"
                     />
                     Давл. ТМ
                   </div>
                   <div className="flex items-baseline gap-1.25">
                     <div className="text-[30px] leading-[round(up,100%,1px)] text-[#60A5FA] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold shrink-0">
                       506
                     </div>
                     <div className="text-[#64748B] font-sans shrink-0 text-[13px]/4">
                       кПа
                     </div>
                   </div>
                   <div className="text-[#64748B] font-sans text-[10px]/3">
                     Норма: 490–520
                   </div>
                   <div className="h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                     <div className="w-[round(84%,1px)] h-full rounded-xs bg-[#60A5FA]" />
                   </div>
                 </div>
                 <div className="grow shrink basis-[0%] flex flex-col rounded-xl gap-1.5 bg-[#0D1220] border border-solid border-[#1E2640] p-3.5">
                   <div className="flex items-center gap-1.5 tracking-widest uppercase text-[#64748B] font-sans text-[10px]/3">
                     <HugeiconsIcon
                       icon={RotateClockwiseIcon}
                       strokeWidth={2}
                       className="size-3 shrink-0 text-[#64748B]"
                     />
                     Обороты
                   </div>
                   <div className="flex items-baseline gap-1.25">
                     <div className="text-[30px] leading-[round(up,100%,1px)] text-[#A78BFA] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold shrink-0">
                       720
                     </div>
                     <div className="text-[#64748B] font-sans shrink-0 text-[13px]/4">
                       об/мин
                     </div>
                   </div>
                   <div className="text-[#64748B] font-sans text-[10px]/3">
                     Норма: 350–1000
                   </div>
                   <div className="h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                     <div className="w-[round(69%,1px)] h-full rounded-xs bg-[#A78BFA]" />
                   </div>
                 </div>
               </div>
                <div className="flex shrink-0 flex-col rounded-xl gap-3 bg-[#0D1220] border border-solid border-[#1E2640] p-4">
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex gap-1">
                      {trendTabs.map((tab) => {
                        const isActive = activeTrendTab === tab.key
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTrendTab(tab.key)}
                            className={`rounded-md py-1 px-3 transition-colors ${isActive ? "bg-[#1E2D50]" : "hover:bg-[#141929]"}`}
                            aria-pressed={isActive}
                          >
                            <div className={`font-sans text-[11px]/3.5 ${isActive ? "text-[#60A5FA]" : "text-[#64748B]"}`}>
                              {tab.label}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      {windowTabs.map((windowValue) => {
                        const isActive = activeWindowTab === windowValue
                        return (
                          <button
                            key={windowValue}
                            type="button"
                            onClick={() => setActiveWindowTab(windowValue)}
                            className={`rounded-sm py-0.75 px-2 border transition-colors ${isActive ? "bg-[#141929] border-[#1E2640]" : "border-transparent hover:bg-[#141929]"}`}
                            aria-pressed={isActive}
                          >
                            <div className={`font-sans text-[10px]/3 ${isActive ? "text-[#60A5FA]" : "text-[#64748B]"}`}>
                              {windowValue} мин
                            </div>
                          </button>
                        )
                      })}
                      <div className="flex items-center ml-2 gap-1">
                        <div className="rounded-[50%] bg-[#22C55E] shrink-0 size-1.5" />
                        <div className="text-[#22C55E] font-sans shrink-0 text-[10px]/3">
                         LIVE
                       </div>
                     </div>
                   </div>
                  </div>
                  <div className="h-auto w-full shrink-0">
                    <SpeedTrendChart metric={activeTrendTab} windowMinutes={activeWindowTab} />
                  </div>
                </div>
               <div className="shrink-0">
                 <div className="flex items-center justify-between mb-2">
                   <div className="tracking-widest uppercase text-[#64748B] font-sans shrink-0 text-[10px]/3">
                     Температура ТЭД по осям
                   </div>
                   <div className="text-[#64748B] font-sans shrink-0 text-[10px]/3">
                     Норма: 40–160 °C
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <div className="grow shrink basis-[0%] flex flex-col items-center rounded-lg py-2 px-2.5 gap-1 bg-[#0D1220] border border-solid border-[#1E2640]">
                     <div className="text-[#64748B] font-sans text-[9px]/3">
                       Ось 1
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-[15px]/4.5">
                       82°
                     </div>
                     <div className="w-full h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                       <div className="w-[round(42%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] flex flex-col items-center rounded-lg py-2 px-2.5 gap-1 bg-[#0D1220] border border-solid border-[#1E2640]">
                     <div className="text-[#64748B] font-sans text-[9px]/3">
                       Ось 2
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-[15px]/4.5">
                       79°
                     </div>
                     <div className="w-full h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                       <div className="w-[round(40%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] flex flex-col items-center rounded-lg py-2 px-2.5 gap-1 bg-[#0D1220] border border-solid border-[#1E2640]">
                     <div className="text-[#64748B] font-sans text-[9px]/3">
                       Ось 3
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-[15px]/4.5">
                       84°
                     </div>
                     <div className="w-full h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                       <div className="w-[round(43%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] flex flex-col items-center rounded-lg py-2 px-2.5 gap-1 bg-[#0D1220] border border-solid border-[#1E2640]">
                     <div className="text-[#64748B] font-sans text-[9px]/3">
                       Ось 4
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-[15px]/4.5">
                       81°
                     </div>
                     <div className="w-full h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                       <div className="w-[round(41%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] flex flex-col items-center rounded-lg py-2 px-2.5 gap-1 bg-[#0D1220] border border-solid border-[#1E2640]">
                     <div className="text-[#64748B] font-sans text-[9px]/3">
                       Ось 5
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-[15px]/4.5">
                       83°
                     </div>
                     <div className="w-full h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                       <div className="w-[round(42%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                   </div>
                   <div className="grow shrink basis-[0%] flex flex-col items-center rounded-lg py-2 px-2.5 gap-1 bg-[#0D1220] border border-solid border-[#1E2640]">
                     <div className="text-[#64748B] font-sans text-[9px]/3">
                       Ось 6
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-[15px]/4.5">
                       80°
                     </div>
                     <div className="w-full h-0.75 rounded-xs bg-[#1E2640] shrink-0">
                       <div className="w-[round(40%,1px)] h-full rounded-xs bg-[#22C55E]" />
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             <div className="[width:320px] flex flex-col shrink-0 bg-[#0A0E1A] border-l border-l-solid border-l-[#1E2640]">
               <div className="relative shrink-0 overflow-clip bg-[#060C18]">
                 <svg
                   viewBox="0 0 320 340"
                   xmlns="http://www.w3.org/2000/svg"
                   className="block h-auto w-full"
                   preserveAspectRatio="xMidYMid meet"
                   aria-label="Маршрут Астана — Қарағанды"
                 >
                   <defs><pattern id="_a1gt8w0" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0D1425"/></pattern></defs>
                   <rect width="320" height="340" fill="#060C18" />
                   <rect width="320" height="340" fill="url(#_a1gt8w0)" />
                   <path d="M 58,295 Q 95,260 130,230 Q 170,195 195,170 Q 218,145 240,108 Q 256,78 272,45" fill="none" stroke="#1E3A5F" strokeWidth="2" strokeDasharray="6 4" />
                   <path d="M 58,295 Q 95,260 130,230 Q 158,208 175,192" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                   <circle cx="58" cy="295" r="5" fill="#1E3A5F" stroke="#3B82F6" strokeWidth="1.5" />
                   <circle cx="272" cy="45" r="5" fill="#1E3A5F" stroke="#6366F1" strokeWidth="1.5" />
                   <text x="67" y="299" fontSize="10" fill="#94A3B8" fontWeight="600" fontFamily="Inter,sans-serif">
                     Астана
                   </text>
                   <text x="220" y="42" fontSize="10" fill="#94A3B8" fontWeight="600" fontFamily="Inter,sans-serif">
                     Қарағанды
                   </text>
                   <circle cx="130" cy="230" r="3" fill="#1E3A5F" />
                   <circle cx="195" cy="170" r="3" fill="#1E3A5F" />
                   <circle cx="240" cy="108" r="3" fill="#1E3A5F" />
                   <circle cx="175" cy="192" r="12" fill="#0D1220" stroke="#3B82F6" strokeWidth="2" />
                   <circle cx="175" cy="192" r="5" fill="#3B82F6" />
                   <circle cx="175" cy="192" r="16" fill="none" stroke="#3B82F6" style={{ opacity: '0.3' }} />
                   <rect x="8" y="8" width="118" height="38" rx="7" fill="#0D1220EB" stroke="#1E2640" />
                   <text x="17" y="24" fontSize="10" fill="#60A5FA" fontWeight="600" fontFamily="Inter,sans-serif">
                     Перегон P-01
                   </text>
                   <text x="17" y="38" fontSize="9" fill="#64748B" fontFamily="Inter,sans-serif">
                     Астана → Қарағанды
                   </text>
                   <rect x="210" y="302" width="100" height="30" rx="7" fill="#0D1220EB" stroke="#1E2640" />
                   <circle cx="224" cy="317" r="4" fill="#22C55E" />
                   <text x="234" y="314" fontSize="14" fontWeight="700" fill="#E2E8F0" fontFamily="JetBrains Mono,monospace">
                     68
                   </text>
                   <text x="256" y="314" fontSize="9" fill="#64748B" fontFamily="Inter,sans-serif">
                     км/ч
                   </text>
                   <text x="234" y="326" fontSize="8" fill="#22C55E" fontFamily="Inter,sans-serif">
                     Зелёный
                   </text>
                 </svg>
               </div>
               <div className="py-3.5 px-4 border-t border-t-solid border-t-[#1E2640]">
                 <div className="flex justify-between mb-2">
                   <div className="text-[#94A3B8] font-sans shrink-0 text-[11px]/3.5">
                     Астана
                   </div>
                   <div className="text-[#64748B] font-sans shrink-0 text-[10px]/3">
                     210 км
                   </div>
                   <div className="text-[#94A3B8] font-sans shrink-0 text-[11px]/3.5">
                     Қарағанды
                   </div>
                 </div>
                 <div className="h-1.5 relative rounded-[3px] overflow-clip bg-[#1E2640]">
                   <div className="w-[round(42%,1px)] h-full rounded-[3px]" style={{ backgroundImage: 'linear-gradient(in oklab 90deg, oklab(62.3% -0.033 -0.185) 0%, oklab(58.5% 0.025 -0.202) 100%)' }} />
                   <div className="absolute top-[50%] left-[round(41%,1px)] rounded-[50%] bg-white border-2 border-solid border-[#3B82F6] [box-shadow:#3B82F6_0px_0px_8px] size-3" style={{ translate: '-50% -50%' }} />
                 </div>
                 <div className="flex mt-2.5 gap-4">
                   <div className="flex flex-col gap-0.5">
                     <div className="text-[#E2E8F0] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-sm/4.5">
                       88.2
                     </div>
                     <div className="uppercase tracking-[0.07em] text-[#64748B] font-sans text-[9px]/3">
                       Пробег, км
                     </div>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <div className="text-[#E2E8F0] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-sm/4.5">
                       121.8
                     </div>
                     <div className="uppercase tracking-[0.07em] text-[#64748B] font-sans text-[9px]/3">
                       Осталось, км
                     </div>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <div className="text-[#E2E8F0] font-['JetBrainsMono-Bold','JetBrains_Mono',system-ui,sans-serif] font-bold text-sm/4.5">
                       ~1:48
                     </div>
                     <div className="uppercase tracking-[0.07em] text-[#64748B] font-sans text-[9px]/3">
                       Время пути
                     </div>
                   </div>
                 </div>
               </div>
               <div className="py-3.5 px-4 border-t border-t-solid border-t-[#1E2640]">
                 <div className="flex items-center justify-between mb-2.5">
                   <div className="tracking-widest uppercase text-[#64748B] font-sans shrink-0 text-[10px]/3">
                     Top-5 факторов
                   </div>
                   <div className="text-[#64748B] font-sans shrink-0 text-[9px]/3">
                     вклад в индекс
                   </div>
                 </div>
                 <div className="flex flex-col gap-1.75">
                   <div className="flex items-center gap-2">
                     <div className="flex items-center justify-center shrink-0 rounded-sm bg-[#0D2A1A] size-5">
                       <HugeiconsIcon
                         icon={Tick02Icon}
                         strokeWidth={2}
                         className="size-3 text-[#22C55E]"
                       />
                     </div>
                     <div className="grow shrink basis-[0%] text-[#94A3B8] font-sans text-[11px]/3.5">
                       Скорость
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Medium','JetBrains_Mono',system-ui,sans-serif] font-medium shrink-0 text-[11px]/3.5">
                       68.4 км/ч
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex items-center justify-center shrink-0 rounded-sm bg-[#0D2A1A] size-5">
                       <HugeiconsIcon
                         icon={Tick02Icon}
                         strokeWidth={2}
                         className="size-3 text-[#22C55E]"
                       />
                     </div>
                     <div className="grow shrink basis-[0%] text-[#94A3B8] font-sans text-[11px]/3.5">
                       Уровень топлива
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Medium','JetBrains_Mono',system-ui,sans-serif] font-medium shrink-0 text-[11px]/3.5">
                       84.3 %
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex items-center justify-center shrink-0 rounded-sm bg-[#0D2A1A] size-5">
                       <HugeiconsIcon
                         icon={Tick02Icon}
                         strokeWidth={2}
                         className="size-3 text-[#22C55E]"
                       />
                     </div>
                     <div className="grow shrink basis-[0%] text-[#94A3B8] font-sans text-[11px]/3.5">
                       Темп. ОЖ
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Medium','JetBrains_Mono',system-ui,sans-serif] font-medium shrink-0 text-[11px]/3.5">
                       82.1 °C
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex items-center justify-center shrink-0 rounded-sm bg-[#0C2340] size-5">
                       <HugeiconsIcon
                         icon={InformationCircleIcon}
                         strokeWidth={2}
                         className="size-3 text-[#60A5FA]"
                       />
                     </div>
                     <div className="grow shrink basis-[0%] text-[#94A3B8] font-sans text-[11px]/3.5">
                       Давл. ТМ
                     </div>
                     <div className="text-[#60A5FA] font-['JetBrainsMono-Medium','JetBrains_Mono',system-ui,sans-serif] font-medium shrink-0 text-[11px]/3.5">
                       506 кПа
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex items-center justify-center shrink-0 rounded-sm bg-[#0D2A1A] size-5">
                       <HugeiconsIcon
                         icon={Tick02Icon}
                         strokeWidth={2}
                         className="size-3 text-[#22C55E]"
                       />
                     </div>
                     <div className="grow shrink basis-[0%] text-[#94A3B8] font-sans text-[11px]/3.5">
                       Темп. ТЭД (макс.)
                     </div>
                     <div className="text-[#22C55E] font-['JetBrainsMono-Medium','JetBrains_Mono',system-ui,sans-serif] font-medium shrink-0 text-[11px]/3.5">
                       84 °C
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
}
