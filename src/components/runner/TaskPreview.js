"use client";

import { Card, Space, Typography, Row, Col, Divider } from "antd";
import { ThingSprite } from "./ThingSprite";

const { Title, Text } = Typography;

/**
 * Task Preview - displays current choice task
 * 
 * Props:
 * - task: Task object
 * - alternatives: Alternative[] - full alternatives list
 * - features: Feature[] - schema features
 * - chosenId: string | null - which alternative was chosen
 * - includeNone: boolean - whether None is an option
 */
export function TaskPreview({
  task,
  alternatives = [],
  features = [],
  chosenId = null,
  includeNone = false,
}) {
  // Get alternatives for this task
  const taskAlternatives = (task?.shownAlternatives || [])
    .map((id) => alternatives.find((a) => a.id === id))
    .filter(Boolean);

  // Calculate column span based on number of alternatives
  const colSpan = Math.floor(24 / (taskAlternatives.length + (includeNone ? 1 : 0)));

  return (
    <Card>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Title level={4} style={{ textAlign: "center", margin: 0 }}>
          Which option would you choose?
        </Title>
        
        {task?.isHoldout && (
          <Text type="secondary" style={{ textAlign: "center", display: "block" }}>
            (Holdout task for validation)
          </Text>
        )}
        
        {task?.isRepeatOf && (
          <Text type="secondary" style={{ textAlign: "center", display: "block" }}>
            (Repeat task for consistency check)
          </Text>
        )}

        <Divider />

        <Row gutter={16}>
          {taskAlternatives.map((alt, index) => (
            <Col span={colSpan} key={alt.id}>
              <ThingSprite
                alternative={alt}
                features={features}
                isSelected={chosenId === alt.id}
              />
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Text strong style={{ fontSize: 18 }}>
                  Option {String.fromCharCode(65 + index)}
                </Text>
              </div>
            </Col>
          ))}
          
          {includeNone && (
            <Col span={colSpan}>
              <Card
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: chosenId === "NONE" ? "#52c41a" : undefined,
                  borderWidth: chosenId === "NONE" ? 2 : 1,
                }}
              >
                <Text type="secondary">None of the above</Text>
              </Card>
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Text strong style={{ fontSize: 18 }}>
                  None
                </Text>
              </div>
            </Col>
          )}
        </Row>
      </Space>
    </Card>
  );
}
