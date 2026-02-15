"use client";

import { Progress, Card, Space, Typography, Statistic, Row, Col } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Progress Bar - displays run progress
 * 
 * Props:
 * - completed: number - completed tasks
 * - total: number - total tasks
 * - status: string - run status
 * - startTime: Date - when run started
 */
export function ProgressBar({
  completed = 0,
  total = 0,
  status = "idle",
  startTime = null,
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!startTime) return "0s";
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Estimate remaining time
  const getRemainingTime = () => {
    if (completed === 0 || !startTime) return "Calculating...";
    const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
    const rate = completed / elapsed; // tasks per second
    const remaining = (total - completed) / rate;
    if (remaining < 60) return `~${Math.ceil(remaining)}s`;
    return `~${Math.ceil(remaining / 60)}m`;
  };

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "active";
      case "complete":
        return "success";
      case "failed":
        return "exception";
      case "paused":
        return "normal";
      default:
        return "normal";
    }
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Progress
          percent={percent}
          status={getStatusColor()}
          strokeColor={{
            "0%": "#108ee9",
            "100%": "#87d068",
          }}
        />

        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Completed"
              value={completed}
              suffix={`/ ${total}`}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Status"
              value={status}
              valueStyle={{ fontSize: 16, textTransform: "capitalize" }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Elapsed"
              value={getElapsedTime()}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Remaining"
              value={status === "complete" ? "Done" : getRemainingTime()}
              prefix={status === "complete" ? <CheckCircleOutlined /> : undefined}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
        </Row>
      </Space>
    </Card>
  );
}
