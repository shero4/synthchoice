"use client";

import { Card, Progress, Space, Typography, Row, Col, Statistic } from "antd";
import { PieChartOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Shares Panel - displays choice shares visualization
 * 
 * Props:
 * - shares: { overall: { [altId]: number }, bySegment?: { [segmentId]: { [altId]: number } } }
 * - alternatives: Alternative[] - for labels
 * - title: string - panel title
 */
export function SharesPanel({ shares, alternatives = [], title = "Choice Shares" }) {
  const overallShares = shares?.overall || {};
  const segmentShares = shares?.bySegment || {};

  // Generate color for alternative
  const getColor = (index) => {
    const colors = ["#1890ff", "#52c41a", "#faad14", "#eb2f96", "#722ed1", "#13c2c2"];
    return colors[index % colors.length];
  };

  // Get alternative name
  const getAltName = (altId) => {
    const alt = alternatives.find((a) => a.id === altId);
    return alt?.name || altId;
  };

  // Calculate max share for scaling
  const maxShare = Math.max(...Object.values(overallShares), 0.01);

  return (
    <Card
      title={
        <Space>
          <PieChartOutlined />
          <span>{title}</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Overall shares */}
        <div>
          <Title level={5}>Overall</Title>
          {Object.entries(overallShares).length === 0 ? (
            <Text type="secondary">No data available</Text>
          ) : (
            <Space direction="vertical" style={{ width: "100%" }}>
              {Object.entries(overallShares).map(([altId, share], index) => (
                <div key={altId}>
                  <Row justify="space-between" align="middle">
                    <Col span={6}>
                      <Text strong>{getAltName(altId)}</Text>
                    </Col>
                    <Col span={14}>
                      <Progress
                        percent={Math.round(share * 100)}
                        strokeColor={getColor(index)}
                        showInfo={false}
                      />
                    </Col>
                    <Col span={4} style={{ textAlign: "right" }}>
                      <Text>{(share * 100).toFixed(1)}%</Text>
                    </Col>
                  </Row>
                </div>
              ))}
            </Space>
          )}
        </div>

        {/* Segment breakdown */}
        {Object.keys(segmentShares).length > 0 && (
          <div>
            <Title level={5}>By Segment</Title>
            {Object.entries(segmentShares).map(([segmentId, segShares]) => (
              <Card key={segmentId} size="small" style={{ marginBottom: 8 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  {segmentId}
                </Text>
                {Object.entries(segShares).map(([altId, share], index) => (
                  <Row key={altId} justify="space-between" style={{ marginBottom: 4 }}>
                    <Col span={6}>
                      <Text type="secondary">{getAltName(altId)}</Text>
                    </Col>
                    <Col span={14}>
                      <Progress
                        percent={Math.round(share * 100)}
                        strokeColor={getColor(index)}
                        size="small"
                        showInfo={false}
                      />
                    </Col>
                    <Col span={4} style={{ textAlign: "right" }}>
                      <Text type="secondary">{(share * 100).toFixed(1)}%</Text>
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
