"use client";

import { useMemo } from "react";
import { Card, Typography, Space, Tooltip, Tag, Empty, Tabs } from "antd";
import {
  BarChartOutlined,
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
  ReferenceLine,
  Cell,
} from "recharts";

const { Text } = Typography;

const COLORS = {
  positive: "#3b82f6",
  negative: "#ef4444",
  neutral: "#94a3b8",
};

/**
 * Part-Worth Utilities Panel
 *
 * Visualises the MNL β weights as a horizontal bar chart.
 * Positive β  → feature level increases probability of being chosen
 * Negative β  → feature level decreases probability
 *
 * Props:
 *  - partWorths: { overall: { [key]: number }, bySegment: { [segId]: { [key]: number } } }
 *  - features: Feature[]
 *  - segments: AgentSegment[]
 */
export function PartWorthPanel({ partWorths, features = [], segments = [] }) {
  const overallData = useMemo(() => {
    if (!partWorths?.overall) return [];
    return Object.entries(partWorths.overall)
      .map(([key, value]) => ({
        key,
        label: formatKeyLabel(key, features),
        value: Math.round(value * 1000) / 1000,
        absValue: Math.abs(value),
      }))
      .sort((a, b) => b.absValue - a.absValue);
  }, [partWorths, features]);

  const segmentTabs = useMemo(() => {
    if (!partWorths?.bySegment) return [];
    return Object.entries(partWorths.bySegment).map(([segId, weights]) => {
      const seg = segments.find((s) => s.segmentId === segId);
      const data = Object.entries(weights)
        .map(([key, value]) => ({
          key,
          label: formatKeyLabel(key, features),
          value: Math.round(value * 1000) / 1000,
          absValue: Math.abs(value),
        }))
        .sort((a, b) => b.absValue - a.absValue);
      return { segId, label: seg?.label || segId, data };
    });
  }, [partWorths, features, segments]);

  if (overallData.length === 0) {
    return (
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>Part-Worth Utilities</span>
          </Space>
        }
        style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
      >
        <Empty description="Not enough data to estimate utilities (need 5+ responses)" />
      </Card>
    );
  }

  const maxAbsValue = Math.max(...overallData.map((d) => d.absValue), 0.1);

  const items = [
    {
      key: "overall",
      label: "Overall",
      children: (
        <UtilityChart
          data={overallData}
          maxAbsValue={maxAbsValue}
        />
      ),
    },
    ...segmentTabs.map((seg) => ({
      key: seg.segId,
      label: seg.label,
      children: (
        <UtilityChart
          data={seg.data}
          maxAbsValue={Math.max(...seg.data.map((d) => d.absValue), 0.1)}
        />
      ),
    })),
  ];

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>Part-Worth Utilities</span>
          <Tooltip title="Estimated preference weights (β) from a multinomial logit model. Positive values increase the probability of an alternative being chosen; negative values decrease it.">
            <InfoCircleOutlined style={{ color: "#94a3b8" }} />
          </Tooltip>
        </Space>
      }
      style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
    >
      <Tabs items={items} size="small" />
    </Card>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function UtilityChart({ data, maxAbsValue }) {
  const chartHeight = Math.max(data.length * 40, 200);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Space size="large">
          <Tag color="blue" bordered={false}>
            <span style={{ fontWeight: 600 }}>Positive</span> = increases choice probability
          </Tag>
          <Tag color="red" bordered={false}>
            <span style={{ fontWeight: 600 }}>Negative</span> = decreases choice probability
          </Tag>
        </Space>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 40, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            domain={[-maxAbsValue * 1.1, maxAbsValue * 1.1]}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
            width={110}
          />
          <RTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 14px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    {d.label}
                  </Text>
                  <Text>
                    β = <span style={{ fontWeight: 700, color: d.value >= 0 ? COLORS.positive : COLORS.negative }}>{d.value.toFixed(3)}</span>
                  </Text>
                </div>
              );
            }}
          />
          <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={24}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={d.value >= 0 ? COLORS.positive : COLORS.negative}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

function formatKeyLabel(key, features) {
  // key might be "price" or "brand:Nike" (one-hot)
  const parts = key.split(":");
  const baseKey = parts[0];
  const feat = features.find((f) => f.key === baseKey);
  const baseLabel = feat?.label || baseKey;
  if (parts.length > 1) {
    return `${baseLabel}: ${parts[1]}`;
  }
  return baseLabel;
}
