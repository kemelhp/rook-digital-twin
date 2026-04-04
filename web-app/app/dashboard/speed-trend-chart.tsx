"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export type TrendMetric = "speed" | "motor_temp" | "fuel" | "motor_current"
export type TrendWindow = 1 | 5 | 15

type TrendPoint = { t: number; value: number }

const trendMeta: Record<TrendMetric, {
  label: string
  unit: string
  color: string
  yDomain: [number, number]
  yTicks: number[]
  referenceLine?: { value: number; color: string }
}> = {
  speed: {
    label: "Скорость",
    unit: "км/ч",
    color: "#3B82F6",
    yDomain: [0, 120],
    yTicks: [0, 40, 80, 120],
    referenceLine: { value: 120, color: "#EF4444" },
  },
  motor_temp: {
    label: "Температуры ТЭД",
    unit: "°C",
    color: "#22C55E",
    yDomain: [40, 160],
    yTicks: [40, 80, 120, 160],
    referenceLine: { value: 160, color: "#EF4444" },
  },
  fuel: {
    label: "Топливо",
    unit: "%",
    color: "#22C55E",
    yDomain: [0, 100],
    yTicks: [0, 25, 50, 75, 100],
    referenceLine: { value: 15, color: "#EAB308" },
  },
  motor_current: {
    label: "Ток ТЭД",
    unit: "A",
    color: "#60A5FA",
    yDomain: [0, 1200],
    yTicks: [0, 400, 800, 1200],
    referenceLine: { value: 1000, color: "#F97316" },
  },
}

const trendData: Record<TrendMetric, Record<TrendWindow, TrendPoint[]>> = {
  speed: {
    1: [
      { t: 0, value: 57.6 },
      { t: 1, value: 59.3 },
      { t: 2, value: 61.5 },
      { t: 3, value: 63.7 },
      { t: 4, value: 65.2 },
      { t: 5, value: 66.8 },
      { t: 6, value: 67.4 },
      { t: 7, value: 67.9 },
      { t: 8, value: 68.1 },
      { t: 9, value: 68.4 },
    ],
    5: [
      { t: 0, value: 12 },
      { t: 1, value: 18 },
      { t: 2, value: 28 },
      { t: 3, value: 36 },
      { t: 4, value: 44 },
      { t: 5, value: 52 },
      { t: 6, value: 58 },
      { t: 7, value: 62 },
      { t: 8, value: 65 },
      { t: 9, value: 68.4 },
    ],
    15: [
      { t: 0, value: 0 },
      { t: 1, value: 8 },
      { t: 2, value: 16 },
      { t: 3, value: 24 },
      { t: 4, value: 34 },
      { t: 5, value: 42 },
      { t: 6, value: 50 },
      { t: 7, value: 57 },
      { t: 8, value: 63 },
      { t: 9, value: 68.4 },
    ],
  },
  motor_temp: {
    1: [
      { t: 0, value: 79 },
      { t: 1, value: 80 },
      { t: 2, value: 80 },
      { t: 3, value: 81 },
      { t: 4, value: 82 },
      { t: 5, value: 82 },
      { t: 6, value: 83 },
      { t: 7, value: 83 },
      { t: 8, value: 84 },
      { t: 9, value: 84 },
    ],
    5: [
      { t: 0, value: 72 },
      { t: 1, value: 74 },
      { t: 2, value: 76 },
      { t: 3, value: 77 },
      { t: 4, value: 79 },
      { t: 5, value: 80 },
      { t: 6, value: 81 },
      { t: 7, value: 82 },
      { t: 8, value: 83 },
      { t: 9, value: 84 },
    ],
    15: [
      { t: 0, value: 64 },
      { t: 1, value: 66 },
      { t: 2, value: 68 },
      { t: 3, value: 70 },
      { t: 4, value: 72 },
      { t: 5, value: 75 },
      { t: 6, value: 77 },
      { t: 7, value: 80 },
      { t: 8, value: 82 },
      { t: 9, value: 84 },
    ],
  },
  fuel: {
    1: [
      { t: 0, value: 84.9 },
      { t: 1, value: 84.8 },
      { t: 2, value: 84.7 },
      { t: 3, value: 84.6 },
      { t: 4, value: 84.6 },
      { t: 5, value: 84.5 },
      { t: 6, value: 84.4 },
      { t: 7, value: 84.4 },
      { t: 8, value: 84.3 },
      { t: 9, value: 84.3 },
    ],
    5: [
      { t: 0, value: 86.5 },
      { t: 1, value: 86.2 },
      { t: 2, value: 85.8 },
      { t: 3, value: 85.5 },
      { t: 4, value: 85.1 },
      { t: 5, value: 84.9 },
      { t: 6, value: 84.7 },
      { t: 7, value: 84.6 },
      { t: 8, value: 84.4 },
      { t: 9, value: 84.3 },
    ],
    15: [
      { t: 0, value: 90.8 },
      { t: 1, value: 90.1 },
      { t: 2, value: 89.3 },
      { t: 3, value: 88.4 },
      { t: 4, value: 87.6 },
      { t: 5, value: 86.9 },
      { t: 6, value: 86.2 },
      { t: 7, value: 85.5 },
      { t: 8, value: 84.9 },
      { t: 9, value: 84.3 },
    ],
  },
  motor_current: {
    1: [
      { t: 0, value: 690 },
      { t: 1, value: 700 },
      { t: 2, value: 706 },
      { t: 3, value: 712 },
      { t: 4, value: 718 },
      { t: 5, value: 723 },
      { t: 6, value: 730 },
      { t: 7, value: 736 },
      { t: 8, value: 742 },
      { t: 9, value: 748 },
    ],
    5: [
      { t: 0, value: 180 },
      { t: 1, value: 240 },
      { t: 2, value: 320 },
      { t: 3, value: 410 },
      { t: 4, value: 480 },
      { t: 5, value: 560 },
      { t: 6, value: 620 },
      { t: 7, value: 680 },
      { t: 8, value: 720 },
      { t: 9, value: 748 },
    ],
    15: [
      { t: 0, value: 120 },
      { t: 1, value: 180 },
      { t: 2, value: 250 },
      { t: 3, value: 330 },
      { t: 4, value: 420 },
      { t: 5, value: 510 },
      { t: 6, value: 590 },
      { t: 7, value: 660 },
      { t: 8, value: 710 },
      { t: 9, value: 748 },
    ],
  },
}

const xAxisLabels: Record<TrendWindow, Record<number, string>> = {
  1: {
    0: "-1:00",
    2: "-0:45",
    4: "-0:30",
    6: "-0:15",
    9: "сейчас",
  },
  5: {
    0: "-5:00",
    2: "-3:45",
    4: "-2:30",
    6: "-1:15",
    9: "сейчас",
  },
  15: {
    0: "-15:00",
    2: "-11:15",
    4: "-7:30",
    6: "-3:45",
    9: "сейчас",
  },
}

export function SpeedTrendChart({
  metric,
  windowMinutes,
}: {
  metric: TrendMetric
  windowMinutes: TrendWindow
}) {
  const fillId = React.useId().replace(/:/g, "")
  const meta = trendMeta[metric]
  const data = trendData[metric][windowMinutes]
  const tickLabels = xAxisLabels[windowMinutes]

  const formatTooltipLabel = (
    label: React.ReactNode,
    payload?: ReadonlyArray<{ payload?: { t?: number } }>,
  ) => {
    const pointTick = payload?.[0]?.payload?.t
    if (typeof pointTick === "number" && Number.isFinite(pointTick)) {
      return tickLabels[pointTick] ?? `Шаг ${pointTick}`
    }

    if (typeof label === "number" && Number.isFinite(label)) {
      return tickLabels[label] ?? `Шаг ${label}`
    }

    if (typeof label === "string") {
      const trimmed = label.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }

    return "—"
  }

  const chartConfig = {
    value: {
      label: meta.label,
      color: meta.color,
    },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[160px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[#64748B] [&_.recharts-cartesian-axis-tick_text]:text-[9px] [&_.recharts-cartesian-axis-tick_text]:font-sans"
      initialDimension={{ width: 640, height: 160 }}
    >
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#1E2640"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="t"
          type="number"
          domain={[0, 9]}
          ticks={[0, 2, 4, 6, 9]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => {
            const parsed = Number(v)
            return Number.isFinite(parsed) ? tickLabels[parsed] ?? "" : ""
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
          cursor={{ stroke: "#1E2640", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              className="border-[#1E2640] bg-[#0D1220] text-[#E2E8F0]"
              labelFormatter={(label, payload) =>
                formatTooltipLabel(
                  label,
                  payload as ReadonlyArray<{ payload?: { t?: number } }>,
                )
              }
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
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill="none"
                  stroke={meta.color}
                  strokeOpacity={0.4}
                />
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
