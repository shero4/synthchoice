"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Upload,
  Button,
  Select,
  Space,
  Typography,
  Spin,
  Alert,
  Row,
  Col,
  Slider,
  Divider,
  InputNumber,
  Switch,
  Image,
  message,
} from "antd";
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { generateSprite } from "./actions";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

/**
 * Animated Sprite Component
 * Renders a sprite sheet as an animated sprite using CSS
 */
function AnimatedSprite({
  spriteSheet,
  frameSize = 128,
  grid = [2, 2],
  frameDuration = 150,
  scale = 1,
  isPlaying = true,
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [cols, rows] = grid;
  const totalFrames = cols * rows;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [isPlaying, frameDuration, totalFrames]);

  // Calculate background position for current frame
  const col = currentFrame % cols;
  const row = Math.floor(currentFrame / cols);
  const bgX = -col * frameSize * scale;
  const bgY = -row * frameSize * scale;

  return (
    <div
      style={{
        width: frameSize * scale,
        height: frameSize * scale,
        backgroundImage: `url(${spriteSheet})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${cols * frameSize * scale}px ${rows * frameSize * scale}px`,
        imageRendering: "pixelated",
        border: "2px solid #d9d9d9",
        borderRadius: 8,
        backgroundColor: "#f5f5f5",
      }}
    />
  );
}

/**
 * Sprite Frame Grid Component
 * Shows all frames of the sprite sheet in a grid
 */
function SpriteFrameGrid({ spriteSheet, frameSize = 128, grid = [2, 2] }) {
  const [cols, rows] = grid;
  const frames = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bgX = -c * frameSize;
      const bgY = -r * frameSize;
      frames.push(
        <div
          key={`${r}-${c}`}
          style={{
            width: frameSize,
            height: frameSize,
            backgroundImage: `url(${spriteSheet})`,
            backgroundPosition: `${bgX}px ${bgY}px`,
            backgroundSize: `${cols * frameSize}px ${rows * frameSize}px`,
            imageRendering: "pixelated",
            border: "1px solid #d9d9d9",
            borderRadius: 4,
          }}
        />
      );
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${frameSize}px)`,
        gap: 8,
      }}
    >
      {frames}
    </div>
  );
}

/**
 * Test Page for Sprite Generation
 */
export default function TestPage() {
  // Form state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [provider, setProvider] = useState("gemini");
  const [frameSize, setFrameSize] = useState(128);
  const [gridCols, setGridCols] = useState(2);
  const [gridRows, setGridRows] = useState(2);
  const [generateGif, setGenerateGif] = useState(true);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Results state
  const [rawImage, setRawImage] = useState(null);
  const [spriteSheet, setSpriteSheet] = useState(null);
  const [gifImage, setGifImage] = useState(null);
  const [metadata, setMetadata] = useState(null);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameDuration, setFrameDuration] = useState(150);
  const [displayScale, setDisplayScale] = useState(2);

  // Handle file selection
  const handleFileChange = (info) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle sprite generation (uses invoke_llm via server action)
  const handleGenerate = async () => {
    if (!logoFile) {
      message.error("Please upload a logo image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      formData.append("provider", provider);
      formData.append("grid", `${gridCols}x${gridRows}`);
      formData.append("frameSize", frameSize.toString());
      formData.append("generateGif", generateGif.toString());

      const data = await generateSprite(formData);

      if (data.error) {
        throw new Error(data.error);
      }

      setRawImage(data.rawImage);
      setSpriteSheet(data.spriteSheet);
      setGifImage(data.gif);
      setMetadata(data.metadata);

      message.success("Sprite generated successfully!");
    } catch (err) {
      console.error("Generation error:", err);
      setError(err.message);
      message.error("Failed to generate sprite");
    } finally {
      setLoading(false);
    }
  };

  // Download helper
  const downloadImage = (dataUrl, filename) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <Title level={2}>Sprite Generator Test</Title>
      <Paragraph type="secondary">
        Upload a brand logo to generate a pixel-art sprite sheet with animation.
      </Paragraph>

      <Row gutter={24}>
        {/* Left Column - Input */}
        <Col xs={24} lg={10}>
          <Card title="Input" style={{ marginBottom: 24 }}>
            {/* Logo Upload */}
            <Dragger
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleFileChange}
              style={{ marginBottom: 16 }}
            >
              {logoPreview ? (
                <div style={{ padding: 16 }}>
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    preview={false}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 150,
                      objectFit: "contain",
                    }}
                  />
                  <p style={{ marginTop: 8, marginBottom: 0 }}>
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <div style={{ padding: 24 }}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag logo image here
                  </p>
                  <p className="ant-upload-hint">
                    Supports PNG, JPG, WebP
                  </p>
                </div>
              )}
            </Dragger>

            <Divider>Generation Settings</Divider>

            {/* Provider Selection */}
            <div style={{ marginBottom: 16 }}>
              <Text strong>AI Provider</Text>
              <Select
                value={provider}
                onChange={setProvider}
                style={{ width: "100%", marginTop: 8 }}
                options={[
                  { value: "openrouter", label: "OpenRouter (Gemini Flash)" },
                  { value: "gemini", label: "Google Gemini (Direct)" },
                  { value: "openai", label: "OpenAI (gpt-4.1-mini)" },
                ]}
              />
            </div>

            {/* Grid Settings */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>Grid Columns</Text>
                <InputNumber
                  min={1}
                  max={8}
                  value={gridCols}
                  onChange={setGridCols}
                  style={{ width: "100%", marginTop: 8 }}
                />
              </Col>
              <Col span={12}>
                <Text strong>Grid Rows</Text>
                <InputNumber
                  min={1}
                  max={8}
                  value={gridRows}
                  onChange={setGridRows}
                  style={{ width: "100%", marginTop: 8 }}
                />
              </Col>
            </Row>

            {/* Frame Size */}
            <div style={{ marginBottom: 16 }}>
              <Text strong>Frame Size (px)</Text>
              <Slider
                min={32}
                max={256}
                step={32}
                value={frameSize}
                onChange={setFrameSize}
                marks={{ 32: "32", 64: "64", 128: "128", 256: "256" }}
              />
            </div>

            {/* Generate GIF */}
            <div style={{ marginBottom: 24 }}>
              <Space>
                <Switch checked={generateGif} onChange={setGenerateGif} />
                <Text>Generate animated GIF</Text>
              </Space>
            </div>

            {/* Generate Button */}
            <Button
              type="primary"
              size="large"
              block
              icon={<PlayCircleOutlined />}
              onClick={handleGenerate}
              loading={loading}
              disabled={!logoFile}
            >
              {loading ? "Generating..." : "Generate Sprite"}
            </Button>

            {error && (
              <Alert
                type="error"
                message={error}
                style={{ marginTop: 16 }}
                closable
                onClose={() => setError(null)}
              />
            )}
          </Card>
        </Col>

        {/* Right Column - Output */}
        <Col xs={24} lg={14}>
          {loading ? (
            <Card style={{ textAlign: "center", padding: 48 }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                Generating sprite sheet... This may take a minute.
              </Paragraph>
            </Card>
          ) : spriteSheet ? (
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {/* Animated Preview */}
              <Card
                title="Animated Preview"
                extra={
                  <Space>
                    <Button
                      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                  </Space>
                }
              >
                <Row gutter={24} align="middle">
                  <Col>
                    <AnimatedSprite
                      spriteSheet={spriteSheet}
                      frameSize={frameSize}
                      grid={[gridCols, gridRows]}
                      frameDuration={frameDuration}
                      scale={displayScale}
                      isPlaying={isPlaying}
                    />
                  </Col>
                  <Col flex="auto">
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>Animation Speed (ms)</Text>
                      <Slider
                        min={50}
                        max={500}
                        value={frameDuration}
                        onChange={setFrameDuration}
                      />
                    </div>
                    <div>
                      <Text strong>Display Scale</Text>
                      <Slider
                        min={1}
                        max={4}
                        step={0.5}
                        value={displayScale}
                        onChange={setDisplayScale}
                        marks={{ 1: "1x", 2: "2x", 3: "3x", 4: "4x" }}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Sprite Sheet & Frames */}
              <Card title="Sprite Sheet">
                <Row gutter={24}>
                  <Col span={12}>
                    <Text strong>Full Sheet</Text>
                    <div style={{ marginTop: 8 }}>
                      <Image
                        src={spriteSheet}
                        alt="Sprite sheet"
                        style={{
                          maxWidth: "100%",
                          imageRendering: "pixelated",
                          border: "1px solid #d9d9d9",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text strong>Individual Frames</Text>
                    <div style={{ marginTop: 8 }}>
                      <SpriteFrameGrid
                        spriteSheet={spriteSheet}
                        frameSize={Math.min(frameSize, 64)}
                        grid={[gridCols, gridRows]}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Downloads */}
              <Card title="Downloads">
                <Space wrap>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadImage(spriteSheet, "sprite_sheet.png")}
                  >
                    Sprite Sheet (PNG)
                  </Button>
                  {rawImage && (
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => downloadImage(rawImage, "raw_output.png")}
                    >
                      Raw Model Output
                    </Button>
                  )}
                  {gifImage && (
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => downloadImage(gifImage, "sprite_animation.gif")}
                    >
                      Animated GIF
                    </Button>
                  )}
                </Space>

                {metadata && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">
                      Generated with {metadata.provider} • Grid: {metadata.grid} • 
                      Frame: {metadata.frameSize}px • Total: {metadata.totalSize}
                    </Text>
                  </div>
                )}
              </Card>

              {/* GIF Preview */}
              {gifImage && (
                <Card title="GIF Preview">
                  <Image
                    src={gifImage}
                    alt="Animated GIF"
                    style={{
                      imageRendering: "pixelated",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                    }}
                  />
                </Card>
              )}

              {/* Raw Output */}
              {rawImage && (
                <Card
                  title="Raw Model Output"
                  extra={<Text type="secondary">Before post-processing</Text>}
                >
                  <Image
                    src={rawImage}
                    alt="Raw model output"
                    style={{
                      maxWidth: "100%",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                    }}
                  />
                </Card>
              )}
            </Space>
          ) : (
            <Card style={{ textAlign: "center", padding: 48 }}>
              <UploadOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <Paragraph type="secondary" style={{ marginTop: 16 }}>
                Upload a logo and click "Generate Sprite" to see results here.
              </Paragraph>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
