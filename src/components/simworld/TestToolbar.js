"use client";

import {
  ArrowRightOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LogoutOutlined,
  MessageOutlined,
  SearchOutlined,
  UploadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Input,
  message,
  Select,
  Space,
  Switch,
  Tooltip,
  Upload,
} from "antd";
import { useState } from "react";
import { generateSprite, searchProduct } from "@/app/test/actions";

const PERSONA_OPTIONS = [
  { value: "Analytical", label: "Analytical" },
  { value: "Price Sensitive", label: "Price Sensitive" },
  { value: "Premium", label: "Premium" },
  { value: "General", label: "General" },
  { value: "Impulsive", label: "Impulsive" },
  { value: "Cautious", label: "Cautious" },
];

const PROVIDER_OPTIONS = [
  { value: "openrouter", label: "OpenRouter (Gemini Flash)" },
  { value: "gemini", label: "Google Gemini (Direct)" },
  { value: "openai", label: "OpenAI (gpt-4.1-mini)" },
];

const GRID_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
];

const FRAME_SIZE_OPTIONS = [
  { value: 32, label: "32px" },
  { value: 64, label: "64px" },
  { value: 96, label: "96px" },
  { value: 128, label: "128px" },
  { value: 160, label: "160px" },
  { value: 192, label: "192px" },
  { value: 224, label: "224px" },
  { value: 256, label: "256px" },
];

export default function TestToolbar({ runtime, sprites, options, onUpdate }) {
  const [isVisible, setIsVisible] = useState(true);

  const [mode, setMode] = useState("upload");
  const [optionLabel, setOptionLabel] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [uploadedLogoName, setUploadedLogoName] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [gridCols, setGridCols] = useState(2);
  const [gridRows, setGridRows] = useState(2);
  const [frameSize, setFrameSize] = useState(128);
  const [generateGif, setGenerateGif] = useState(true);

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

  const handleUploadChange = (info) => {
    const file = info.file?.originFileObj || info.file;
    if (!file) return;
    setLogoFile(file);
    setUploadedLogoName(file.name || "logo");
  };

  const handleGenerateAndAddOption = async () => {
    if (!runtime) {
      message.warning("Runtime is not ready yet");
      return;
    }

    const trimmedLabel = optionLabel.trim();
    if (!trimmedLabel) {
      message.warning("Enter a label");
      return;
    }

    if (mode === "upload" && !logoFile) {
      message.warning("Upload a logo image first");
      return;
    }

    if (mode === "search" && !productQuery.trim()) {
      message.warning("Enter a product query");
      return;
    }

    setActionLoading("generateOption", true);
    try {
      const grid = `${gridCols}x${gridRows}`;
      let result;

      if (mode === "upload") {
        const formData = new FormData();
        formData.append("logo", logoFile);
        formData.append("provider", provider);
        formData.append("grid", grid);
        formData.append("frameSize", frameSize.toString());
        formData.append("generateGif", generateGif.toString());
        result = await generateSprite(formData);
      } else {
        const searchResult = await searchProduct(productQuery.trim());
        if (searchResult.error) {
          throw new Error(searchResult.error);
        }

        const fetchUrls = [
          ...(searchResult.imageUrl ? [searchResult.imageUrl] : []),
          ...(searchResult.imageUrls ?? []).filter(
            (url) => url && url !== searchResult.imageUrl,
          ),
        ];

        const fetchRes = await fetch("/api/sprites/fetch-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls: fetchUrls }),
        });
        const fetchResult = await fetchRes.json();
        if (!fetchRes.ok || fetchResult.error) {
          throw new Error(fetchResult.error || "Failed to fetch product image");
        }

        const genRes = await fetch("/api/sprites/generate-from-dataurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: fetchResult.imageDataUrl,
            provider,
            grid,
            frameSize,
            generateGif,
          }),
        });
        result = await genRes.json();
        if (!genRes.ok || result.error) {
          throw new Error(result.error || "Failed to generate sprite");
        }
      }

      if (result.error) {
        throw new Error(result.error);
      }
      if (!result.spriteSheet) {
        throw new Error("Sprite sheet was not generated");
      }

      runtime.addOption({
        label: trimmedLabel,
        visual: {
          spriteSheetDataUrl: result.spriteSheet,
          gifDataUrl: result.gif || null,
          grid: [gridCols, gridRows],
          frameSize,
          frameDurationMs: 150,
        },
      });

      setOptionLabel("");
      if (mode === "upload") {
        setLogoFile(null);
        setUploadedLogoName("");
      } else {
        setProductQuery("");
      }

      onUpdate?.();
      message.success("Generated option added to SimWorld");
    } catch (err) {
      message.error(err.message || "Failed to add generated option");
    } finally {
      setActionLoading("generateOption", false);
    }
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

  const canGenerateOption =
    Boolean(runtime) &&
    !loading.generateOption &&
    Boolean(optionLabel.trim()) &&
    (mode === "upload" ? Boolean(logoFile) : Boolean(productQuery.trim()));

  if (!isVisible) {
    return (
      <Button
        type="primary"
        icon={<EyeOutlined />}
        onClick={() => setIsVisible(true)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 1000,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
        }}
      >
        Show Testbar
      </Button>
    );
  }

  return (
    <Card
      size="small"
      title="SimWorld Testbar"
      extra={
        <Tooltip title="Hide testbar">
          <Button
            icon={<EyeInvisibleOutlined />}
            size="small"
            onClick={() => setIsVisible(false)}
          >
            Hide
          </Button>
        </Tooltip>
      }
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "auto",
        maxWidth: "96vw",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        borderRadius: 12,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
      }}
      styles={{
        body: { padding: "12px 16px" },
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Option Generator
          </div>
          <Space size={6} wrap>
            <Select
              value={mode}
              onChange={setMode}
              options={[
                { value: "upload", label: "Upload" },
                { value: "search", label: "Search" },
              ]}
              style={{ width: 90 }}
              size="small"
            />

            <Input
              placeholder="Label"
              value={optionLabel}
              onChange={(e) => setOptionLabel(e.target.value)}
              style={{ width: 120 }}
              size="small"
            />

            {mode === "upload"
              ? <>
                  <Upload
                    accept="image/*"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={handleUploadChange}
                  >
                    <Button icon={<UploadOutlined />} size="small">
                      Upload Logo
                    </Button>
                  </Upload>
                  <Input
                    size="small"
                    value={uploadedLogoName}
                    placeholder="No file selected"
                    readOnly
                    style={{ width: 150 }}
                  />
                </>
              : <Input
                  placeholder="Product query"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  onPressEnter={handleGenerateAndAddOption}
                  style={{ width: 220 }}
                  size="small"
                  prefix={<SearchOutlined />}
                />}

            <Select
              value={provider}
              onChange={setProvider}
              options={PROVIDER_OPTIONS}
              style={{ width: 190 }}
              size="small"
            />

            <Space.Compact size="small">
              <Select
                value={gridCols}
                onChange={setGridCols}
                options={GRID_OPTIONS}
                style={{ width: 60 }}
                size="small"
              />
              <Select
                value={gridRows}
                onChange={setGridRows}
                options={GRID_OPTIONS}
                style={{ width: 60 }}
                size="small"
              />
            </Space.Compact>

            <Select
              value={frameSize}
              onChange={setFrameSize}
              options={FRAME_SIZE_OPTIONS}
              style={{ width: 90 }}
              size="small"
            />

            <Space size={4}>
              <Switch
                checked={generateGif}
                onChange={setGenerateGif}
                size="small"
              />
              <span style={{ fontSize: 12, color: "#475569" }}>GIF</span>
            </Space>

            <Tooltip title="Generate sprite and add this option to the world">
              <Button
                type="primary"
                size="small"
                onClick={handleGenerateAndAddOption}
                loading={loading.generateOption}
                disabled={!canGenerateOption}
              >
                Generate + Add
              </Button>
            </Tooltip>
          </Space>
        </div>

        <Divider type="vertical" style={{ height: 56 }} />

        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
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
            <Divider type="vertical" style={{ height: 56 }} />

            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
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
