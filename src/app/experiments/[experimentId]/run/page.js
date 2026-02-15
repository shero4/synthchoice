"use client";

import { useCallback, useRef, useState } from "react";
import { Progress, Typography } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import SimWorldCanvas from "@/components/simworld/SimWorldCanvas";
import SimWorldSidebar from "@/components/simworld/SimWorldSidebar";
import TestToolbar from "@/components/simworld/TestToolbar";

const { Text, Title } = Typography;

/**
 * SimWorld Runner Page
 *
 * Full-page simulation world with:
 * - PixiJS canvas (left, fills available space)
 * - Sidebar (right, 300px, sprite list + action logs)
 * - Floating test toolbar (bottom center overlay)
 */
export default function RunnerPage() {
  const runtimeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sprites, setSprites] = useState([]);
  const [options, setOptions] = useState([]);
  const [actionLog, setActionLog] = useState([]);

  const handleReady = useCallback((runtime) => {
    runtimeRef.current = runtime;

    // Subscribe to all action events
    runtime.onAction((event) => {
      setActionLog((prev) => [...prev, event]);

      // Refresh sprites list on spawn/remove/exit
      if (
        event.type === "sprite.added" ||
        event.type === "sprite.removed" ||
        event.type === "exit"
      ) {
        setSprites(runtime.getSprites());
      }

      // Refresh options list on add/remove
      if (event.type === "option.added" || event.type === "option.removed") {
        setOptions(runtime.getOptions());
      }
    });

    setReady(true);
    setLoading(false);
    setLoadingProgress(100);
  }, []);

  const handleProgress = useCallback((progress) => {
    setLoadingProgress(progress);
  }, []);

  /** Called by toolbar after any mutation to sync React state */
  const handleUpdate = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setSprites(runtime.getSprites());
    setOptions(runtime.getOptions());
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 64px)",
        width: "100%",
        overflow: "hidden",
        background: "#f5f5f5",
      }}
    >
      {/* Canvas area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.95)",
              zIndex: 10,
              gap: 16,
            }}
          >
            <PlayCircleOutlined
              style={{ fontSize: 48, color: "#1890ff", opacity: 0.8 }}
            />
            <Title level={4} style={{ margin: 0, color: "#374151" }}>
              Initializing SimWorld
            </Title>
            <div style={{ width: 280 }}>
              <Progress
                percent={loadingProgress}
                status="active"
                strokeColor={{
                  "0%": "#1890ff",
                  "100%": "#52c41a",
                }}
                size="small"
              />
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Loading assets and preparing the simulation...
            </Text>
          </div>
        )}

        <SimWorldCanvas onReady={handleReady} onProgress={handleProgress} />
      </div>

      {/* Sidebar */}
      <SimWorldSidebar sprites={sprites} actionLog={actionLog} />

      {/* Floating test toolbar */}
      {ready && (
        <TestToolbar
          runtime={runtimeRef.current}
          sprites={sprites}
          options={options}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
