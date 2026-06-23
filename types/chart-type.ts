export type ChartType =
  | "pie"
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "bubble"
  | "donut"
  | "horizontalBar"
  | "stackedBar"
  | "groupedBar"
  | "radar"
  | "multiLine"
  | "histogram"
  | "boxPlot"
  | "heatmap"
  | "composed";

export type ChartCardData = {
  title: string;
  caption: string;
  data: any;
  dataKeys?: string[];
};
