"use client";

import { useEffect, useRef } from "react";

import { createSimWorld } from "@/lib/simworld/SimWorldRuntime";

export default function SimWorldCanvas({ onReady, onProgress }) {
  const containerRef = useRef(null);
  const runtimeRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    let mounted = true;
    const runtime = createSimWorld();
    runtimeRef.current = runtime;

    // Simulate progress updates during initialization
    let progressInterval;
    let currentProgress = 0;
    
    const updateProgress = () => {
      if (currentProgress < 90) {
        currentProgress += Math.random() * 15 + 5;
        currentProgress = Math.min(currentProgress, 90);
        onProgressRef.current?.(Math.round(currentProgress));
      }
    };

    onProgressRef.current?.(10);
    progressInterval = setInterval(updateProgress, 200);

    runtime
      .attach(containerRef.current)
      .then(() => {
        clearInterval(progressInterval);
        if (mounted) {
          onProgressRef.current?.(100);
          onReadyRef.current?.(runtime);
        }
      })
      .catch((error) => {
        clearInterval(progressInterval);
        // Surface canvas init failures so they are visible in browser console.
        console.error("SimWorld attach failed:", error);
      });

    return () => {
      mounted = false;
      clearInterval(progressInterval);
      runtime.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: 1280,
        height: "100%",
        minHeight: 500,
        background: "#2d5a27",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
      }}
    />
  );
}
