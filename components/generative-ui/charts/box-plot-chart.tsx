"use client";

import ChartButton from "@/components/custom/chart-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BoxPlotDatum {
  label: string;
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  value?: number;
  values?: number[];
  fill?: string;
}

interface BoxPlotChartProps {
  title: string;
  caption: string;
  data: BoxPlotDatum[];
  noAddButton?: boolean;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function normalizeBoxDatum(item: BoxPlotDatum) {
  if (
    item.min !== undefined &&
    item.q1 !== undefined &&
    item.median !== undefined &&
    item.q3 !== undefined &&
    item.max !== undefined
  ) {
    return item as Required<Pick<BoxPlotDatum, "label" | "min" | "q1" | "median" | "q3" | "max">> & BoxPlotDatum;
  }

  const rawValues = item.values && item.values.length > 0
    ? item.values
    : item.value !== undefined
      ? [item.value]
      : [0];

  return {
    ...item,
    min: Math.min(...rawValues),
    q1: percentile(rawValues, 0.25),
    median: percentile(rawValues, 0.5),
    q3: percentile(rawValues, 0.75),
    max: Math.max(...rawValues),
  };
}

export function BoxPlotChartCard({
  title,
  caption,
  data,
  noAddButton,
}: BoxPlotChartProps) {
  const boxes = data.map(normalizeBoxDatum);
  const allValues = boxes.flatMap((item) => [item.min, item.q1, item.median, item.q3, item.max]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const span = maxValue - minValue || 1;
  const chartWidth = 520;
  const chartHeight = 260;
  const left = 52;
  const right = 24;
  const top = 24;
  const bottom = 44;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;
  const rowHeight = plotHeight / Math.max(boxes.length, 1);
  const x = (value: number) => left + ((value - minValue) / span) * plotWidth;

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <div className="h-[300px] w-full">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="size-full">
            <line x1={left} x2={chartWidth - right} y1={chartHeight - bottom} y2={chartHeight - bottom} stroke="hsl(var(--border))" />
            <text x={left} y={chartHeight - 18} className="fill-muted-foreground text-[10px]">{minValue.toFixed(1)}</text>
            <text x={chartWidth - right} y={chartHeight - 18} textAnchor="end" className="fill-muted-foreground text-[10px]">{maxValue.toFixed(1)}</text>
            {boxes.map((item, index) => {
              const cy = top + rowHeight * index + rowHeight / 2;
              const boxTop = cy - Math.min(18, rowHeight * 0.28);
              const boxHeight = Math.min(36, rowHeight * 0.56);
              return (
                <g key={`${item.label}-${index}`}>
                  <text x={left - 8} y={cy + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                    {item.label.slice(0, 9)}
                  </text>
                  <line x1={x(item.min)} x2={x(item.max)} y1={cy} y2={cy} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                  <line x1={x(item.min)} x2={x(item.min)} y1={cy - 8} y2={cy + 8} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                  <line x1={x(item.max)} x2={x(item.max)} y1={cy - 8} y2={cy + 8} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                  <rect
                    x={x(item.q1)}
                    y={boxTop}
                    width={Math.max(x(item.q3) - x(item.q1), 2)}
                    height={boxHeight}
                    rx={4}
                    fill={item.fill || "#ed618e"}
                    fillOpacity={0.28}
                    stroke={item.fill || "#ed618e"}
                    strokeWidth={2}
                  />
                  <line x1={x(item.median)} x2={x(item.median)} y1={boxTop} y2={boxTop + boxHeight} stroke={item.fill || "#ed618e"} strokeWidth={2} />
                </g>
              );
            })}
          </svg>
        </div>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "boxPlot",
              title,
              caption,
              data,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
