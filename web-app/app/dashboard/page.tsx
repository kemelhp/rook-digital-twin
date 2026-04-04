"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  CircleIcon,
  FlashIcon,
  FuelStationIcon,
  PipelineIcon,
  RotateClockwiseIcon,
  TemperatureIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  type AlertItem,
  type HealthIndex,
  type LocomotiveProfile,
  type TelemetryFrame,
  type TelemetryWsPayload,
  fetchActiveAlerts,
  fetchCurrentHealth,
  fetchLocomotiveProfiles,
  fetchTelemetryReplay,
} from "@/lib/api"
import { apiBaseUrl } from "@/lib/config"

import { SpeedTrendChart, type TrendMetric, type TrendWindow } from "./speed-trend-chart"

const DEFAULT_LOCO_ID = "TE33A-001"
const DEFAULT_LOCO_TYPE = "TE33A"
const DEFAULT_SCENARIO = "normal"
const DEFAULT_FREQUENCY = 1

const trendTabs: { key: TrendMetric; label: string }[] = [
  { key: "speed", label: "Скорость" },
  { key: "motor_temp", label: "Температуры ТЭД" },
  { key: "fuel", label: "Топливо" },
  { key: "motor_current", label: "Ток ТЭД" },
]

const scenarioTabs = ["normal", "acceleration", "braking", "overheat", "emergency"] as const
const windowTabs: TrendWindow[] = [1, 5, 15]

function toWsUrl() {
  const url = new URL(apiBaseUrl)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/ws/telemetry"
  return url.toString()
}

function gradeLabel(grade: HealthIndex["grade"]) {
  if (grade === "A") return "НОРМА"
  if (grade === "B") return "ХОРОШО"
  if (grade === "C") return "ВНИМАНИЕ"
  if (grade === "D") return "ПЛОХО"
  return "КРИТИЧНО"
}

function valueOrDash(value: number | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) {
    return "—"
  }
  return value.toFixed(digits)
}

export default function DashboardPage() {
  const socketRef = useRef<WebSocket | null>(null)

  const [activeTrendTab, setActiveTrendTab] = useState<TrendMetric>("speed")
  const [activeWindowTab, setActiveWindowTab] = useState<TrendWindow>(5)
  const [scenario, setScenario] = useState<(typeof scenarioTabs)[number]>(DEFAULT_SCENARIO)

  const [profiles, setProfiles] = useState<LocomotiveProfile[]>([])
  const [frame, setFrame] = useState<TelemetryFrame | null>(null)
  const [health, setHealth] = useState<HealthIndex | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([])
  const [historyFrames, setHistoryFrames] = useState<TelemetryFrame[]>([])

  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const locoType = frame?.loco_type ?? DEFAULT_LOCO_TYPE
  const locoId = frame?.loco_id ?? DEFAULT_LOCO_ID

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const [replay, latestHealth, alerts, locoProfiles] = await Promise.all([
          fetchTelemetryReplay(DEFAULT_LOCO_ID, 15),
          fetchCurrentHealth(DEFAULT_LOCO_ID).catch(() => null),
          fetchActiveAlerts(DEFAULT_LOCO_ID).catch(() => []),
          fetchLocomotiveProfiles(),
        ])

        if (cancelled) {
          return
        }

        const sortedReplay = replay.slice().sort((a, b) => a.timestamp - b.timestamp)
        setHistoryFrames(sortedReplay)
        setFrame(sortedReplay.at(-1) ?? null)
        setHealth(latestHealth)
        setActiveAlerts(alerts)
        setProfiles(locoProfiles)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Не удалось загрузить данные")
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const wsUrl = new URL(toWsUrl())
    wsUrl.searchParams.set("loco_type", DEFAULT_LOCO_TYPE)
    wsUrl.searchParams.set("loco_id", DEFAULT_LOCO_ID)
    wsUrl.searchParams.set("scenario", scenario)
    wsUrl.searchParams.set("frequency", String(DEFAULT_FREQUENCY))

    const ws = new WebSocket(wsUrl.toString())
    socketRef.current = ws

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onerror = () => setIsConnected(false)
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as TelemetryWsPayload | { type: "ping" }
      if (!("telemetry" in parsed)) {
        return
      }

      setFrame(parsed.telemetry)
      setHealth(parsed.health)
      setActiveAlerts(parsed.alerts.alerts)
      setLastUpdateAt(Date.now())
      setLoadError(null)

      setHistoryFrames((current) => {
        const next = [...current, parsed.telemetry]
        return next.slice(-1500)
      })
    }

    return () => {
      ws.close()
    }
  }, [scenario])

  const profile = useMemo(
    () => profiles.find((item) => item.id === locoType) ?? null,
    [profiles, locoType]
  )

  const criticalAlerts = activeAlerts.filter((item) => item.severity === "critical").length
  const warningAlerts = activeAlerts.filter((item) => item.severity === "warning").length
  const infoAlerts = activeAlerts.filter((item) => item.severity === "info").length

  return (
    <div className="flex min-h-svh flex-col bg-[#0A0E1A]">
      <div className="flex h-14 items-center gap-3.5 border-b border-b-[#1E2640] bg-[#0D1220] px-5">
        <div className="flex items-center gap-2.5 rounded-lg border border-[#1E2640] bg-[#141929] px-3 py-1.5">
          <div className="size-2 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E]" />
          <div>
            <div className="text-[13px] text-[#E2E8F0]">{locoId}</div>
            <div className="text-[10px] text-[#64748B]">{profile?.manufacturer ?? locoType}</div>
          </div>
        </div>

        <div className="rounded-sm border border-[#2D4A80] bg-[#1E2D50] px-2.25 py-0.75 text-[11px] text-[#60A5FA]">
          {profile?.name ?? locoType}
        </div>

        <div className="min-w-0 grow" />

        <div className="text-[10px] text-[#94A3B8]">Сценарий:</div>
        {scenarioTabs.map((item) => {
          const active = scenario === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => setScenario(item)}
              className={`rounded-[20px] border px-2.5 py-1 text-[11px] transition-colors ${
                active
                  ? "border-[#3B82F6] bg-[#1E2D50] text-[#60A5FA]"
                  : "border-[#1E2640] bg-[#141929] text-[#64748B] hover:bg-[#1A2237]"
              }`}
            >
              {item}
            </button>
          )
        })}

        <div className="h-5 w-px bg-[#1E2640]" />
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${
            isConnected
              ? "border-[#166534] bg-[#0D1F14] text-[#22C55E]"
              : "border-[#7F1D1D] bg-[#2A0D0D] text-[#F87171]"
          }`}
        >
          <div className={`size-1.5 rounded-full ${isConnected ? "bg-[#22C55E]" : "bg-[#F87171]"}`} />
          <span className="text-[11px]">{isConnected ? "CONNECTED" : "DISCONNECTED"} · {DEFAULT_FREQUENCY}Hz</span>
        </div>
        <div className="text-xs text-[#64748B]">
          {lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString("ru-RU") : "--:--:--"}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-72 shrink-0 flex-col border-r border-r-[#1E2640] bg-[#0A0E1A]">
          <div className="border-b border-b-[#1E2640] bg-[linear-gradient(160deg,#0F1D38_0%,#0D1220_100%)] p-5">
            <div className="mb-3.5 text-[10px] uppercase tracking-[0.12em] text-[#64748B]">Индекс здоровья</div>
            <div className="text-4xl font-bold text-[#E2E8F0]">{valueOrDash(health?.index, 1)}</div>
            <div className="mt-2 inline-flex rounded-md border border-[#1E2640] bg-[#0D1220] px-2.5 py-1 text-xs text-[#60A5FA]">
              {(health && `${gradeLabel(health.grade)} - ${health.grade}`) || "Нет данных"}
            </div>
            <div className="mt-4 space-y-1.5">
              {(health?.group_scores ?? []).map((group) => (
                <div key={group.group} className="flex items-center gap-2">
                  <div className="w-20 text-[10px] capitalize text-[#94A3B8]">{group.group}</div>
                  <div className="h-1 flex-1 rounded-xs bg-[#1E2640]">
                    <div className="h-full rounded-xs bg-[#22C55E]" style={{ width: `${Math.max(0, Math.min(group.score, 100))}%` }} />
                  </div>
                  <div className="w-8 text-right text-[10px] text-[#64748B]">{Math.round(group.score)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-b-[#1E2640] px-4 py-3.5">
            <div className="mb-2.5 text-[10px] uppercase tracking-widest text-[#64748B]">Алерты</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#1E2640] bg-[#0D1220] p-2">
                <div className="text-xl font-bold text-[#EF4444]">{criticalAlerts}</div>
                <div className="text-[9px] uppercase text-[#64748B]">Крит.</div>
              </div>
              <div className="rounded-lg border border-[#1E2640] bg-[#0D1220] p-2">
                <div className="text-xl font-bold text-[#EAB308]">{warningAlerts}</div>
                <div className="text-[9px] uppercase text-[#64748B]">Пред.</div>
              </div>
              <div className="rounded-lg border border-[#1E2640] bg-[#0D1220] p-2">
                <div className="text-xl font-bold text-[#60A5FA]">{infoAlerts}</div>
                <div className="text-[9px] uppercase text-[#64748B]">Инфо</div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3.5">
            <div className="text-[10px] uppercase tracking-widest text-[#64748B]">Активные предупреждения</div>
            <div className="space-y-1 overflow-auto">
              {activeAlerts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#1E2640] p-3 text-xs text-[#64748B]">Нет активных алертов</div>
              ) : (
                activeAlerts.slice(0, 6).map((alert) => (
                  <div key={alert.alert_id} className="rounded-lg border border-[#1E2640] bg-[#0D1220] p-2">
                    <div className="text-[11px] text-[#E2E8F0]">{alert.label}</div>
                    <div className="text-[10px] text-[#64748B]">{alert.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 bg-[#0A0E1A] p-4">
          {loadError ? (
            <div className="rounded-lg border border-[#7F1D1D] bg-[#2A0D0D] px-3 py-2 text-sm text-[#FCA5A5]">
              {loadError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#64748B]"><HugeiconsIcon icon={FlashIcon} className="size-3" />Скорость</div>
              <div className="text-3xl font-bold text-[#E2E8F0]">{valueOrDash(frame?.traction.speed, 1)}</div>
              <div className="text-[11px] text-[#64748B]">км/ч</div>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#64748B]"><HugeiconsIcon icon={FuelStationIcon} className="size-3" />Топливо</div>
              <div className="text-3xl font-bold text-[#22C55E]">{valueOrDash(frame?.resources.fuel_level, 1)}</div>
              <div className="text-[11px] text-[#64748B]">%</div>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#64748B]"><HugeiconsIcon icon={TemperatureIcon} className="size-3" />Темп. ОЖ</div>
              <div className="text-3xl font-bold text-[#F97316]">{valueOrDash(frame?.resources.coolant_temperature, 1)}</div>
              <div className="text-[11px] text-[#64748B]">°C</div>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#64748B]"><HugeiconsIcon icon={PipelineIcon} className="size-3" />Давл. ТМ</div>
              <div className="text-3xl font-bold text-[#60A5FA]">{valueOrDash(frame?.traction.brake_pipe_pressure, 0)}</div>
              <div className="text-[11px] text-[#64748B]">кПа</div>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#64748B]"><HugeiconsIcon icon={RotateClockwiseIcon} className="size-3" />Обороты</div>
              <div className="text-3xl font-bold text-[#A78BFA]">{valueOrDash(frame?.resources.engine_rpm, 0)}</div>
              <div className="text-[11px] text-[#64748B]">об/мин</div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-1">
                {trendTabs.map((tab) => {
                  const isActive = activeTrendTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTrendTab(tab.key)}
                      className={`rounded-md px-3 py-1 text-[11px] ${isActive ? "bg-[#1E2D50] text-[#60A5FA]" : "text-[#64748B] hover:bg-[#141929]"}`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                {windowTabs.map((windowValue) => {
                  const isActive = activeWindowTab === windowValue
                  return (
                    <button
                      key={windowValue}
                      type="button"
                      onClick={() => setActiveWindowTab(windowValue)}
                      className={`rounded-sm border px-2 py-0.75 text-[10px] ${isActive ? "border-[#1E2640] bg-[#141929] text-[#60A5FA]" : "border-transparent text-[#64748B] hover:bg-[#141929]"}`}
                    >
                      {windowValue} мин
                    </button>
                  )
                })}
                <div className="ml-2 flex items-center gap-1 text-[10px] text-[#22C55E]"><HugeiconsIcon icon={CircleIcon} className="size-2" />LIVE</div>
              </div>
            </div>
            <SpeedTrendChart metric={activeTrendTab} windowMinutes={activeWindowTab} frames={historyFrames} />
          </div>

          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-4">
              <div className="mb-2 flex items-center justify-between text-[10px]">
                <div className="uppercase tracking-widest text-[#64748B]">Температура ТЭД по осям</div>
                <div className="text-[#64748B]">Норма: 40-160 °C</div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {(frame?.nodes.motor_temperatures ?? []).map((temp, index) => (
                  <div key={`${index}-${temp}`} className="rounded-lg border border-[#1E2640] bg-[#0A0E1A] p-2 text-center">
                    <div className="text-[9px] text-[#64748B]">Ось {index + 1}</div>
                    <div className="text-[15px] font-bold text-[#22C55E]">{temp.toFixed(0)}°</div>
                    <div className="mt-1 h-0.75 rounded-xs bg-[#1E2640]">
                      <div className="h-full rounded-xs bg-[#22C55E]" style={{ width: `${Math.max(0, Math.min((temp / 200) * 100, 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#1E2640] bg-[#0D1220] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-[#64748B]">Навигация и факторы</div>
                <div className="text-[10px] text-[#64748B]">Секция {frame?.navigation.route_section ?? "--"}</div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-[#1E2640] bg-[#0A0E1A] p-2 text-[#94A3B8]">Широта: <span className="text-[#E2E8F0]">{valueOrDash(frame?.navigation.latitude, 4)}</span></div>
                <div className="rounded-lg border border-[#1E2640] bg-[#0A0E1A] p-2 text-[#94A3B8]">Долгота: <span className="text-[#E2E8F0]">{valueOrDash(frame?.navigation.longitude, 4)}</span></div>
                <div className="rounded-lg border border-[#1E2640] bg-[#0A0E1A] p-2 text-[#94A3B8]">Пробег: <span className="text-[#E2E8F0]">{valueOrDash(frame?.navigation.odometer, 2)} км</span></div>
                <div className="rounded-lg border border-[#1E2640] bg-[#0A0E1A] p-2 text-[#94A3B8]">Сигнал: <span className="text-[#E2E8F0]">{frame?.navigation.signal_status ?? "--"}</span></div>
              </div>
              <div className="space-y-1.5">
                {(health?.top_factors ?? []).slice(0, 5).map((factor) => (
                  <div key={factor.param_id} className="flex items-center justify-between rounded-md border border-[#1E2640] bg-[#0A0E1A] px-2 py-1.5 text-[11px]">
                    <div className="text-[#94A3B8]">{factor.label}</div>
                    <div className="text-[#E2E8F0]">{factor.value.toFixed(1)} {factor.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
