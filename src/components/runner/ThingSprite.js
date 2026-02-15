"use client";

import { Card, Typography, Tag, Space, List } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Thing Sprite - displays an alternative/thing card
 * 
 * Props:
 * - alternative: Alternative object
 * - features: Feature[] - schema features for display
 * - isSelected: boolean - whether this option was chosen
 * - isHighlighted: boolean - whether to highlight (on hover, etc.)
 * - onClick: () => void - click handler
 */
export function ThingSprite({
  alternative,
  features = [],
  isSelected = false,
  isHighlighted = false,
  onClick,
}) {
  // Generate deterministic color from seed
  const getColorFromSeed = (seed) => {
    if (!seed) return "#1890ff";
    const colors = [
      "#1890ff",
      "#52c41a",
      "#faad14",
      "#eb2f96",
      "#722ed1",
      "#13c2c2",
    ];
    const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const borderColor = getColorFromSeed(alternative?.sprite?.seed);

  // Format feature value for display
  const formatValue = (feature, value) => {
    if (feature.type === "binary") {
      return value ? "Yes" : "No";
    }
    if (feature.type === "continuous" && feature.unit) {
      return `${value} ${feature.unit}`;
    }
    return String(value);
  };

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderColor: isSelected ? "#52c41a" : isHighlighted ? borderColor : undefined,
        borderWidth: isSelected || isHighlighted ? 2 : 1,
        boxShadow: isSelected ? "0 0 8px rgba(82, 196, 26, 0.3)" : undefined,
        transition: "all 0.2s",
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Title level={5} style={{ margin: 0 }}>
            {alternative?.name || "Alternative"}
          </Title>
          {isSelected && (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Selected
            </Tag>
          )}
        </Space>

        {/* Display title and bullets if available */}
        {alternative?.display?.title && (
          <Text strong>{alternative.display.title}</Text>
        )}
        {alternative?.display?.bullets?.length > 0 && (
          <List
            size="small"
            dataSource={alternative.display.bullets}
            renderItem={(item) => (
              <List.Item style={{ padding: "4px 0", border: "none" }}>
                <Text type="secondary">• {item}</Text>
              </List.Item>
            )}
          />
        )}

        {/* Display features */}
        <div style={{ marginTop: 8 }}>
          {features.map((f) => {
            const value = alternative?.features?.[f.key];
            if (value === undefined) return null;
            return (
              <Tag key={f.key} style={{ marginBottom: 4 }}>
                {f.label}: {formatValue(f, value)}
              </Tag>
            );
          })}
        </div>
      </Space>
    </Card>
  );
}
