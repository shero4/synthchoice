"use client";

import { useEffect, useRef } from "react";

import { createSimWorld } from "@/lib/simworld/SimWorldRuntime";

export default function SimWorldCanvas({ onReady }) {
  const containerRef = useRef(null);
  const runtimeRef = useRef(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let mounted = true;
    const runtime = createSimWorld();
    runtimeRef.current = runtime;

    runtime
      .attach(containerRef.current)
      .then(() => {
        if (mounted) {
          onReadyRef.current?.(runtime);
        }
      })
      .catch((error) => {
        // Surface canvas init failures so they are visible in browser console.
        console.error("SimWorld attach failed:", error);
      });

    return () => {
      mounted = false;
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
        borderRadius: 8,
        overflow: "hidden",
      }}
    />
  );
}
