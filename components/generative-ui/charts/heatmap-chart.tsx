"use client";

import ChartButton from "@/components/custom/chart-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HeatmapDatum {
  label: string;
  x?: string | number;
  y?: string | number;
  value: number;
}

interface HeatmapChartProps {
  title: string;
  caption: string;
  data: HeatmapDatum[];
  noAddButton?: boolean;
}

export function HeatmapChartCard({
  title,
  caption,
  data,
  noAddButton,
}: HeatmapChartProps) {
  const xLabels = Array.from(new Set(data.map((item) => String(item.x ?? item.label))));
  const yLabels = Array.from(new Set(data.map((item) => String(item.y ?? "Value"))));
  const min = Math.min(...data.map((item) => item.value));
  const max = Math.max(...data.map((item) => item.value));
  const span = max - min || 1;
  const cellByKey = new Map(data.map((item) => [`${String(item.x ?? item.label)}::${String(item.y ?? "Value")}`, item]));

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <div className="grid h-[300px] w-full grid-rows-[auto_1fr] gap-2 overflow-hidden text-[10px]">
          <div
            className="grid gap-1 pl-16 text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${xLabels.length}, minmax(0, 1fr))` }}
          >
            {xLabels.map((label) => (
              <div key={label} className="truncate text-center" title={label}>
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[3.75rem_1fr] gap-1 overflow-hidden">
            <div
              className="grid gap-1 text-muted-foreground"
              style={{ gridTemplateRows: `repeat(${yLabels.length}, minmax(0, 1fr))` }}
            >
              {yLabels.map((label) => (
                <div key={label} className="flex items-center justify-end truncate pr-1" title={label}>
                  {label}
                </div>
              ))}
            </div>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${xLabels.length}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${yLabels.length}, minmax(0, 1fr))`,
              }}
            >
              {yLabels.flatMap((yLabel) =>
                xLabels.map((xLabel) => {
                  const item = cellByKey.get(`${xLabel}::${yLabel}`);
                  const intensity = item ? (item.value - min) / span : 0;
                  return (
                    <div
                      key={`${xLabel}-${yLabel}`}
                      className="flex min-h-6 items-center justify-center rounded-sm text-[10px] font-medium text-white"
                      title={item ? `${xLabel}, ${yLabel}: ${item.value}` : `${xLabel}, ${yLabel}: no data`}
                      style={{
                        backgroundColor: item
                          ? `hsl(345 78% ${72 - intensity * 34}%)`
                          : "hsl(var(--muted))",
                      }}
                    >
                      {item?.value ?? ""}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "heatmap",
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
