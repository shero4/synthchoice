"use client";

import {
  ArrowRightOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  LogoutOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Card,
  Collapse,
  Empty,
  List,
  Tabs,
  Tag,
  Typography,
} from "antd";

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
  "agent.wander": <ArrowRightOutlined />,
  "agent.thinking": <LoadingOutlined />,
  "agent.decided": <ThunderboltOutlined />,
  "agent.decided_none": <BulbOutlined />,
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
  "agent.wander": "green",
  "agent.thinking": "processing",
  "agent.decided": "orange",
  "agent.decided_none": "cyan",
  "sprite.removed": "default",
};

function formatTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return "--:--:--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getSpriteFallbackName(spriteId) {
  return `Sprite ${spriteId}`;
}

function ActionItem({ action, showActor = false, actorMeta = null }) {
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
    case "agent.wander":
      description = "Roaming around the plaza";
      break;
    case "agent.thinking":
      description = "Thinking...";
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
    case "agent.decided_none": {
      const conf = action.detail?.confidence;
      const confStr = conf !== undefined ? ` (${Math.round(conf * 100)}%)` : "";
      description = `Chose nothing${confStr}`;
      break;
    }
    case "sprite.removed":
      description = "Left the world";
      break;
    default:
      description = action.type;
  }

  const actorName = action.spriteId
    ? actorMeta?.name || getSpriteFallbackName(action.spriteId)
    : "System";
  const actorStatus = action.spriteId ? actorMeta?.status : null;
  const actorStatusColor = actorStatus === "active" ? "green" : "default";

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
        {showActor && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <Text strong style={{ fontSize: 11 }}>
              {actorName}
            </Text>
            {actorStatus && (
              <Tag color={actorStatusColor} style={{ margin: 0, fontSize: 10 }}>
                {actorStatus}
              </Tag>
            )}
          </div>
        )}
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

export default function SimWorldSidebar({ sprites = [], actionLog = [] }) {
  const spriteMetaById = {};

  for (const action of actionLog) {
    if (!action.spriteId) continue;

    const fallbackName = getSpriteFallbackName(action.spriteId);
    const existing = spriteMetaById[action.spriteId] || {
      id: action.spriteId,
      name: fallbackName,
      persona: "Agent",
      color: "#64748b",
      status: "exited",
    };

    const detail = action.detail || {};
    const nextMeta = {
      ...existing,
      name:
        detail.name && existing.name === fallbackName
          ? detail.name
          : existing.name,
      persona:
        detail.persona && existing.persona === "Agent"
          ? detail.persona
          : existing.persona,
    };

    if (action.type === "sprite.added") {
      nextMeta.status = "active";
      nextMeta.name = detail.name || nextMeta.name;
      nextMeta.persona = detail.persona || nextMeta.persona;
    }
    if (action.type === "exit" || action.type === "sprite.removed") {
      nextMeta.status = "exited";
    }

    spriteMetaById[action.spriteId] = nextMeta;
  }

  for (const sprite of sprites) {
    spriteMetaById[sprite.id] = {
      ...(spriteMetaById[sprite.id] || {}),
      id: sprite.id,
      name: sprite.name || getSpriteFallbackName(sprite.id),
      persona: sprite.persona || "Agent",
      color: sprite.color || "#64748b",
      status: "active",
    };
  }

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

  const spritesTabContent =
    sprites.length === 0
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
        />;

  const activityTabContent =
    actionLog.length === 0
      ? <Empty
          description="No actions yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: "40px 0" }}
        />
      : <div style={{ maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
          <List
            dataSource={[...actionLog].reverse()}
            renderItem={(action) => (
              <ActionItem
                action={action}
                showActor
                actorMeta={
                  action.spriteId ? spriteMetaById[action.spriteId] : null
                }
              />
            )}
            split={false}
            size="small"
          />
        </div>;

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
      <Tabs
        defaultActiveKey="sprites"
        size="small"
        tabBarStyle={{ margin: 0, padding: "0 12px" }}
        items={[
          {
            key: "sprites",
            label: `Sprites (${sprites.length})`,
            children: (
              <div style={{ padding: "8px 12px" }}>{spritesTabContent}</div>
            ),
          },
          {
            key: "activity",
            label: (
              <span>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {`Activity Log (${actionLog.length})`}
              </span>
            ),
            children: (
              <div style={{ padding: "8px 12px" }}>{activityTabContent}</div>
            ),
          },
        ]}
      />
    </Card>
  );
}
