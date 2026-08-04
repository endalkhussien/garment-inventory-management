"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Pie,
  PieChart,
  Cell,
} from "recharts";

import { Card } from "@/components/ui/card";
import { formatEtb } from "@/lib/format";

const COLORS = ["#3D5A80", "#98C1D9", "#EE6C4D", "#293241", "#E0FBFC", "#6B7289"];

type MoneyPoint = { label: string; revenue: number; cogs: number; profit: number };
type TrendPoint = { date: string; sales: number; expenses: number };
type Slice = { name: string; value: number };

export function FinanceTrendChart({ series }: { series: TrendPoint[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Sales vs expenses</h2>
      <div className="h-56">
        {series.length === 0 ? (
          <p className="text-sm text-muted">No data in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid stroke="rgba(15,27,51,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#6B7289", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6B7289", fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => formatEtb(v)}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(15,27,51,0.08)",
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#3D5A80"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#EE6C4D"
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

export function FinanceShopCompareChart({ rows }: { rows: MoneyPoint[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">By shop</h2>
      <div className="h-56">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Select shops to compare.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid stroke="rgba(15,27,51,0.08)" />
              <XAxis dataKey="label" tick={{ fill: "#6B7289", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6B7289", fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatEtb(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3D5A80" radius={4} />
              <Bar dataKey="profit" name="Gross profit" fill="#98C1D9" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function FinancePieChart({
  title,
  slices,
}: {
  title: string;
  slices: Slice[];
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-56">
        {slices.length === 0 || slices.every((s) => s.value <= 0) ? (
          <p className="text-sm text-muted">No breakdown data.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {slices.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatEtb(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
