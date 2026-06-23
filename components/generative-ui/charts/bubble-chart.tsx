"use client";

import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import ChartButton from "@/components/custom/chart-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface BubbleChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value?: number;
    x?: number;
    y?: number;
    z?: number;
    size?: number;
    fill: string;
  }[];
  noAddButton?: boolean;
}

export function BubbleChartCard({
  title,
  caption,
  data,
  noAddButton,
}: BubbleChartProps) {
  const bubbleData = data.map((item, index) => ({
    x: item.x ?? index,
    y: item.y ?? item.value ?? 0,
    z: item.z ?? item.size ?? item.value ?? 1,
    name: item.label,
    fill: item.fill,
  }));

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" name="x" />
              <YAxis type="number" dataKey="y" name="y" />
              <ZAxis type="number" dataKey="z" range={[80, 900]} name="size" />
              <ChartTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ChartTooltipContent />}
              />
              <Scatter data={bubbleData} dataKey="y">
                {bubbleData.map((entry, index) => (
                  <Cell key={`bubble-${entry.name}-${index}`} fill={entry.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "bubble",
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
