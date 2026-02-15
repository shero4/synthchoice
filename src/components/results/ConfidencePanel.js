"use client";

import { useMemo } from "react";
import { Card, Typography, Space, Tooltip, Empty } from "antd";
import {
  SafetyOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ErrorBar,
  Cell,
} from "recharts";

const { Text } = Typography;

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#6366f1", "#ef4444",
];

/**
 * Confidence / Bootstrap Intervals Panel
 *
 * Shows each alternative's mean share with a 90 % CI error bar.
 *
 * Props:
 *  - confidence: { [altId]: { lo, hi, mean } }
 *  - shares: { overall: { [altId]: number } }
 *  - alternatives: Alternative[]
 *  - responseStats: { totalResponses, noneCount, noneRate, avgConfidence }
 */
export function ConfidencePanel({
  confidence,
  shares,
  alternatives = [],
  responseStats,
}) {
  const chartData = useMemo(() => {
    if (!confidence) return [];
    return alternatives
      .map((alt, i) => {
        const ci = confidence[alt.id];
        if (!ci) return null;
        const share = shares?.overall?.[alt.id] ?? ci.mean;
        return {
          name: alt.name || alt.id,
          share: Math.round(share * 1000) / 10,
          lo: Math.round(ci.lo * 1000) / 10,
          hi: Math.round(ci.hi * 1000) / 10,
          errorLow: Math.round((share - ci.lo) * 1000) / 10,
          errorHigh: Math.round((ci.hi - share) * 1000) / 10,
          color: PALETTE[i % PALETTE.length],
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.share - a.share);
  }, [confidence, shares, alternatives]);

  if (chartData.length === 0) {
    return (
      <Card
        title={<Space><SafetyOutlined /><span>Confidence Intervals</span></Space>}
        style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
      >
        <Empty description="No confidence data" />
      </Card>
    );
  }

  const stats = responseStats || {};

  return (
    <Card
      title={
        <Space>
          <SafetyOutlined />
          <span>Confidence &amp; Stability</span>
          <Tooltip title="90% bootstrap confidence intervals for choice shares. Narrower intervals indicate more stable estimates.">
            <InfoCircleOutlined style={{ color: "#94a3b8" }} />
          </Tooltip>
        </Space>
      }
      style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
    >
      {/* Quick stats row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          padding: "12px 16px",
          background: "#f8fafc",
          borderRadius: 10,
        }}
      >
        <StatPill label="Total Responses" value={stats.totalResponses ?? "—"} />
        <StatPill label="None Rate" value={stats.noneRate != null ? `${(stats.noneRate * 100).toFixed(1)}%` : "—"} />
        <StatPill label="Avg Confidence" value={stats.avgConfidence != null ? `${(stats.avgConfidence * 100).toFixed(0)}%` : "—"} />
      </div>

      <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
        Choice share with 90% bootstrap confidence interval (200 resamples).
      </Text>

      <ResponsiveContainer width="100%" height={Math.max(chartData.length * 56, 200)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 30, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
            width={90}
          />
          <RTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>{d.name}</Text>
                  <Text>Share: <strong>{d.share}%</strong></Text>
                  <br />
                  <Text type="secondary">
                    90% CI: [{d.lo}% – {d.hi}%]
                  </Text>
                </div>
              );
            }}
          />
          <Bar dataKey="share" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((d) => (
              <Cell key={d.name} fill={d.color} fillOpacity={0.85} />
            ))}
            <ErrorBar
              dataKey="errorHigh"
              direction="right"
              width={6}
              stroke="#334155"
              strokeWidth={1.5}
            />
            <ErrorBar
              dataKey="errorLow"
              direction="left"
              width={6}
              stroke="#334155"
              strokeWidth={1.5}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

function StatPill({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>{label}</Text>
      <Text strong style={{ fontSize: 16 }}>{value}</Text>
    </div>
  );
}
