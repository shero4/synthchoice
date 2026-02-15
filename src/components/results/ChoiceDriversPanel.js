"use client";

import { useMemo, useState } from "react";
import { Card, Typography, Space, Tooltip, Tabs, Tag, Empty } from "antd";
import {
  ThunderboltOutlined,
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
  Treemap,
} from "recharts";

const { Text } = Typography;

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#6366f1", "#ef4444",
  "#14b8a6", "#a855f7",
];

/**
 * Choice Drivers Panel
 *
 * Two views:
 *   1. Heatmap-style stacked bars:  Features × Alternatives
 *      "For each alternative, which features drove the choice?"
 *
 *   2. Top Drivers summary: ranked list of feature→alternative combos
 *
 * Props:
 *  - choiceDrivers: { altFeatureCounts, heatmap, topDrivers, coOccurrence }
 *  - alternatives: Alternative[]
 *  - features: Feature[]
 */
export function ChoiceDriversPanel({ choiceDrivers, alternatives = [], features = [] }) {
  const [activeTab, setActiveTab] = useState("heatmap");

  const altNames = useMemo(() => {
    const map = {};
    alternatives.forEach((a) => { map[a.id] = a.name || a.id; });
    return map;
  }, [alternatives]);

  const featureLabels = useMemo(() => {
    const map = {};
    features.forEach((f) => { map[f.key] = f.label || f.key; });
    return map;
  }, [features]);

  // Build heatmap data: one bar group per alternative, stacked by feature
  const heatmapData = useMemo(() => {
    if (!choiceDrivers?.altFeatureCounts) return [];
    return alternatives.map((alt) => {
      const entry = { alternative: altNames[alt.id] || alt.id };
      const counts = choiceDrivers.altFeatureCounts[alt.id] || {};
      features.forEach((f) => {
        entry[f.key] = counts[f.key] || 0;
      });
      return entry;
    });
  }, [choiceDrivers, alternatives, features, altNames]);

  // Top drivers flat list
  const topDriversList = useMemo(() => {
    if (!choiceDrivers?.topDrivers) return [];
    const list = [];
    for (const [altId, drivers] of Object.entries(choiceDrivers.topDrivers)) {
      for (const d of drivers) {
        list.push({
          alternative: altNames[altId] || altId,
          feature: featureLabels[d.feature] || d.feature,
          count: d.count,
          pct: d.pct,
        });
      }
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 15);
  }, [choiceDrivers, altNames, featureLabels]);

  // Treemap data: feature → size = total mentions
  const treemapData = useMemo(() => {
    if (!choiceDrivers?.altFeatureCounts) return [];
    const totals = {};
    features.forEach((f) => { totals[f.key] = 0; });
    for (const counts of Object.values(choiceDrivers.altFeatureCounts)) {
      for (const [fk, c] of Object.entries(counts)) {
        if (totals[fk] !== undefined) totals[fk] += c;
      }
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([key, value], i) => ({
        name: featureLabels[key] || key,
        size: value,
        fill: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.size - a.size);
  }, [choiceDrivers, features, featureLabels]);

  if (!choiceDrivers || heatmapData.length === 0) {
    return (
      <Card
        title={<Space><ThunderboltOutlined /><span>Choice Drivers</span></Space>}
        style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
      >
        <Empty description="No driver data available" />
      </Card>
    );
  }

  const items = [
    {
      key: "heatmap",
      label: "Feature × Alternative",
      children: (
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            How often each feature was cited as a reason for choosing each alternative.
          </Text>
          <ResponsiveContainer width="100%" height={Math.max(heatmapData.length * 60, 250)}>
            <BarChart data={heatmapData} layout="vertical" margin={{ left: 100, right: 20, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis
                type="category"
                dataKey="alternative"
                tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
                width={90}
              />
              <RTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                      <Text strong style={{ display: "block", marginBottom: 6 }}>{label}</Text>
                      {payload.map((p) => (
                        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: p.fill }} />
                          <Text>{featureLabels[p.dataKey] || p.dataKey}: <strong>{p.value}</strong></Text>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {features.map((f, i) => (
                <Bar key={f.key} dataKey={f.key} stackId="stack" fill={PALETTE[i % PALETTE.length]} radius={i === features.length - 1 ? [0, 4, 4, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {features.map((f, i) => (
              <Tag key={f.key} color={PALETTE[i % PALETTE.length]} bordered={false}>
                {f.label || f.key}
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "treemap",
      label: "Feature Impact Map",
      children: (
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Size represents how often each feature was cited across all choices.
          </Text>
          {treemapData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="#fff"
                strokeWidth={2}
                content={<CustomTreemapContent />}
              />
            </ResponsiveContainer>
          ) : (
            <Empty description="No feature citation data" />
          )}
        </div>
      ),
    },
    {
      key: "ranked",
      label: "Top Drivers",
      children: (
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Most influential feature–alternative combinations ranked by frequency.
          </Text>
          {topDriversList.length === 0 ? (
            <Empty description="No driver data" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topDriversList.map((d, i) => (
                <div
                  key={`${d.alternative}-${d.feature}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: i < 3 ? "#f0f9ff" : "#f8fafc",
                    border: `1px solid ${i < 3 ? "#bfdbfe" : "#e2e8f0"}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 13,
                      background: i < 3 ? "#3b82f6" : "#e2e8f0",
                      color: i < 3 ? "#fff" : "#64748b",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text strong>{d.feature}</Text>
                    <Text type="secondary"> drove choice of </Text>
                    <Text strong style={{ color: "#3b82f6" }}>{d.alternative}</Text>
                  </div>
                  <Tag bordered={false} style={{ margin: 0 }}>
                    {d.count} times ({(d.pct * 100).toFixed(1)}%)
                  </Tag>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Choice Drivers</span>
          <Tooltip title="Analysis of which features most frequently drove agents to pick each alternative. Based on reason codes reported by agents.">
            <InfoCircleOutlined style={{ color: "#94a3b8" }} />
          </Tooltip>
        </Space>
      }
      style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
    >
      <Tabs items={items} activeKey={activeTab} onChange={setActiveTab} size="small" />
    </Card>
  );
}

/* ── Custom Treemap Cell ──────────────────────────────── */

function CustomTreemapContent(props) {
  const { x, y, width, height, name, size, fill } = props;
  if (width < 30 || height < 20) return null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} ry={6} fill={fill} fillOpacity={0.85} stroke="#fff" strokeWidth={2} />
      {width > 60 && height > 36 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={Math.min(14, width / 8)} fontWeight={600}>
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={11}>
            {size} citations
          </text>
        </>
      )}
    </g>
  );
}
