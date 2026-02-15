"use client";

import { useMemo } from "react";
import { Card, Typography, Space, Tooltip, Tag } from "antd";
import {
  DollarOutlined,
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

/**
 * Willingness-to-Pay Panel
 *
 * Shows WTP_k = -β_k / β_price for each non-price feature.
 * Only renders if a price/cost feature was detected.
 *
 * Props:
 *  - wtp: { priceFeature: string, priceUnit: string, values: { [key]: number } } | null
 *  - features: Feature[]
 */
export function WTPPanel({ wtp, features = [] }) {
  const chartData = useMemo(() => {
    if (!wtp?.values) return [];
    return Object.entries(wtp.values)
      .map(([key, value]) => ({
        key,
        label: formatKeyLabel(key, features),
        value: Math.round(value * 100) / 100,
        absValue: Math.abs(value),
      }))
      .sort((a, b) => b.absValue - a.absValue);
  }, [wtp, features]);

  if (!wtp || chartData.length === 0) {
    return null; // Don't show panel if no price feature
  }

  const maxAbs = Math.max(...chartData.map((d) => d.absValue), 0.1);
  const unit = wtp.priceUnit || "units";

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          <span>Willingness to Pay</span>
          <Tooltip title={`Estimated amount (in ${unit}) agents would trade for a 1-unit improvement in each feature. Calculated as WTP_k = -β_k / β_price.`}>
            <InfoCircleOutlined style={{ color: "#94a3b8" }} />
          </Tooltip>
        </Space>
      }
      style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          How much (in <Tag bordered={false} style={{ margin: 0 }}>{unit}</Tag>) agents implicitly &quot;trade&quot; for each feature improvement.
        </Text>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(chartData.length * 44, 200)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 40, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            domain={[-maxAbs * 1.15, maxAbs * 1.15]}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`}
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
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    {d.label}
                  </Text>
                  <Text>
                    WTP = <span style={{ fontWeight: 700, color: d.value >= 0 ? "#10b981" : "#ef4444" }}>
                      {d.value >= 0 ? "+" : ""}{d.value.toFixed(2)} {unit}
                    </span>
                  </Text>
                </div>
              );
            }}
          />
          <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={22}>
            {chartData.map((d) => (
              <Cell
                key={d.key}
                fill={d.value >= 0 ? "#10b981" : "#ef4444"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <strong>Interpretation:</strong> A WTP of +50 {unit} for &quot;Brand&quot; means agents value a one-unit
          brand improvement equivalently to saving 50 {unit} in price. Negative values indicate
          features that agents would need to be compensated for.
        </Text>
      </div>
    </Card>
  );
}

function formatKeyLabel(key, features) {
  const parts = key.split(":");
  const baseKey = parts[0];
  const feat = features.find((f) => f.key === baseKey);
  const baseLabel = feat?.label || baseKey;
  if (parts.length > 1) return `${baseLabel}: ${parts[1]}`;
  return baseLabel;
}
