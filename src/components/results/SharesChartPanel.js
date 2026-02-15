"use client";

import { useMemo } from "react";
import { Card, Typography, Space, Tabs, Empty } from "antd";
import { PieChartOutlined } from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const { Text } = Typography;

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#6366f1", "#ef4444",
  "#14b8a6", "#a855f7",
];

/**
 * Enhanced Shares Panel with real Pie + Bar charts
 *
 * Props:
 *  - shares: { overall, bySegment }
 *  - alternatives: Alternative[]
 *  - segments: AgentSegment[]
 */
export function SharesChartPanel({ shares, alternatives = [], segments = [] }) {
  const altNames = useMemo(() => {
    const m = {};
    alternatives.forEach((a) => { m[a.id] = a.name || a.id; });
    return m;
  }, [alternatives]);

  // Pie data for overall
  const pieData = useMemo(() => {
    if (!shares?.overall) return [];
    return Object.entries(shares.overall)
      .filter(([id]) => id !== "NONE")
      .map(([id, share], i) => ({
        name: altNames[id] || id,
        value: Math.round(share * 1000) / 10,
        fill: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [shares, altNames]);

  // Bar data for segment comparison
  const segBarData = useMemo(() => {
    if (!shares?.bySegment) return [];
    return segments.map((seg) => {
      const segShares = shares.bySegment[seg.segmentId] || {};
      const entry = { segment: seg.label || seg.segmentId };
      alternatives.forEach((alt) => {
        entry[alt.id] = Math.round((segShares[alt.id] || 0) * 1000) / 10;
      });
      return entry;
    });
  }, [shares, segments, alternatives]);

  if (pieData.length === 0) {
    return (
      <Card
        title={<Space><PieChartOutlined /><span>Choice Shares</span></Space>}
        style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
      >
        <Empty description="No share data" />
      </Card>
    );
  }

  const items = [
    {
      key: "donut",
      label: "Overall",
      children: (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => (value > 0 ? `${name} ${value}%` : null)}
              labelLine={{ stroke: "#94a3b8" }}
            >
              {pieData.map((d) => (
                <Cell key={d.name} fill={d.fill} strokeWidth={0} />
              ))}
            </Pie>
            <RTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    <Text strong>{d.name}</Text>
                    <br />
                    <Text style={{ color: d.fill, fontWeight: 700 }}>{d.value}%</Text>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => <Text style={{ fontSize: 13 }}>{value}</Text>}
            />
          </PieChart>
        </ResponsiveContainer>
      ),
    },
  ];

  if (segBarData.length > 0) {
    items.push({
      key: "segments",
      label: "By Segment",
      children: (
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Choice share comparison across segments (%).
          </Text>
          <ResponsiveContainer width="100%" height={Math.max(segBarData.length * 56, 250)}>
            <BarChart data={segBarData} layout="vertical" margin={{ left: 100, right: 20, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="segment" tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }} width={90} />
              <RTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                      <Text strong style={{ display: "block", marginBottom: 6 }}>{label}</Text>
                      {payload.map((p) => (
                        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: p.fill }} />
                          <Text>{altNames[p.dataKey] || p.dataKey}: <strong>{p.value}%</strong></Text>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {alternatives.map((alt, i) => (
                <Bar key={alt.id} dataKey={alt.id} fill={PALETTE[i % PALETTE.length]} radius={[0, 4, 4, 0]} maxBarSize={20} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    });
  }

  return (
    <Card
      title={<Space><PieChartOutlined /><span>Choice Shares</span></Space>}
      style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
    >
      <Tabs items={items} size="small" />
    </Card>
  );
}
