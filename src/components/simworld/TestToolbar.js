"use client";

import { useState } from "react";
import {
  ArrowRightOutlined,
  LogoutOutlined,
  MessageOutlined,
  PlusOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Button, Card, Divider, Input, Select, Space, Tooltip, message } from "antd";

const PERSONA_OPTIONS = [
  { value: "Analytical", label: "Analytical" },
  { value: "Price Sensitive", label: "Price Sensitive" },
  { value: "Premium", label: "Premium" },
  { value: "General", label: "General" },
  { value: "Impulsive", label: "Impulsive" },
  { value: "Cautious", label: "Cautious" },
];

const SHOP_TYPE_OPTIONS = [
  { value: "cafe", label: "☕ Cafe" },
  { value: "library", label: "📚 Library" },
  { value: "gym", label: "💪 Gym" },
  { value: "gallery", label: "🎨 Art Gallery" },
  { value: "office", label: "💼 Office" },
  { value: "tech", label: "💻 Tech Shop" },
  { value: "meditation", label: "🧘 Meditation" },
  { value: "music", label: "🎵 Music Hall" },
];

export default function TestToolbar({ runtime, sprites, options, onUpdate }) {
  const [optionLabel, setOptionLabel] = useState("");
  const [shopType, setShopType] = useState("cafe");
  const [spriteName, setSpriteName] = useState("");
  const [spriteAge, setSpriteAge] = useState("");
  const [spriteBio, setSpriteBio] = useState("");
  const [spritePersona, setSpritePersona] = useState("General");
  const [selectedSprite, setSelectedSprite] = useState(null);
  const [sayMessage, setSayMessage] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState({});

  const setActionLoading = (key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddOption = () => {
    if (!runtime || !optionLabel.trim()) {
      message.warning("Enter an option label");
      return;
    }
    runtime.addOption({ label: optionLabel.trim(), shopType });
    setOptionLabel("");
    onUpdate?.();
  };

  const handleAddSprite = async () => {
    if (!runtime || !spriteName.trim()) {
      message.warning("Enter a sprite name");
      return;
    }
    setActionLoading("spawn", true);
    try {
      await runtime.addSprite({
        name: spriteName.trim(),
        age: spriteAge ? Number(spriteAge) : null,
        bio: spriteBio.trim() || null,
        persona: spritePersona,
      });
      setSpriteName("");
      setSpriteAge("");
      setSpriteBio("");
      onUpdate?.();
    } catch (err) {
      message.error(`Failed to spawn: ${err.message}`);
    } finally {
      setActionLoading("spawn", false);
    }
  };

  const handleSay = async () => {
    if (!runtime || !selectedSprite) {
      message.warning("Select a sprite first");
      return;
    }
    if (!sayMessage.trim()) {
      message.warning("Enter a message");
      return;
    }
    setActionLoading("say", true);
    try {
      await runtime.say(selectedSprite, sayMessage.trim());
      setSayMessage("");
      onUpdate?.();
    } catch (err) {
      message.error(`Say failed: ${err.message}`);
    } finally {
      setActionLoading("say", false);
    }
  };

  const handleMoveTo = async () => {
    if (!runtime || !selectedSprite) {
      message.warning("Select a sprite first");
      return;
    }
    if (!selectedOption) {
      message.warning("Select an option to move to");
      return;
    }
    setActionLoading("move", true);
    try {
      await runtime.moveTo(selectedSprite, selectedOption);
      onUpdate?.();
    } catch (err) {
      message.error(`Move failed: ${err.message}`);
    } finally {
      setActionLoading("move", false);
    }
  };

  const handleExit = async () => {
    if (!runtime || !selectedSprite) {
      message.warning("Select a sprite first");
      return;
    }
    setActionLoading("exit", true);
    try {
      await runtime.exit(selectedSprite);
      setSelectedSprite(null);
      onUpdate?.();
    } catch (err) {
      message.error(`Exit failed: ${err.message}`);
    } finally {
      setActionLoading("exit", false);
    }
  };

  const spriteSelectOptions = sprites.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.persona})`,
  }));

  const optionSelectOptions = options.map((o) => ({
    value: o.id,
    label: o.label,
  }));

  return (
    <Card
      size="small"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "auto",
        maxWidth: "95vw",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        borderRadius: 12,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
      }}
      styles={{
        body: { padding: "12px 16px" },
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        {/* Add Option */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Add Option
          </div>
          <Space size={4}>
            <Select
              value={shopType}
              onChange={setShopType}
              options={SHOP_TYPE_OPTIONS}
              style={{ width: 140 }}
              size="small"
            />
            <Space.Compact>
              <Input
                placeholder="Label"
                value={optionLabel}
                onChange={(e) => setOptionLabel(e.target.value)}
                onPressEnter={handleAddOption}
                style={{ width: 120 }}
                size="small"
              />
              <Tooltip title="Add shop to world">
                <Button
                  icon={<PlusOutlined />}
                  onClick={handleAddOption}
                  size="small"
                  type="primary"
                />
              </Tooltip>
            </Space.Compact>
          </Space>
        </div>

        <Divider type="vertical" style={{ height: 48 }} />

        {/* Add Sprite */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Add Sprite
          </div>
          <Space size={4}>
            <Input
              placeholder="Name"
              value={spriteName}
              onChange={(e) => setSpriteName(e.target.value)}
              style={{ width: 80 }}
              size="small"
            />
            <Input
              placeholder="Age"
              value={spriteAge}
              onChange={(e) => setSpriteAge(e.target.value)}
              style={{ width: 50 }}
              size="small"
            />
            <Input
              placeholder="Bio"
              value={spriteBio}
              onChange={(e) => setSpriteBio(e.target.value)}
              style={{ width: 100 }}
              size="small"
            />
            <Select
              value={spritePersona}
              onChange={setSpritePersona}
              options={PERSONA_OPTIONS}
              style={{ width: 120 }}
              size="small"
            />
            <Tooltip title="Spawn sprite at center">
              <Button
                icon={<UserAddOutlined />}
                onClick={handleAddSprite}
                loading={loading.spawn}
                size="small"
                type="primary"
              >
                Spawn
              </Button>
            </Tooltip>
          </Space>
        </div>

        {sprites.length > 0 && (
          <>
            <Divider type="vertical" style={{ height: 48 }} />

            {/* Sprite Actions */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Sprite Actions
              </div>
              <Space size={4}>
                <Select
                  placeholder="Select sprite"
                  value={selectedSprite}
                  onChange={setSelectedSprite}
                  options={spriteSelectOptions}
                  style={{ width: 160 }}
                  size="small"
                  allowClear
                />

                <Space.Compact>
                  <Input
                    placeholder="Message..."
                    value={sayMessage}
                    onChange={(e) => setSayMessage(e.target.value)}
                    onPressEnter={handleSay}
                    style={{ width: 130 }}
                    size="small"
                    disabled={!selectedSprite}
                  />
                  <Tooltip title="Say message">
                    <Button
                      icon={<MessageOutlined />}
                      onClick={handleSay}
                      loading={loading.say}
                      size="small"
                      disabled={!selectedSprite}
                    >
                      Say
                    </Button>
                  </Tooltip>
                </Space.Compact>

                <Space.Compact>
                  <Select
                    placeholder="Option"
                    value={selectedOption}
                    onChange={setSelectedOption}
                    options={optionSelectOptions}
                    style={{ width: 120 }}
                    size="small"
                    disabled={!selectedSprite || options.length === 0}
                    allowClear
                  />
                  <Tooltip title="Move to option">
                    <Button
                      icon={<ArrowRightOutlined />}
                      onClick={handleMoveTo}
                      loading={loading.move}
                      size="small"
                      disabled={!selectedSprite || !selectedOption}
                    >
                      Move
                    </Button>
                  </Tooltip>
                </Space.Compact>

                <Tooltip title="Exit world">
                  <Button
                    icon={<LogoutOutlined />}
                    onClick={handleExit}
                    loading={loading.exit}
                    size="small"
                    danger
                    disabled={!selectedSprite}
                  >
                    Exit
                  </Button>
                </Tooltip>
              </Space>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
