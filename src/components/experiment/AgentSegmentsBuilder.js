"use client";

import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Collapse,
  Slider,
  Row,
  Col,
  Popconfirm,
  Typography,
  Statistic,
} from "antd";
import { PlusOutlined, DeleteOutlined, TeamOutlined } from "@ant-design/icons";
import { createDefaultSegment } from "@/models/firestore";

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * Agent Segments Builder - define agent segments and traits
 * 
 * Props:
 * - segments: AgentSegment[] - current segments
 * - onChange: (segments: AgentSegment[]) => void - callback when segments change
 */
export function AgentSegmentsBuilder({ segments = [], onChange }) {
  // Calculate total agents
  const totalAgents = segments.reduce((sum, s) => sum + (s.count || 0), 0);

  // Handle adding a new segment
  const handleAdd = () => {
    const newSegment = createDefaultSegment();
    newSegment.segmentId = `segment_${Date.now()}`;
    newSegment.label = `Segment ${segments.length + 1}`;
    onChange([...segments, newSegment]);
  };

  // Handle deleting a segment
  const handleDelete = (segmentId) => {
    onChange(segments.filter((s) => s.segmentId !== segmentId));
  };

  // Handle updating a segment
  const handleUpdate = (segmentId, updates) => {
    onChange(
      segments.map((s) =>
        s.segmentId === segmentId ? { ...s, ...updates } : s
      )
    );
  };

  // Handle updating traits
  const handleTraitUpdate = (segmentId, trait, value) => {
    onChange(
      segments.map((s) =>
        s.segmentId === segmentId
          ? { ...s, traits: { ...s.traits, [trait]: value } }
          : s
      )
    );
  };

  return (
    <Card
      title={
        <Space>
          <TeamOutlined />
          <span>Agent Segments</span>
        </Space>
      }
      extra={
        <Space>
          <Statistic
            title="Total Agents"
            value={totalAgents}
            valueStyle={{ fontSize: 16 }}
          />
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Segment
          </Button>
        </Space>
      }
    >
      {segments.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Text type="secondary">
            No segments defined. Add segments to create different agent personas.
          </Text>
          <br />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{ marginTop: 16 }}
          >
            Add First Segment
          </Button>
        </div>
      ) : (
        <Collapse defaultActiveKey={[segments[0]?.segmentId]}>
          {segments.map((segment) => (
            <Panel
              key={segment.segmentId}
              header={
                <Space>
                  <Text strong>{segment.label || "Unnamed Segment"}</Text>
                  <Text type="secondary">({segment.count} agents)</Text>
                </Space>
              }
              extra={
                <Popconfirm
                  title="Delete this segment?"
                  onConfirm={(e) => {
                    e.stopPropagation();
                    handleDelete(segment.segmentId);
                  }}
                  onCancel={(e) => e.stopPropagation()}
                >
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              }
            >
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Segment Label">
                      <Input
                        value={segment.label}
                        onChange={(e) =>
                          handleUpdate(segment.segmentId, { label: e.target.value })
                        }
                        placeholder="e.g., Delhi price-sensitive"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Agent Count">
                      <InputNumber
                        value={segment.count}
                        min={1}
                        max={1000}
                        onChange={(v) =>
                          handleUpdate(segment.segmentId, { count: v })
                        }
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Model Tag">
                      <Input
                        value={segment.modelTag}
                        onChange={(e) =>
                          handleUpdate(segment.segmentId, { modelTag: e.target.value })
                        }
                        placeholder="stub"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Text strong style={{ display: "block", marginBottom: 16 }}>
                  Traits
                </Text>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Location">
                      <Input
                        value={segment.traits?.location}
                        onChange={(e) =>
                          handleTraitUpdate(segment.segmentId, "location", e.target.value)
                        }
                        placeholder="e.g., Delhi, SF"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Personality">
                      <Input
                        value={segment.traits?.personality}
                        onChange={(e) =>
                          handleTraitUpdate(segment.segmentId, "personality", e.target.value)
                        }
                        placeholder="e.g., ENTJ, INFP"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label={`Price Sensitivity: ${segment.traits?.priceSensitivity || 0.5}`}>
                      <Slider
                        value={segment.traits?.priceSensitivity || 0.5}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(v) =>
                          handleTraitUpdate(segment.segmentId, "priceSensitivity", v)
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={`Risk Tolerance: ${segment.traits?.riskTolerance || 0.5}`}>
                      <Slider
                        value={segment.traits?.riskTolerance || 0.5}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(v) =>
                          handleTraitUpdate(segment.segmentId, "riskTolerance", v)
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={`Consistency: ${segment.traits?.consistency || 0.7}`}>
                      <Slider
                        value={segment.traits?.consistency || 0.7}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(v) =>
                          handleTraitUpdate(segment.segmentId, "consistency", v)
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Panel>
          ))}
        </Collapse>
      )}
    </Card>
  );
}
