"use client";

import { Card, Progress, Space, Typography, Row, Col, Tooltip } from "antd";
import { BarChartOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Feature Importance Panel - displays feature importance visualization
 * 
 * Props:
 * - importance: { overall: { [featureKey]: number }, bySegment?: { [segmentId]: { [featureKey]: number } } }
 * - features: Feature[] - for labels
 */
export function FeatureImportancePanel({ importance, features = [] }) {
  const overallImportance = importance?.overall || {};
  const segmentImportance = importance?.bySegment || {};

  // Sort features by importance
  const sortedFeatures = Object.entries(overallImportance)
    .sort((a, b) => b[1] - a[1]);

  // Get feature label
  const getFeatureLabel = (key) => {
    const feature = features.find((f) => f.key === key);
    return feature?.label || key;
  };

  // Generate color based on importance
  const getColor = (value) => {
    if (value > 0.5) return "#52c41a";
    if (value > 0.3) return "#1890ff";
    if (value > 0.1) return "#faad14";
    return "#d9d9d9";
  };

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>Feature Importance</span>
          <Tooltip title="Relative importance of each feature in driving choices. Higher values indicate features that had more influence on agent decisions.">
            <InfoCircleOutlined style={{ color: "#999" }} />
          </Tooltip>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Overall importance */}
        <div>
          <Title level={5}>Overall</Title>
          {sortedFeatures.length === 0 ? (
            <Text type="secondary">No data available</Text>
          ) : (
            <Space direction="vertical" style={{ width: "100%" }}>
              {sortedFeatures.map(([key, value]) => (
                <div key={key}>
                  <Row justify="space-between" align="middle">
                    <Col span={6}>
                      <Text strong>{getFeatureLabel(key)}</Text>
                    </Col>
                    <Col span={14}>
                      <Progress
                        percent={Math.round(value * 100)}
                        strokeColor={getColor(value)}
                        showInfo={false}
                      />
                    </Col>
                    <Col span={4} style={{ textAlign: "right" }}>
                      <Text>{(value * 100).toFixed(1)}%</Text>
                    </Col>
                  </Row>
                </div>
              ))}
            </Space>
          )}
        </div>

        {/* Segment importance comparison */}
        {Object.keys(segmentImportance).length > 0 && (
          <div>
            <Title level={5}>By Segment</Title>
            {/* Show a comparison table for each feature */}
            {sortedFeatures.map(([key]) => (
              <Card key={key} size="small" style={{ marginBottom: 8 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  {getFeatureLabel(key)}
                </Text>
                {Object.entries(segmentImportance).map(([segmentId, segImp]) => (
                  <Row key={segmentId} justify="space-between" style={{ marginBottom: 4 }}>
                    <Col span={8}>
                      <Text type="secondary">{segmentId}</Text>
                    </Col>
                    <Col span={12}>
                      <Progress
                        percent={Math.round((segImp[key] || 0) * 100)}
                        size="small"
                        showInfo={false}
                        strokeColor={getColor(segImp[key] || 0)}
                      />
                    </Col>
                    <Col span={4} style={{ textAlign: "right" }}>
                      <Text type="secondary">
                        {((segImp[key] || 0) * 100).toFixed(1)}%
                      </Text>
                    </Col>
                  </Row>
                ))}
              </Card>
            ))}
          </div>
        )}
      </Space>
    </Card>
  );
}
