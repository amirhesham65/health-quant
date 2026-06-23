"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  XAxis,
  YAxis,
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

interface ComposedChartCardProps {
  title: string;
  caption: string;
  data: {
    label: string;
    fill?: string;
    [key: string]: any;
  }[];
  dataKeys?: string[];
  noAddButton?: boolean;
}

const colors = ["#ed618e", "#415dcc", "#82ca9d", "#ff7c7c", "#8dd1e1", "#ffc658"];

export function ComposedChartCard({
  title,
  caption,
  data,
  dataKeys,
  noAddButton,
}: ComposedChartCardProps) {
  const keysToRender = dataKeys && dataKeys.length > 0
    ? dataKeys
    : Object.keys(data[0] || {}).filter((key) =>
        key !== "label" &&
        key !== "fill" &&
        data.some((item) => typeof item[key] === "number")
      );
  const barKey = keysToRender[0] ?? "value";
  const lineKeys = keysToRender.slice(1);

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ComposedChart accessibilityLayer data={data} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <YAxis />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Legend />
            <Bar dataKey={barKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
            {lineKeys.map((key, index) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={colors[(index + 1) % colors.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "composed",
              title,
              caption,
              data,
              dataKeys: keysToRender,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
