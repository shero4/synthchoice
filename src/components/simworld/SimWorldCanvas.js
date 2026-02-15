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

    runtime.attach(containerRef.current).then(() => {
      if (mounted) {
        onReadyRef.current?.(runtime);
      }
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
        height: "100%",
        minHeight: 500,
        background: "#e8f5e9",
        borderRadius: 8,
        overflow: "hidden",
      }}
    />
  );
}
