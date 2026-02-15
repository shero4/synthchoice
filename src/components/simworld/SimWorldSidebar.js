"use client";

import {
  ArrowRightOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  LogoutOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Badge, Card, Collapse, Empty, List, Tag, Typography } from "antd";

const { Text } = Typography;

const ACTION_ICONS = {
  say: <MessageOutlined />,
  move: <ArrowRightOutlined />,
  pick: <CheckCircleOutlined />,
  exit: <LogoutOutlined />,
  "sprite.added": <UserOutlined />,
  "thinking.start": <LoadingOutlined />,
  "thinking.end": <BulbOutlined />,
  "agent.spawned": <UserOutlined />,
  "agent.processing": <LoadingOutlined />,
  "agent.decided": <ThunderboltOutlined />,
  "sprite.removed": <LogoutOutlined />,
};

const ACTION_COLORS = {
  say: "blue",
  move: "green",
  pick: "gold",
  exit: "red",
  "sprite.added": "purple",
  "thinking.start": "processing",
  "thinking.end": "cyan",
  "agent.spawned": "purple",
  "agent.processing": "processing",
  "agent.decided": "orange",
  "sprite.removed": "default",
};

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActionItem({ action }) {
  let description = "";
  switch (action.type) {
    case "say":
      description = `Said: "${action.detail?.message || "..."}"`;
      break;
    case "move":
      description = `Moved to: ${action.detail?.optionLabel || action.detail?.optionId || "unknown"}`;
      break;
    case "pick":
      description = `Picked: ${action.detail?.optionLabel || action.detail?.optionId || "unknown"}`;
      break;
    case "exit":
      description = "Exited the world";
      break;
    case "sprite.added":
      description = `Joined as ${action.detail?.persona || "Agent"}`;
      break;
    case "thinking.start":
      description = "Thinking...";
      break;
    case "thinking.end":
      description = "Done thinking";
      break;
    case "agent.spawned":
      description = `Spawned: ${action.detail?.name || "Agent"}`;
      break;
    case "agent.processing":
      description = `Processing: ${action.detail?.name || "Agent"}`;
      break;
    case "agent.decided": {
      const chosen = action.detail?.chosen || "?";
      const conf = action.detail?.confidence;
      const confStr = conf !== undefined ? ` (${Math.round(conf * 100)}%)` : "";
      description = action.detail?.error
        ? `Error: ${action.detail.error}`
        : `Chose ${chosen}${confStr}`;
      break;
    }
    case "sprite.removed":
      description = "Left the world";
      break;
    default:
      description = action.type;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "4px 0",
      }}
    >
      <Tag
        color={ACTION_COLORS[action.type] || "default"}
        icon={ACTION_ICONS[action.type]}
        style={{ margin: 0, flexShrink: 0 }}
      >
        {action.type}
      </Tag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, display: "block" }} ellipsis>
          {description}
        </Text>
        <Text type="secondary" style={{ fontSize: 10 }}>
          {formatTime(action.timestamp)}
        </Text>
      </div>
    </div>
  );
}

export default function SimWorldSidebar({ sprites, actionLog }) {
  // Group actions by spriteId
  const actionsBySprite = {};
  for (const action of actionLog) {
    if (!action.spriteId) continue;
    if (!actionsBySprite[action.spriteId]) {
      actionsBySprite[action.spriteId] = [];
    }
    actionsBySprite[action.spriteId].push(action);
  }

  const collapseItems = sprites.map((sprite) => ({
    key: sprite.id,
    label: (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Badge color={sprite.color || "#64748b"} style={{ flexShrink: 0 }} />
        <Text strong style={{ fontSize: 13 }}>
          {sprite.name}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {sprite.persona}
        </Text>
        {actionsBySprite[sprite.id]?.length > 0 && (
          <Tag style={{ marginLeft: "auto", fontSize: 10 }}>
            {actionsBySprite[sprite.id].length}
          </Tag>
        )}
      </div>
    ),
    children: (
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {(actionsBySprite[sprite.id] || []).length === 0
          ? <Text type="secondary" style={{ fontSize: 12 }}>
              No actions yet
            </Text>
          : <List
              dataSource={[...(actionsBySprite[sprite.id] || [])].reverse()}
              renderItem={(action) => <ActionItem action={action} />}
              split={false}
              size="small"
            />}
      </div>
    ),
  }));

  return (
    <Card
      style={{
        width: 300,
        height: "100%",
        borderRadius: 0,
        borderLeft: "1px solid #e5e7eb",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      styles={{
        body: {
          padding: 0,
          flex: 1,
          overflowY: "auto",
        },
        header: {
          padding: "12px 16px",
          minHeight: "auto",
        },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserOutlined />
          <span>Sprites</span>
          <Tag style={{ marginLeft: "auto" }}>{sprites.length}</Tag>
        </div>
      }
    >
      {sprites.length === 0
        ? <Empty
            description="No sprites yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: "40px 0" }}
          />
        : <Collapse
            items={collapseItems}
            defaultActiveKey={sprites.map((s) => s.id)}
            ghost
            size="small"
          />}
    </Card>
  );
}
