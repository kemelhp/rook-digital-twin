"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import { type TelemetryFrame } from "@/lib/api"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export type TrendMetric = "speed" | "motor_temp" | "fuel" | "motor_current"
export type TrendWindow = 1 | 5 | 15

type TrendPoint = {
  t: number
  value: number
  ts: number
}

const trendMeta: Record<
  TrendMetric,
  {
    label: string
    unit: string
    color: string
    yDomain: [number, number]
    yTicks: number[]
    referenceLine?: { value: number; color: string }
  }
> = {
  speed: {
    label: "Скорость",
    unit: "км/ч",
    color: "#3b82f6",
    yDomain: [0, 120],
    yTicks: [0, 40, 80, 120],
    referenceLine: { value: 120, color: "#ef4444" },
  },
  motor_temp: {
    label: "Температуры ТЭД",
    unit: "°C",
    color: "#22c55e",
    yDomain: [40, 200],
    yTicks: [40, 80, 120, 160, 200],
    referenceLine: { value: 160, color: "#ef4444" },
  },
  fuel: {
    label: "Топливо",
    unit: "%",
    color: "#22c55e",
    yDomain: [0, 100],
    yTicks: [0, 25, 50, 75, 100],
    referenceLine: { value: 15, color: "#eab308" },
  },
  motor_current: {
    label: "Ток ТЭД",
    unit: "A",
    color: "#06b6d4",
    yDomain: [0, 1200],
    yTicks: [0, 400, 800, 1200],
    referenceLine: { value: 1000, color: "#f97316" },
  },
}

function getMetricValue(frame: TelemetryFrame, metric: TrendMetric): number | null {
  if (metric === "speed") {
    return frame.traction.speed
  }

  if (metric === "motor_temp") {
    return Math.max(...frame.nodes.motor_temperatures)
  }

  if (metric === "fuel") {
    return frame.resources.fuel_level ?? null
  }

  if (frame.traction.traction_motor_current.length === 0) {
    return null
  }

  const sum = frame.traction.traction_motor_current.reduce((acc, value) => acc + value, 0)
  return sum / frame.traction.traction_motor_current.length
}

function toChartData(
  frames: TelemetryFrame[],
  metric: TrendMetric,
  windowMinutes: TrendWindow
): TrendPoint[] {
  const now = Date.now() / 1000
  const from = now - windowMinutes * 60

  const filtered = frames
    .filter((frame) => frame.timestamp >= from)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-120)

  return filtered
    .map((frame, index) => {
      const value = getMetricValue(frame, metric)
      if (value == null || Number.isNaN(value)) {
        return null
      }
      return {
        t: index,
        ts: frame.timestamp,
        value,
      }
    })
    .filter((item): item is TrendPoint => item !== null)
}

function formatTimestamp(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("ru-RU", {
    minute: "2-digit",
    second: "2-digit",
  })
}

function buildXAxisTicks(points: TrendPoint[]): number[] {
  const lastIndex = points.length - 1
  if (lastIndex <= 0) {
    return [0]
  }

  if (lastIndex < 4) {
    return Array.from(new Set([0, lastIndex]))
  }

  return Array.from(
    new Set([
      0,
      Math.round(lastIndex * 0.33),
      Math.round(lastIndex * 0.66),
      lastIndex,
    ])
  ).sort((a, b) => a - b)
}

export function SpeedTrendChart({
  metric,
  windowMinutes,
  frames,
}: {
  metric: TrendMetric
  windowMinutes: TrendWindow
  frames: TelemetryFrame[]
}) {
  const fillId = React.useId().replace(/:/g, "")
  const meta = trendMeta[metric]
  const data = React.useMemo(
    () => toChartData(frames, metric, windowMinutes),
    [frames, metric, windowMinutes]
  )
  const xTicks = React.useMemo(() => buildXAxisTicks(data), [data])

  const chartConfig = {
    value: {
      label: meta.label,
      color: meta.color,
    },
  } satisfies ChartConfig

  if (data.length === 0) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-xs text-slate-500 font-medium">
        No data for selected timeframe
      </div>
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-40 w-full [&_.recharts-cartesian-axis-tick_text]:fill-slate-500 [&_.recharts-cartesian-axis-tick_text]:text-xs [&_.recharts-cartesian-axis-tick_text]:font-mono"
      initialDimension={{ width: 640, height: 160 }}
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3,3" opacity={0.3} />
        <XAxis
          dataKey="t"
          type="number"
          domain={[0, Math.max(data.length - 1, 1)]}
          ticks={xTicks}
          interval="preserveStartEnd"
          minTickGap={26}
          tickMargin={8}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            const point = data[Number(value)]
            return point ? formatTimestamp(point.ts) : ""
          }}
        />
        <YAxis
          domain={meta.yDomain}
          ticks={meta.yTicks}
          width={36}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
        />
        {meta.referenceLine ? (
          <ReferenceLine
            y={meta.referenceLine.value}
            stroke={meta.referenceLine.color}
            strokeDasharray="4 3"
            strokeOpacity={0.35}
          />
        ) : null}
        <ChartTooltip
          cursor={{ stroke: "#1e293b", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              className="border-slate-700 bg-slate-900/95 text-slate-100"
              labelFormatter={(_, payload) => {
                const ts = payload?.[0]?.payload?.ts
                return typeof ts === "number" ? formatTimestamp(ts) : "—"
              }}
              formatter={(value) => [
                `${Number(value).toFixed(meta.unit === "км/ч" || meta.unit === "%" ? 1 : 0)} ${meta.unit}`,
                meta.label,
              ]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={meta.color}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          dot={(props) => {
            const { cx, cy, index } = props
            if (index !== data.length - 1 || cx == null || cy == null) {
              return null
            }

            return (
              <g key={`dot-${index}`}>
                <circle cx={cx} cy={cy} r={7} fill="none" stroke={meta.color} strokeOpacity={0.4} />
                <circle cx={cx} cy={cy} r={4} fill={meta.color} />
              </g>
            )
          }}
          activeDot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
