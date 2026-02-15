"use client";

import {
  Card,
  Form,
  InputNumber,
  Switch,
  Select,
  Row,
  Col,
  Typography,
  Statistic,
  Space,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Task Plan Panel - configure task generation settings
 * 
 * Props:
 * - taskPlan: TaskPlan - current task plan settings
 * - choiceFormat: ChoiceFormat - choice format
 * - totalAgents: number - total number of agents
 * - onChange: (taskPlan: TaskPlan) => void - callback when settings change
 * - onChoiceFormatChange: (format: ChoiceFormat) => void - callback for format change
 */
export function TaskPlanPanel({
  taskPlan = {},
  choiceFormat = "AB",
  totalAgents = 0,
  onChange,
  onChoiceFormatChange,
}) {
  // Calculate total tasks
  const tasksPerAgent = taskPlan.tasksPerAgent || 10;
  const totalTasks = tasksPerAgent * totalAgents;

  // Handle updating task plan
  const handleUpdate = (field, value) => {
    onChange({ ...taskPlan, [field]: value });
  };

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>Task Plan</span>
        </Space>
      }
      extra={
        <Space size="large">
          <Statistic
            title="Tasks/Agent"
            value={tasksPerAgent}
            valueStyle={{ fontSize: 16 }}
          />
          <Statistic
            title="Total Tasks"
            value={totalTasks}
            valueStyle={{ fontSize: 16 }}
          />
        </Space>
      }
    >
      <Form layout="vertical">
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Choice Format">
              <Select
                value={choiceFormat}
                onChange={onChoiceFormatChange}
                style={{ width: "100%" }}
              >
                <Select.Option value="AB">A/B (2 options)</Select.Option>
                <Select.Option value="ABC">A/B/C (3 options)</Select.Option>
                <Select.Option value="AB_NONE">A/B + None</Select.Option>
                <Select.Option value="ABC_NONE">A/B/C + None</Select.Option>
              </Select>
              <Text type="secondary" style={{ fontSize: 12 }}>
                How many alternatives per choice task
              </Text>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Tasks per Agent">
              <InputNumber
                value={taskPlan.tasksPerAgent}
                min={1}
                max={100}
                onChange={(v) => handleUpdate("tasksPerAgent", v)}
                style={{ width: "100%" }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Number of choice tasks each agent completes
              </Text>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Randomize Order">
              <Switch
                checked={taskPlan.randomizeOrder}
                onChange={(v) => handleUpdate("randomizeOrder", v)}
              />
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                Shuffle alternative positions in each task
              </Text>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Holdout Tasks">
              <InputNumber
                value={taskPlan.includeHoldouts}
                min={0}
                max={10}
                onChange={(v) => handleUpdate("includeHoldouts", v)}
                style={{ width: "100%" }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tasks reserved for validation accuracy
              </Text>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Repeat Tasks">
              <InputNumber
                value={taskPlan.includeRepeats}
                min={0}
                max={10}
                onChange={(v) => handleUpdate("includeRepeats", v)}
                style={{ width: "100%" }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Repeated tasks to measure consistency
              </Text>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Estimated Run Time">
              <Text>
                {/* TODO: Calculate based on model and task count */}
                ~{Math.ceil(totalTasks / 60)} minutes
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Using stub simulator (instant)
              </Text>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}
