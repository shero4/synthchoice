"use client";

import { useState } from "react";
import { Card, Button, Space, Typography, Alert, Row, Col, Avatar, Tooltip } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { AgentSprite } from "./AgentSprite";
import { TaskPreview } from "./TaskPreview";
import { ProgressBar } from "./ProgressBar";

const { Title, Text } = Typography;

/**
 * Runner Controller - main runner orchestration component
 * 
 * Props:
 * - experiment: Experiment object
 * - alternatives: Alternative[] - all alternatives
 * - onStart: () => void - start run callback
 * - onPause: () => void - pause run callback
 * - onResume: () => void - resume run callback
 * - onStop: () => void - stop run callback
 * - status: string - current run status
 * - progress: { completed, total } - progress info
 * - currentTask: Task | null - current task being processed
 * - currentAgent: Agent | null - current agent
 * - agents: Agent[] - all agents (for display)
 * - startTime: Date | null - when run started
 */
export function RunnerController({
  experiment,
  alternatives = [],
  onStart,
  onPause,
  onResume,
  onStop,
  status = "idle",
  progress = { completed: 0, total: 0 },
  currentTask = null,
  currentAgent = null,
  agents = [],
  startTime = null,
}) {
  // Determine if None is an option
  const includeNone = experiment?.choiceFormat?.includes("NONE") || false;

  // Get features for display
  const features = experiment?.featureSchema?.features || [];

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      {/* Control buttons */}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            Experiment Runner
          </Title>
          <Space>
            {status === "idle" && (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={onStart}
              >
                Start Run
              </Button>
            )}
            {status === "running" && (
              <Button
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={onPause}
              >
                Pause
              </Button>
            )}
            {status === "paused" && (
              <>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={onResume}
                >
                  Resume
                </Button>
                <Button
                  danger
                  size="large"
                  icon={<StopOutlined />}
                  onClick={onStop}
                >
                  Stop
                </Button>
              </>
            )}
            {status === "complete" && (
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={onStart}
              >
                Run Again
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      {/* Progress */}
      <ProgressBar
        completed={progress.completed}
        total={progress.total}
        status={status}
        startTime={startTime}
      />

      {/* Current task preview */}
      {status === "running" && currentTask && (
        <TaskPreview
          task={currentTask}
          alternatives={alternatives}
          features={features}
          includeNone={includeNone}
        />
      )}

      {/* Agent being processed */}
      {status === "running" && currentAgent && (
        <Card title="Current Agent">
          <Row align="middle" gutter={16}>
            <Col>
              <AgentSprite agent={currentAgent} size="large" isActive />
            </Col>
            <Col>
              <Space orientation="vertical" size={0}>
                <Text strong>{currentAgent.label}</Text>
                <Text type="secondary">
                  {currentAgent.traits?.location || "Unknown location"}
                </Text>
                <Text type="secondary">
                  {currentAgent.traits?.personality || "No personality"} •
                  Price sensitivity: {currentAgent.traits?.priceSensitivity || 0.5}
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Agents overview */}
      {agents.length > 0 && (
        <Card title={`Agents (${agents.length})`}>
          <Avatar.Group maxCount={20} size="large">
            {agents.map((agent, index) => (
              <Tooltip key={agent.id || index} title={agent.label}>
                <span>
                  <AgentSprite
                    agent={agent}
                    size={40}
                    isActive={currentAgent?.id === agent.id}
                    isComplete={
                      status === "complete" ||
                      (progress.completed > 0 && agents.indexOf(agent) < Math.floor(progress.completed / (experiment?.taskPlan?.tasksPerAgent || 1)))
                    }
                    showLabel={false}
                  />
                </span>
              </Tooltip>
            ))}
          </Avatar.Group>
        </Card>
      )}

      {/* Status messages */}
      {status === "idle" && (
        <Alert
          message="Ready to run"
          description="Click 'Start Run' to begin the experiment. Agents will evaluate alternatives and make choices."
          type="info"
          showIcon
        />
      )}

      {status === "complete" && (
        <Alert
          message="Run complete!"
          description="All tasks have been completed. View the results to see choice shares and feature importance."
          type="success"
          showIcon
        />
      )}

      {status === "failed" && (
        <Alert
          message="Run failed"
          description="An error occurred during the run. Please try again."
          type="error"
          showIcon
        />
      )}
    </Space>
  );
}
