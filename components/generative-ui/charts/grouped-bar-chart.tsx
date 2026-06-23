"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis } from "recharts";

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

interface GroupedBarChartProps {
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

export function GroupedBarChartCard({
  title,
  caption,
  data,
  dataKeys,
  noAddButton,
}: GroupedBarChartProps) {
  const keysToRender = dataKeys && dataKeys.length > 0
    ? dataKeys
    : Object.keys(data[0] || {}).filter((key) =>
        key !== "label" &&
        key !== "fill" &&
        data.some((item) => typeof item[key] === "number")
      );

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Legend />
            {keysToRender.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "groupedBar",
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
