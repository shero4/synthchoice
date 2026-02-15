"use client";

import { Avatar, Typography, Space, Badge } from "antd";
import { UserOutlined, LoadingOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Agent Sprite - displays an agent avatar with status
 * 
 * Props:
 * - agent: Agent object with sprite config
 * - size: "small" | "default" | "large" | number
 * - isActive: boolean - whether agent is currently processing
 * - isComplete: boolean - whether agent has finished
 * - showLabel: boolean - show agent label below
 */
export function AgentSprite({
  agent,
  size = "default",
  isActive = false,
  isComplete = false,
  showLabel = true,
}) {
  // Generate deterministic color from seed
  const getColorFromSeed = (seed) => {
    if (!seed) return "#1890ff";
    const colors = [
      "#f56a00",
      "#7265e6",
      "#ffbf00",
      "#00a2ae",
      "#eb2f96",
      "#52c41a",
      "#1890ff",
      "#722ed1",
    ];
    const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Get avatar size number
  const getSize = () => {
    if (typeof size === "number") return size;
    switch (size) {
      case "small":
        return 32;
      case "large":
        return 64;
      default:
        return 40;
    }
  };

  const avatarSize = getSize();
  const bgColor = getColorFromSeed(agent?.sprite?.seed);
  const initial = agent?.label?.[0]?.toUpperCase() || "A";

  // Check if there's a sprite image in public folder
  // TODO: Implement actual sprite loading from public/sprites/agents/
  const spriteUrl = null; // Placeholder

  const avatar = (
    <Avatar
      size={avatarSize}
      src={spriteUrl}
      style={{
        backgroundColor: spriteUrl ? undefined : bgColor,
        cursor: isActive ? "default" : "pointer",
      }}
      icon={spriteUrl ? undefined : <UserOutlined />}
    >
      {!spriteUrl && initial}
    </Avatar>
  );

  const wrappedAvatar = isActive ? (
    <Badge
      count={<LoadingOutlined style={{ color: "#1890ff" }} />}
      offset={[-5, avatarSize - 10]}
    >
      {avatar}
    </Badge>
  ) : isComplete ? (
    <Badge status="success" offset={[-5, avatarSize - 10]}>
      {avatar}
    </Badge>
  ) : (
    avatar
  );

  if (!showLabel) {
    return wrappedAvatar;
  }

  return (
    <Space direction="vertical" align="center" size={4}>
      {wrappedAvatar}
      <Text
        type={isActive ? undefined : "secondary"}
        style={{ fontSize: 12, textAlign: "center" }}
        strong={isActive}
      >
        {agent?.label || "Agent"}
      </Text>
    </Space>
  );
}
