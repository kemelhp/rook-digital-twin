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
  type LocomotiveUnit,
  type TelemetryFrame,
  type TelemetryWsPayload,
  fetchActiveAlerts,
  fetchCurrentHealth,
  fetchLocomotives,
  fetchLocomotiveProfiles,
  fetchTelemetryReplay,
} from "@/lib/api"
import { apiBaseUrl } from "@/lib/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { SpeedTrendChart, type TrendMetric, type TrendWindow } from "./speed-trend-chart"

const DEFAULT_LOCO_ID = "TE33A-001"
const DEFAULT_LOCO_TYPE = "TE33A"
const DEFAULT_FREQUENCY = 1

const trendTabs: { key: TrendMetric; label: string }[] = [
  { key: "speed", label: "Скорость" },
  { key: "motor_temp", label: "Температуры ТЭД" },
  { key: "fuel", label: "Топливо" },
  { key: "motor_current", label: "Ток ТЭД" },
]

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
  const [profiles, setProfiles] = useState<LocomotiveProfile[]>([])
  const [locomotives, setLocomotives] = useState<LocomotiveUnit[]>([])
  const [selectedLocoId, setSelectedLocoId] = useState(DEFAULT_LOCO_ID)
  const [frame, setFrame] = useState<TelemetryFrame | null>(null)
  const [health, setHealth] = useState<HealthIndex | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([])
  const [historyFrames, setHistoryFrames] = useState<TelemetryFrame[]>([])

  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selectedLoco = useMemo(
    () => locomotives.find((item) => item.loco_id === selectedLocoId) ?? null,
    [locomotives, selectedLocoId]
  )

  const locoType = frame?.loco_type ?? selectedLoco?.loco_type ?? DEFAULT_LOCO_TYPE

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const [locoProfiles, units] = await Promise.all([
          fetchLocomotiveProfiles(),
          fetchLocomotives(),
        ])

        if (cancelled) {
          return
        }

        const activeUnits = units.filter((item) => item.is_active)
        const defaultUnit = activeUnits.find((item) => item.loco_id === DEFAULT_LOCO_ID) ?? activeUnits[0]

        setProfiles(locoProfiles)
        setLocomotives(activeUnits)
        if (defaultUnit) {
          setSelectedLocoId(defaultUnit.loco_id)
        }
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
    let cancelled = false

    async function loadLocoData() {
      if (!selectedLocoId) {
        return
      }

      try {
        const [replay, latestHealth, alerts] = await Promise.all([
          fetchTelemetryReplay(selectedLocoId, 15),
          fetchCurrentHealth(selectedLocoId).catch(() => null),
          fetchActiveAlerts(selectedLocoId).catch(() => []),
        ])

        if (cancelled) {
          return
        }

        const sortedReplay = replay.slice().sort((a, b) => a.timestamp - b.timestamp)
        setHistoryFrames(sortedReplay)
        setFrame(sortedReplay.at(-1) ?? null)
        setHealth(latestHealth)
        setActiveAlerts(alerts)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Не удалось загрузить данные")
        }
      }
    }

    void loadLocoData()

    return () => {
      cancelled = true
    }
  }, [selectedLocoId])

  useEffect(() => {
    const wsUrl = new URL(toWsUrl())
    wsUrl.searchParams.set("loco_type", selectedLoco?.loco_type ?? DEFAULT_LOCO_TYPE)
    wsUrl.searchParams.set("loco_id", selectedLocoId)
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
  }, [selectedLocoId, selectedLoco?.loco_type])

  const profile = useMemo(
    () => profiles.find((item) => item.id === locoType) ?? null,
    [profiles, locoType]
  )

  const criticalAlerts = activeAlerts.filter((item) => item.severity === "critical").length
  const warningAlerts = activeAlerts.filter((item) => item.severity === "warning").length
  const infoAlerts = activeAlerts.filter((item) => item.severity === "info").length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center gap-4 border-b px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Select value={selectedLocoId} onValueChange={setSelectedLocoId}>
              <SelectTrigger className="w-full justify-start border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none focus-visible:ring-0">
                <SelectValue placeholder="Select locomotive" />
              </SelectTrigger>
              <SelectContent>
                {locomotives.map((item) => (
                  <SelectItem key={item.loco_id} value={item.loco_id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="truncate text-xs text-muted-foreground">
              {selectedLoco?.manufacturer ?? profile?.manufacturer ?? locoType}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted px-3 py-2 text-xs font-mono font-semibold tracking-wider">
          {profile?.name ?? locoType}
        </div>

        <div className="min-w-0 grow" />

        <div className="h-5 w-px bg-border" />
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold ${
            isConnected
              ? "border-green-700/50 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400"
              : "border-red-700/50 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-mono">{isConnected ? "CONNECTED" : "OFFLINE"} • {DEFAULT_FREQUENCY}Hz</span>
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          {lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString("ru-RU") : "--:--:--"}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-64 shrink-0 flex-col border-r">
          <Card className="border-b rounded-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm uppercase tracking-widest">Health Index</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-5xl font-bold tracking-tight">{valueOrDash(health?.index, 1)}</div>
              <Badge variant="outline" className="font-mono">
                {(health && `${gradeLabel(health.grade)} — ${health.grade}`) || "—"}
              </Badge>
              <div className="space-y-2">
                {(health?.group_scores ?? []).map((group) => (
                  <div key={group.group} className="flex items-center gap-2 text-xs">
                    <div className="w-16 font-semibold uppercase text-muted-foreground">{group.group}</div>
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(group.score, 100))}%` }} />
                    </div>
                    <div className="w-8 text-right font-mono font-semibold">{Math.round(group.score)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-b rounded-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-widest">Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-muted p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">{criticalAlerts}</div>
                  <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Critical</div>
                </div>
                <div className="rounded-lg border bg-muted p-3 text-center">
                  <div className="text-2xl font-bold text-amber-500">{warningAlerts}</div>
                  <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Warning</div>
                </div>
                <div className="rounded-lg border bg-muted p-3 text-center">
                  <div className="text-2xl font-bold text-blue-500">{infoAlerts}</div>
                  <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Info</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-1 flex-col rounded-none border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-widest">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              <div className="space-y-1 overflow-auto flex-1">
                {activeAlerts.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted p-2 text-xs text-muted-foreground text-center">No active alerts</div>
                ) : (
                  activeAlerts.slice(0, 6).map((alert) => (
                    <div key={alert.alert_id} className="rounded-lg border bg-muted p-2 hover:bg-muted/80 transition-colors">
                      <div className="text-xs font-semibold">{alert.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          {loadError ? (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <HugeiconsIcon icon={FlashIcon} className="size-3.5" />
                  Speed
                </div>
                <div className="text-3xl font-bold">{valueOrDash(frame?.traction.speed, 1)}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">km/h</div>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <HugeiconsIcon icon={FuelStationIcon} className="size-3.5" />
                  Fuel
                </div>
                <div className="text-3xl font-bold">{valueOrDash(frame?.resources.fuel_level, 1)}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">%</div>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <HugeiconsIcon icon={TemperatureIcon} className="size-3.5" />
                  Coolant
                </div>
                <div className="text-3xl font-bold">{valueOrDash(frame?.resources.coolant_temperature, 1)}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">°C</div>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <HugeiconsIcon icon={PipelineIcon} className="size-3.5" />
                  Pressure
                </div>
                <div className="text-3xl font-bold">{valueOrDash(frame?.traction.brake_pipe_pressure, 0)}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">kPa</div>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <HugeiconsIcon icon={RotateClockwiseIcon} className="size-3.5" />
                  RPM
                </div>
                <div className="text-3xl font-bold">{valueOrDash(frame?.resources.engine_rpm, 0)}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">rpm</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {trendTabs.map((tab) => {
                    const isActive = activeTrendTab === tab.key
                    return (
                      <Button
                        key={tab.key}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTrendTab(tab.key)}
                        className="text-xs uppercase tracking-wide"
                      >
                        {tab.label}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  {windowTabs.map((windowValue) => {
                    const isActive = activeWindowTab === windowValue
                    return (
                      <Button
                        key={windowValue}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveWindowTab(windowValue)}
                        className="text-xs"
                      >
                        {windowValue}m
                      </Button>
                    )
                  })}
                  <div className="ml-3 flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                    <HugeiconsIcon icon={CircleIcon} className="size-2 animate-pulse" />
                    LIVE
                  </div>
                </div>
              </div>
              <SpeedTrendChart metric={activeTrendTab} windowMinutes={activeWindowTab} frames={historyFrames} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest">Motor Temperatures (°C)</CardTitle>
                  <span className="text-xs font-mono text-muted-foreground">Normal: 40-160°C</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {(frame?.nodes.motor_temperatures ?? []).map((temp, index) => (
                    <div key={`${index}-${temp}`} className="rounded-lg border bg-muted p-2.5 text-center hover:bg-muted/80 transition-colors">
                      <div className="text-xs font-semibold text-muted-foreground">Axis {index + 1}</div>
                      <div className="text-xl font-bold mt-1">{temp.toFixed(0)}°</div>
                      <div className="mt-2 h-1 rounded-full bg-muted-foreground/20">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min((temp / 200) * 100, 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest">Navigation & Parameters</CardTitle>
                  <span className="text-xs font-mono text-muted-foreground">Section: {frame?.navigation.route_section ?? "--"}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border bg-muted p-2.5">
                    <span className="font-semibold text-muted-foreground">Lat:</span> {valueOrDash(frame?.navigation.latitude, 4)}
                  </div>
                  <div className="rounded-lg border bg-muted p-2.5">
                    <span className="font-semibold text-muted-foreground">Lon:</span> {valueOrDash(frame?.navigation.longitude, 4)}
                  </div>
                  <div className="rounded-lg border bg-muted p-2.5">
                    <span className="font-semibold text-muted-foreground">Odometer:</span> {valueOrDash(frame?.navigation.odometer, 2)} km
                  </div>
                  <div className="rounded-lg border bg-muted p-2.5">
                    <span className="font-semibold text-muted-foreground">Signal:</span> {frame?.navigation.signal_status ?? "--"}
                  </div>
                </div>
                <div className="space-y-1.5 border-t pt-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Top Factors</div>
                  {(health?.top_factors ?? []).slice(0, 5).map((factor) => (
                    <div key={factor.param_id} className="flex items-center justify-between rounded-lg border bg-muted px-3 py-2 text-xs hover:bg-muted/80 transition-colors">
                      <div className="font-medium">{factor.label}</div>
                      <div className="font-mono text-muted-foreground">{factor.value.toFixed(1)} {factor.unit}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
