"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TrendChart({
  data,
  labelKey = "date",
}: {
  data: { [key: string]: string | number }[];
  labelKey?: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e9eef3" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="present" fill="#245b72" radius={[5, 5, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DepartmentChart({ data }: { data: { department: string; present: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 12, bottom: 0 }}>
          <CartesianGrid stroke="#e9eef3" strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis dataKey="department" type="category" width={85} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="present" fill="#3f8695" radius={[0, 5, 5, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PresenceChart({ present, absent }: { present: number; absent: number }) {
  const data = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
  ];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
          >
            {data.map((item, index) => (
              <Cell key={item.name} fill={index === 0 ? "#245b72" : "#dce7eb"} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
