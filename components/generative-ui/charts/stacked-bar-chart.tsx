"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

interface StackedBarChartProps {
  title: string;
  caption: string;
  data: {
    label: string;
    value?: number;
    value2?: number;
    value3?: number;
    fill: string;
    [key: string]: any;
  }[];
  dataKeys?: string[];
  noAddButton?: boolean;
}

export function StackedBarChartCard({
  title,
  caption,
  data,
  dataKeys,
  noAddButton,
}: StackedBarChartProps) {
  const getSegmentColor = (index: number) => {
    const colors = ["#ed618e", "#415dcc", "#82ca9d", "#ff7c7c", "#8dd1e1"];
    return colors[index % colors.length];
  };
  const keysToRender = dataKeys && dataKeys.length > 0
    ? dataKeys
    : Object.keys(data[0] || {}).filter((key) =>
        key !== "label" &&
        key !== "fill" &&
        data.some((item) => typeof item[key] === "number")
      );

  const hasStackedData = keysToRender.length > 1;

  return (
    <Card className="flex flex-col size-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent className="relative p-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
          <BarChart 
            accessibilityLayer 
            data={data}
            margin={{
              left: 20,
              right: 20,
              top: 20,
              bottom: 20,
            }}
          >
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
            {keysToRender.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="stack"
                radius={
                  index === 0 
                    ? [0, 0, 4, 4]
                    : index === keysToRender.length - 1 
                    ? [4, 4, 0, 0]
                    : [0, 0, 0, 0]
                }
                fill={getSegmentColor(index)}
              />
            ))}
            
            {/* If no stacked data, show a single bar */}
            {!hasStackedData && (
              <Bar
                dataKey="value"
                radius={[4, 4, 4, 4]}
                fill={getSegmentColor(0)}
              />
            )}
          </BarChart>
        </ChartContainer>
        {!noAddButton && (
          <ChartButton
            className="absolute bottom-2 right-2"
            chart={{
              type: "stackedBar",
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
