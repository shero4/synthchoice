"use client";

import { Card, Table, Tag, Typography, Space } from "antd";
import { TeamOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Segment Breakdown - detailed segment analysis
 * 
 * Props:
 * - segments: AgentSegment[] - segment definitions
 * - sharesBySegment: { [segmentId]: { [altId]: number } }
 * - importanceBySegment: { [segmentId]: { [featureKey]: number } }
 * - alternatives: Alternative[]
 * - features: Feature[]
 */
export function SegmentBreakdown({
  segments = [],
  sharesBySegment = {},
  importanceBySegment = {},
  alternatives = [],
  features = [],
}) {
  // Build data source
  const dataSource = segments.map((segment) => {
    const segmentShares = sharesBySegment[segment.segmentId] || {};
    const segmentImportance = importanceBySegment[segment.segmentId] || {};

    // Find top alternative
    const topAlt = Object.entries(segmentShares).sort((a, b) => b[1] - a[1])[0];
    const topAltName = topAlt
      ? alternatives.find((a) => a.id === topAlt[0])?.name || topAlt[0]
      : "N/A";

    // Find top feature
    const topFeature = Object.entries(segmentImportance).sort((a, b) => b[1] - a[1])[0];
    const topFeatureLabel = topFeature
      ? features.find((f) => f.key === topFeature[0])?.label || topFeature[0]
      : "N/A";

    return {
      key: segment.segmentId,
      label: segment.label,
      count: segment.count,
      location: segment.traits?.location || "-",
      personality: segment.traits?.personality || "-",
      priceSensitivity: segment.traits?.priceSensitivity,
      topChoice: topAltName,
      topChoiceShare: topAlt ? topAlt[1] : 0,
      topFeature: topFeatureLabel,
      topFeatureImportance: topFeature ? topFeature[1] : 0,
    };
  });

  const columns = [
    {
      title: "Segment",
      dataIndex: "label",
      key: "label",
      render: (text, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.count} agents
          </Text>
        </Space>
      ),
    },
    {
      title: "Traits",
      key: "traits",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.location}</Text>
          <Text type="secondary">{record.personality}</Text>
          {record.priceSensitivity !== undefined && (
            <Tag color={record.priceSensitivity > 0.7 ? "red" : record.priceSensitivity > 0.4 ? "orange" : "green"}>
              Price: {(record.priceSensitivity * 100).toFixed(0)}%
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Top Choice",
      key: "topChoice",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.topChoice}</Text>
          <Text type="secondary">
            {(record.topChoiceShare * 100).toFixed(1)}% share
          </Text>
        </Space>
      ),
    },
    {
      title: "Top Feature",
      key: "topFeature",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.topFeature}</Text>
          <Text type="secondary">
            {(record.topFeatureImportance * 100).toFixed(1)}% importance
          </Text>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <TeamOutlined />
          <span>Segment Breakdown</span>
        </Space>
      }
    >
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        locale={{
          emptyText: "No segment data available",
        }}
      />
    </Card>
  );
}
