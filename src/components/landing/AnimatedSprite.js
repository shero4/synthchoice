"use client";

import { useEffect, useState, useMemo } from "react";

/**
 * AnimatedSprite - Renders an animated sprite from a sprite sheet
 *
 * Props:
 * - src: Path to sprite sheet image
 * - frameWidth: Width of each frame in pixels
 * - frameHeight: Height of each frame in pixels
 * - frameCount: Number of frames in the animation
 * - fps: Frames per second (default: 8)
 * - scale: Scale factor for rendering (default: 1)
 * - direction: "left" | "right" for horizontal flip (default: "right")
 * - style: Additional styles
 * - className: Additional class names
 */
export function AnimatedSprite({
  src,
  frameWidth = 32,
  frameHeight = 32,
  frameCount = 4,
  fps = 8,
  scale = 2,
  direction = "right",
  style = {},
  className = "",
  paused = false,
}) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frameCount, fps, paused]);

  const spriteStyle = useMemo(
    () => ({
      width: frameWidth * scale,
      height: frameHeight * scale,
      backgroundImage: `url(${src})`,
      backgroundPosition: `-${currentFrame * frameWidth * scale}px 0`,
      backgroundSize: `${frameCount * frameWidth * scale}px ${frameHeight * scale}px`,
      backgroundRepeat: "no-repeat",
      imageRendering: "pixelated",
      transform: direction === "left" ? "scaleX(-1)" : "none",
      ...style,
    }),
    [src, frameWidth, frameHeight, frameCount, scale, currentFrame, direction, style]
  );

  return <div className={`animated-sprite ${className}`} style={spriteStyle} />;
}
