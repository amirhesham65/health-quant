import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";
import { getChatDatabase } from "@/db/repositories/databases";

// LLM tools
import { generateSqlWriteExecuteTool } from "./_lib/tools/sql-write-execute";

// Context management functions
function estimateTokenCount(messages: any[]): number {
  let totalTokens = 0;
  for (const message of messages) {
    if (typeof message.content === "string") {
      totalTokens += Math.ceil(message.content.length / 3.5);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "text" && typeof part.text === "string") {
          totalTokens += Math.ceil(part.text.length / 3.5);
        }
      }
    }
    // Account for message metadata
    totalTokens += 15;
  }
  return totalTokens;
}

function manageContext(messages: any[], maxContextTokens: number = 100000) {
  let currentMessages = [...messages];
  let estimatedTokens = estimateTokenCount(currentMessages);
  if (estimatedTokens <= maxContextTokens) {
    return currentMessages;
  }

  console.log(
    `Context management: ${estimatedTokens} tokens, limit: ${maxContextTokens}`,
  );

  const systemMessage =
    currentMessages[0]?.role === "system" ? currentMessages[0] : null;

  if (systemMessage) {
    const nonSystemMessages = currentMessages.slice(1);
    let keptMessages = [systemMessage];
    let runningTokens = estimateTokenCount([systemMessage]);

    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const messageTokens = estimateTokenCount([nonSystemMessages[i]]);

      if (runningTokens + messageTokens <= maxContextTokens) {
        keptMessages.splice(1, 0, nonSystemMessages[i]);
        runningTokens += messageTokens;
      } else {
        break;
      }
    }

    currentMessages = keptMessages;
  } else {
    let keptMessages = [];
    let runningTokens = 0;

    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const messageTokens = estimateTokenCount([currentMessages[i]]);

      if (runningTokens + messageTokens <= maxContextTokens) {
        keptMessages.unshift(currentMessages[i]);
        runningTokens += messageTokens;
      } else {
        break;
      }
    }
    currentMessages = keptMessages;
  }

  // Only truncate individual messages if we're still over limit
  estimatedTokens = estimateTokenCount(currentMessages);
  if (estimatedTokens > maxContextTokens) {
    // Truncate the longest non-system messages first
    currentMessages = currentMessages.map((msg, index) => {
      if (msg.role === "system") return msg;

      if (typeof msg.content === "string" && msg.content.length > 5000) {
        return {
          ...msg,
          content:
            msg.content.substring(0, 4000) +
            "\n\n...[Message truncated for context management]",
        };
      }
      return msg;
    });
  }

  const finalTokens = estimateTokenCount(currentMessages);
  console.log(
    `Context after management: ${finalTokens} tokens (${currentMessages.length} messages)`,
  );

  return currentMessages;
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { id, messages }: { id: string; messages: Array<Message> } = body;

    // INPUT VALIDATION
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return new Response("Invalid chat ID", { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid messages format", { status: 400 });
    }

    // ABUSE PREVENTION: Limit message length and frequency
    if (messages.length > 100) {
      // Increased from 50 since we can handle more context
      return new Response("Too many messages in request", { status: 400 });
    }

    // AUTHENTICATION
    const session = await auth();
    if (!session || !session.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // PROCESS MESSAGES
    const coreMessages = convertToCoreMessages(messages).filter(
      (message) => message.content.length > 0,
    );

    const managedMessages = manageContext(coreMessages, 100000);

    // DATABASE ACCESS
    const database = await getChatDatabase(id);
    if (!database) {
      return new Response("Database not found", { status: 404 });
    }

    // SECURITY: Validate database access permissions
    // Add additional database access validation here if needed

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      temperature: 0.5,
      system: `
          You are a data analysis expert providing concise, direct answers. You have access to a database called "${database.name}" which is described as: "${database.description}". It's a ${database.type} database.

          You have access to the full conversation history to maintain context about:
          - Previous queries and their results
          - Ongoing analysis threads
          - User preferences and requirements
          - Database schema discoveries

          CRITICAL SAFETY RULES - ALWAYS FOLLOW THESE:
          1. NEVER expose sensitive information like passwords, API keys, personal identifiers, or connection strings
          2. NEVER execute queries that could modify, delete, or insert data (only SELECT statements)
          3. NEVER reveal database connection details, credentials, or storage URLs
          4. User-facing schema discovery is allowed: you may list normal application tables, columns, and relationships from the connected database when the user asks
          5. If asked about system tables, internal SQLite/Postgres metadata tables, hidden schemas, or implementation internals, politely decline
          6. If a query fails, explain the issue without revealing internal error details
          7. Always validate that your analysis is based on actual data returned from queries
          8. If no data is found, clearly state "No data available" rather than making assumptions

          CONTEXT AWARENESS:
          - Reference previous queries and results when relevant
          - Build upon earlier analysis
          - Remember user's specific interests and requirements
          - Maintain consistency in your analysis approach

          RESPONSE STYLE:
          - Be brief by default: answer in 1-3 short paragraphs or a compact bullet list
          - Lead with the result, not process commentary
          - Include only the numbers, fields, and caveats needed to answer the question
          - Do not add generic closing offers like "let me know if you need more details", "feel free to ask", or "if you have a specific query"
          - Never end with an invitation to continue the conversation
          - Ask a follow-up question only when required to proceed

          WORKFLOW - FOLLOW THIS EXACT SEQUENCE:
          1. Write and execute a SQL query using the "writeExecuteQuery" tool
            - For scatter plots and large datasets: ALWAYS use LIMIT (e.g., LIMIT 50-100)
            - Use aggregation (GROUP BY, AVG, SUM, COUNT) when possible for better insights
          2. Analyze the actual results returned - do not make assumptions about data not returned
          3. Provide concise explanations based ONLY on the query results
          4. If visualization would help understanding, create appropriate charts using "showChart"
          5. Always cite the specific data points you're discussing

          CHARTING INSTRUCTIONS:
          - For single-series charts (pie, bar, horizontalBar, donut, radar, histogram), use the 'value' key for data points.
          - For multi-series charts (area, stackedBar, groupedBar, multiLine, composed), use descriptive numeric keys (e.g., 'revenue', 'quantity') and provide these keys in the 'dataKeys' array.
          - Example for a multi-area chart: dataKeys: ['revenue', 'quantity'], data: [{ label: 'Jan', revenue: 100, quantity: 10 }, ...]
          - For scatter charts, use numeric x and y fields.
          - For bubble charts, use numeric x, y, and z or size fields.
          - For boxPlot charts, use min, q1, median, q3, and max fields for each label.
          - For heatmap charts, use x, y, and value fields.
          
          STACKED BAR CHART SPECIFIC RULES:
          - For stacked bar charts, ensure your SQL query returns multiple numeric columns that represent different segments
          - Structure data like: [{ label: 'Category A', segment1: 30, segment2: 20, segment3: 15 }, { label: 'Category B', segment1: 25, segment2: 35, segment3: 10 }]
          - Always provide dataKeys array: ['segment1', 'segment2', 'segment3']
          - Each row represents ONE bar with multiple colored segments stacked on top of each other
          - Example: For sales by region and quarter, query should return: label (region), q1_sales, q2_sales, q3_sales, q4_sales
          
          CHART DATA OPTIMIZATION:
          - Keep data points under 100 for performance and context management
          - For scatter plots, sample or aggregate data meaningfully
          - Truncate long labels to keep charts readable
        `,
      messages: managedMessages,
      maxSteps: 5,
      tools: {
        writeExecuteQuery: await generateSqlWriteExecuteTool(database),

        showChart: {
          description:
            "Show various types of charts when relevant to the question or can add to the understanding of the user",
          parameters: z.object({
            type: z
              .enum([
                "pie",
                "bar",
                "line",
                "area",
                "scatter",
                "bubble",
                "donut",
                "horizontalBar",
                "stackedBar",
                "groupedBar",
                "radar",
                "multiLine",
                "histogram",
                "boxPlot",
                "heatmap",
                "composed",
              ])
              .describe("The type of chart to display"),
            title: z.string().describe("The title of the chart"),
            caption: z.string().describe("The caption of the chart"),
            dataKeys: z
              .array(z.string())
              .optional()
              .describe(
                "Array of keys to plot for multi-series charts, e.g., ['revenue', 'quantity']",
              ),
            data: z
              .array(
                z.record(z.string(), z.any()), // Allows any object structure, e.g., { month: 'Jan', revenue: 100, quantity: 10 }
              )
              .max(100),
          }),
          execute: async ({ type, title, caption, data, dataKeys }) => {
            const limitedData = data.slice(0, 100);

            interface ChartDataItem {
              label: string;
              value: number;
              value2?: number;
              value3?: number;
              x?: number;
              y?: number;
              z?: number;
              size?: number;
              min?: number;
              q1?: number;
              median?: number;
              q3?: number;
              max?: number;
              values?: number[];
              fill?: string;
              [key: string]: any;
            }

            interface ProcessedChartDataItem {
              label: string;
              value?: number;
              value2?: number;
              value3?: number;
              x?: string | number;
              y?: string | number;
              z?: number;
              size?: number;
              min?: number;
              q1?: number;
              median?: number;
              q3?: number;
              max?: number;
              values?: number[];
              fill?: string;
              [key: string]: any;
            }

            const reservedKeys = new Set([
              "label",
              "fill",
              "value",
              "value2",
              "value3",
              "x",
              "y",
              "z",
              "size",
              "min",
              "q1",
              "median",
              "q3",
              "max",
              "values",
            ]);
            const multiSeriesChartTypes = new Set([
              "area",
              "stackedBar",
              "groupedBar",
              "multiLine",
              "composed",
            ]);

            const processedData: ProcessedChartDataItem[] = limitedData.map(
              (item: ChartDataItem, index: number): ProcessedChartDataItem => {
                const entries = Object.entries(item);
                const inferredLabelEntry = entries.find(
                  ([key, value]) =>
                    key !== "fill" &&
                    !key.toLowerCase().endsWith("id") &&
                    value !== null &&
                    value !== undefined &&
                    typeof value !== "number",
                );
                const labelValue =
                  item.label ?? inferredLabelEntry?.[1] ?? `Item ${index + 1}`;
                const labelText = labelValue.toString();
                const truncatedLabel: string =
                  labelText.length > 25
                    ? labelText.substring(0, 25) + "..."
                    : labelText;
                const inferredNumericEntry = entries.find(
                  ([key, value]) =>
                    !reservedKeys.has(key) && typeof value === "number",
                );
                const inferredValue = item.value ?? inferredNumericEntry?.[1];

                const baseItem: ProcessedChartDataItem = {
                  label: truncatedLabel,
                  fill:
                    item.fill ||
                    `hsl(${(index * 360) / limitedData.length}, 70%, 50%)`,
                };

                if (type === "scatter") {
                  return {
                    ...baseItem,
                    x: item.x ?? inferredValue,
                    y: item.y ?? inferredValue,
                  };
                }

                if (type === "bubble") {
                  return {
                    ...baseItem,
                    x: item.x ?? inferredValue,
                    y: item.y ?? inferredValue,
                    z: item.z ?? item.size ?? inferredValue,
                  };
                }

                if (type === "heatmap") {
                  return {
                    label: truncatedLabel,
                    x: item.x ?? item.column ?? item.category ?? truncatedLabel,
                    y: item.y ?? item.row ?? item.group ?? "Value",
                    value: inferredValue,
                  };
                }

                if (type === "boxPlot") {
                  return {
                    ...baseItem,
                    value: inferredValue,
                    values: item.values,
                    min: item.min,
                    q1: item.q1,
                    median: item.median,
                    q3: item.q3,
                    max: item.max,
                  };
                }

                if (multiSeriesChartTypes.has(type)) {
                  const keysToCopy =
                    dataKeys && dataKeys.length > 0
                      ? dataKeys
                      : entries
                          .filter(
                            ([key, value]) =>
                              !reservedKeys.has(key) &&
                              typeof value === "number",
                          )
                          .map(([key]) => key);

                  keysToCopy.forEach((key: string | number) => {
                    if (item[key] !== undefined) {
                      baseItem[key] = item[key];
                    }
                  });

                  if (
                    type === "stackedBar" ||
                    type === "groupedBar" ||
                    type === "multiLine" ||
                    type === "composed"
                  ) {
                    delete baseItem.fill;
                  }

                  return baseItem;
                }

                const hasMultipleValues =
                  item.value2 !== undefined || item.value3 !== undefined;

                if (type === "stackedBar" && hasMultipleValues) {
                  return {
                    label: truncatedLabel,
                    value: item.value,
                    value2: item.value2,
                    value3: item.value3,
                  };
                }

                return {
                  ...baseItem,
                  value: inferredValue,
                  value2: item.value2,
                  value3: item.value3,
                };
              },
            );

            const inferredDataKeys =
              dataKeys ??
              (processedData[0]
                ? Object.keys(processedData[0]).filter(
                    (key) =>
                      !reservedKeys.has(key) &&
                      typeof processedData[0][key] === "number",
                  )
                : undefined);
            const wasLimited = data.length > 100;
            const finalCaption = wasLimited
              ? `${caption} (Showing first 100 of ${data.length} data points)`
              : caption;

            return {
              type,
              title,
              caption: finalCaption,
              data: processedData,
              dataKeys: inferredDataKeys,
            };
          },
        },
        getWeather: {
          description: "Get the current weather at a location",
          parameters: z.object({
            latitude: z.number().describe("Latitude coordinate"),
            longitude: z.number().describe("Longitude coordinate"),
          }),
          execute: async ({ latitude, longitude }) => {
            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
            );
            return await response.json();
          },
        },
      },
      onFinish: async ({ responseMessages }) => {
        if (session.user?.id) {
          try {
            await saveChat({
              id,
              messages: [...managedMessages, ...responseMessages],
              userId: session.user.id,
            });
          } catch (error) {
            console.error("Failed to save chat:", error);
          }
        }
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "stream-text",
      },
    });

    // RATE LIMITING: Add rate limiting headers to response
    const response = result.toDataStreamResponse({});
    response.headers.set("X-RateLimit-Limit", "100");
    response.headers.set("X-RateLimit-Remaining", "99"); // This should be calculated based on user/IP

    return response;
  } catch (error) {
    console.error("API Error:", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    if (!session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const chat = await getChatById({ id, userId: session.user.id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
