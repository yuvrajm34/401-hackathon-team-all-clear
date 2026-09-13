"use client";

import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

import { cn } from "@/lib/cn";

export function Sparkline({
  values,
  labels,
  className,
  label,
}: {
  values: number[];
  labels?: string[];
  className?: string;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();
  const data = values.map((value, index) => ({
    index,
    value,
    name: labels?.[index] ?? "",
  }));

  return (
    <div
      className={cn("h-16 w-full text-brand", className)}
      role="img"
      aria-label={label}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: labels ? 2 : 0, left: 4 }}
        >
          {labels ? (
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fill: "var(--ink-muted)", fontSize: 10 }}
            />
          ) : null}
          <Bar
            dataKey="value"
            fill="currentColor"
            radius={[8, 8, 8, 8]}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
