"use client";

import { useMemo, useState } from "react";
import { Card, Typography, Space, Tooltip, Tabs, Tag, Empty, Alert } from "antd";
import {
  ThunderboltOutlined,
  InfoCircleOutlined,
  WarningOutlined,
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
  LabelList,
  Legend,
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
 * Props:
 *  - choiceDrivers: { altFeatureCounts, altChoiceCounts, heatmap, topDrivers, coOccurrence, coverage }
 *  - alternatives: Alternative[]
 *  - features: Feature[]
 */
export function ChoiceDriversPanel({ choiceDrivers, alternatives = [], features = [] }) {
  const [activeTab, setActiveTab] = useState("overview");

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

  const coverage = choiceDrivers?.coverage || {
    totalResponses: 0,
    responsesWithReasons: 0,
    coverageRate: 0,
  };

  // ── Overview data: choices + citation totals side-by-side ──
  const overviewData = useMemo(() => {
    if (!choiceDrivers) return [];
    const altChoices = choiceDrivers.altChoiceCounts || {};
    const altCitations = choiceDrivers.altFeatureCounts || {};

    return alternatives
      .map((alt) => {
        const choices = altChoices[alt.id] || 0;
        const citations = Object.values(altCitations[alt.id] || {}).reduce(
          (s, v) => s + v,
          0,
        );
        return {
          name: altNames[alt.id] || alt.id,
          altId: alt.id,
          choices,
          citations,
        };
      })
      .sort((a, b) => b.choices - a.choices);
  }, [choiceDrivers, alternatives, altNames]);

  // ── Feature × Alternative stacked bar data ──
  const heatmapData = useMemo(() => {
    if (!choiceDrivers?.altFeatureCounts) return [];
    return alternatives
      .map((alt) => {
        const entry = {
          alternative: altNames[alt.id] || alt.id,
          altId: alt.id,
        };
        const counts = choiceDrivers.altFeatureCounts[alt.id] || {};
        let total = 0;
        features.forEach((f) => {
          const v = counts[f.key] || 0;
          entry[f.key] = v;
          total += v;
        });
        entry._total = total;
        return entry;
      })
      .filter((d) => d._total > 0) // only show alts that have citation data
      .sort((a, b) => b._total - a._total);
  }, [choiceDrivers, alternatives, features, altNames]);

  // ── Top drivers flat list ──
  const topDriversList = useMemo(() => {
    if (!choiceDrivers?.topDrivers) return [];
    const list = [];
    for (const [altId, drivers] of Object.entries(choiceDrivers.topDrivers)) {
      for (const d of drivers) {
        if (d.count === 0) continue; // skip zero entries
        list.push({
          alternative: altNames[altId] || altId,
          feature: featureLabels[d.feature] || d.feature,
          count: d.count,
          pct: d.pct,
        });
      }
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 20);
  }, [choiceDrivers, altNames, featureLabels]);

  // ── Treemap data ──
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

  if (!choiceDrivers || overviewData.length === 0) {
    return (
      <Card
        title={<Space><ThunderboltOutlined /><span>Choice Drivers</span></Space>}
        style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
      >
        <Empty description="No driver data available" />
      </Card>
    );
  }

  const lowCoverage = coverage.coverageRate < 0.5;

  const items = [
    {
      key: "overview",
      label: "Overview",
      children: (
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Choices made vs. feature citations reported per alternative.
          </Text>
          <ResponsiveContainer width="100%" height={Math.max(overviewData.length * 72, 240)}>
            <BarChart
              data={overviewData}
              layout="vertical"
              margin={{ left: 120, right: 50, top: 8, bottom: 8 }}
              barGap={4}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#64748b" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 13, fill: "#334155", fontWeight: 500 }}
                width={110}
              />
              <RTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  return (
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 180 }}>
                      <Text strong style={{ display: "block", marginBottom: 6 }}>{d.name}</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6" }} />
                        <Text>Times chosen: <strong>{d.choices}</strong></Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
                        <Text>Feature citations: <strong>{d.citations}</strong></Text>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 8 }}
              />
              <Bar
                dataKey="choices"
                name="Times Chosen"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              >
                <LabelList
                  dataKey="choices"
                  position="right"
                  style={{ fontSize: 12, fontWeight: 600, fill: "#334155" }}
                />
              </Bar>
              <Bar
                dataKey="citations"
                name="Feature Citations"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              >
                <LabelList
                  dataKey="citations"
                  position="right"
                  style={{ fontSize: 12, fontWeight: 600, fill: "#92400e" }}
                  formatter={(v) => (v > 0 ? v : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      key: "heatmap",
      label: "Feature Breakdown",
      children: (
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            Which specific features were cited as reasons for each alternative.
            {heatmapData.length === 0 && " No alternatives have citation data."}
          </Text>
          {heatmapData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(heatmapData.length * 64, 200)}>
                <BarChart
                  data={heatmapData}
                  layout="vertical"
                  margin={{ left: 120, right: 60, top: 8, bottom: 8 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="alternative"
                    tick={{ fontSize: 13, fill: "#334155", fontWeight: 500 }}
                    width={110}
                  />
                  <RTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const featurePayload = payload.filter((p) => p.dataKey !== "_total");
                      if (featurePayload.length === 0) return null;
                      const total = featurePayload.reduce((s, p) => s + (p.value || 0), 0);
                      return (
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 180 }}>
                          <Text strong style={{ display: "block", marginBottom: 6 }}>{label}</Text>
                          {featurePayload.map((p) => (
                            <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                              <Text style={{ flex: 1 }}>{featureLabels[p.dataKey] || p.dataKey}</Text>
                              <Text strong>{p.value}</Text>
                            </div>
                          ))}
                          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                            <Text strong>Total: {total} citations</Text>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {features.map((f, i) => (
                    <Bar
                      key={f.key}
                      dataKey={f.key}
                      stackId="stack"
                      fill={PALETTE[i % PALETTE.length]}
                      radius={i === features.length - 1 ? [0, 4, 4, 0] : 0}
                    />
                  ))}
                  <Bar dataKey="_total" stackId="total-label" fill="transparent" maxBarSize={0}>
                    <LabelList
                      dataKey="_total"
                      position="right"
                      style={{ fontSize: 12, fontWeight: 600, fill: "#475569" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {features.map((f, i) => (
                  <Tag key={f.key} color={PALETTE[i % PALETTE.length]} bordered={false}>
                    {f.label || f.key}
                  </Tag>
                ))}
              </div>
            </>
          ) : (
            <Empty
              description="No feature citation data available"
              style={{ padding: 32 }}
            />
          )}
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
            <Empty description="No feature–alternative combinations with citations found" />
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
          <Tooltip title="Analysis of which features drove agents to pick each alternative. Based on reason codes reported by agents alongside their choices.">
            <InfoCircleOutlined style={{ color: "#94a3b8" }} />
          </Tooltip>
        </Space>
      }
      style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
    >
      {/* Coverage indicator */}
      {lowCoverage && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={
            <span>
              <strong>Low reason-code coverage:</strong>{" "}
              {coverage.responsesWithReasons} of {coverage.totalResponses} responses
              ({Math.round(coverage.coverageRate * 100)}%) included feature reason codes.
              {" "}Stub agents don&apos;t report reasons — only LLM agents do.
              The Part-Worth Utilities panel above uses a statistical model that doesn&apos;t
              depend on reason codes.
            </span>
          }
          style={{ marginBottom: 16, borderRadius: 10 }}
          closable
        />
      )}
      {!lowCoverage && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 16,
            padding: "8px 14px",
            background: "#f8fafc",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <Text type="secondary">
            <strong>{coverage.responsesWithReasons}</strong> of{" "}
            <strong>{coverage.totalResponses}</strong> responses reported reason codes
            ({Math.round(coverage.coverageRate * 100)}% coverage)
          </Text>
        </div>
      )}

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
