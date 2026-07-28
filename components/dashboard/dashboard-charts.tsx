"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";

type Point = { date: string; value: number };

export function ProductionTrendChart({ series }: { series: Point[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Production (30 days)</h2>
      <div className="h-56">
        {series.length === 0 ? (
          <p className="text-sm text-muted">
            No output logged yet. Use Log output after you start an order.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
                <CartesianGrid stroke="rgba(15,27,51,0.08)" />
                <XAxis dataKey="date" tick={{ fill: "#6B7289", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6B7289", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid rgba(15,27,51,0.08)",
                    borderRadius: 12,
                    color: "#0F1B33",
                  }}
                />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#5B5CE2"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
