"use client";

import { Card, Statistic, Row, Col, Progress, Typography, Space, Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Validation Panel - displays validation metrics
 * 
 * Props:
 * - validation: { holdoutAccuracy: number, repeatConsistency: number }
 * - holdoutCount: number - number of holdout tasks
 * - repeatCount: number - number of repeat tasks
 */
export function ValidationPanel({
  validation,
  holdoutCount = 0,
  repeatCount = 0,
}) {
  const holdoutAccuracy = validation?.holdoutAccuracy || 0;
  const repeatConsistency = validation?.repeatConsistency || 0;

  // Get color based on value
  const getColor = (value) => {
    if (value >= 0.8) return "#52c41a";
    if (value >= 0.6) return "#faad14";
    return "#ff4d4f";
  };

  // Get status tag
  const getStatusTag = (value) => {
    if (value >= 0.8) return <Tag color="success">Excellent</Tag>;
    if (value >= 0.6) return <Tag color="warning">Good</Tag>;
    return <Tag color="error">Needs Review</Tag>;
  };

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined />
          <span>Validation Metrics</span>
          <Tooltip title="Metrics to validate the quality and consistency of the simulation results.">
            <InfoCircleOutlined style={{ color: "#999" }} />
          </Tooltip>
        </Space>
      }
    >
      <Row gutter={24}>
        {/* Holdout Accuracy */}
        <Col span={12}>
          <Card size="small">
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  Holdout Accuracy
                </Title>
                {getStatusTag(holdoutAccuracy)}
              </Space>
              <Text type="secondary">
                How well the model predicts choices on holdout tasks
                {holdoutCount > 0 && ` (${holdoutCount} tasks)`}
              </Text>
              <Progress
                type="dashboard"
                percent={Math.round(holdoutAccuracy * 100)}
                strokeColor={getColor(holdoutAccuracy)}
                size={120}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {/* TODO: Add interpretation */}
                {holdoutAccuracy >= 0.7
                  ? "The simulation shows good predictive validity."
                  : "Consider reviewing agent configurations or adding more data."}
              </Text>
            </Space>
          </Card>
        </Col>

        {/* Repeat Consistency */}
        <Col span={12}>
          <Card size="small">
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  Repeat Consistency
                </Title>
                {getStatusTag(repeatConsistency)}
              </Space>
              <Text type="secondary">
                How consistently agents make the same choice on repeated tasks
                {repeatCount > 0 && ` (${repeatCount} tasks)`}
              </Text>
              <Progress
                type="dashboard"
                percent={Math.round(repeatConsistency * 100)}
                strokeColor={getColor(repeatConsistency)}
                size={120}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {/* TODO: Add interpretation */}
                {repeatConsistency >= 0.7
                  ? "Agents show consistent decision-making patterns."
                  : "High variance may indicate noisy agent configurations."}
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
