"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AnimatedSprite } from "./AnimatedSprite";

// Agent personas with different colors/appearances
const AGENT_PERSONAS = [
  { id: 1, name: "Alex", color: "#f56a00", mbti: "INTJ" },
  { id: 2, name: "Jordan", color: "#7265e6", mbti: "ENFP" },
  { id: 3, name: "Sam", color: "#ffbf00", mbti: "ISTP" },
  { id: 4, name: "Morgan", color: "#00a2ae", mbti: "ESFJ" },
  { id: 5, name: "Casey", color: "#eb2f96", mbti: "INFP" },
  { id: 6, name: "Riley", color: "#52c41a", mbti: "ENTJ" },
  { id: 7, name: "Quinn", color: "#1890ff", mbti: "ISFJ" },
  { id: 8, name: "Taylor", color: "#722ed1", mbti: "ENTP" },
];

// Sprite configurations
const SPRITES = {
  idle_down: { src: "/sprites/char_idle_down.png", frameCount: 4 },
  idle_side: { src: "/sprites/char_idle_side.png", frameCount: 4 },
  idle_up: { src: "/sprites/char_idle_up.png", frameCount: 4 },
  walk_down: { src: "/sprites/char_walk_down.png", frameCount: 6 },
  walk_side: { src: "/sprites/char_walk_side.png", frameCount: 6 },
  walk_up: { src: "/sprites/char_walk_up.png", frameCount: 6 },
};

/**
 * Single wandering agent with AI-like movement
 */
function WanderingAgent({ persona, bounds, scale = 2.5, initialIndex = 0, totalAgents = 1 }) {
  const frameWidth = 32;
  const frameHeight = 32;
  const agentWidth = frameWidth * scale;
  const agentHeight = frameHeight * scale;

  // Movement state - distribute agents evenly across the center portion of the screen
  const [position, setPosition] = useState(() => {
    // Use center 80% of the width, distributed based on agent index
    const usableWidth = bounds.width * 0.8;
    const startX = bounds.width * 0.1; // Start 10% from left
    const segmentWidth = usableWidth / totalAgents;
    const baseX = startX + (initialIndex * segmentWidth) + (Math.random() * segmentWidth * 0.8);
    
    return {
      x: Math.max(0, Math.min(bounds.width - agentWidth, baseX)),
      y: Math.random() * (bounds.height - agentHeight),
    };
  });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [state, setState] = useState("idle"); // "idle" | "walking"
  const [facingDirection, setFacingDirection] = useState("down"); // "up" | "down" | "left" | "right"
  const [showBubble, setShowBubble] = useState(false);

  // Random state changes
  useEffect(() => {
    const changeState = () => {
      const rand = Math.random();

      if (state === "idle") {
        // 70% chance to start walking, 15% to show thought bubble, 15% to stay idle
        if (rand < 0.7) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = 30 + Math.random() * 20; // pixels per second
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          setVelocity({ x: vx, y: vy });
          setState("walking");

          // Set facing direction based on velocity
          if (Math.abs(vx) > Math.abs(vy)) {
            setFacingDirection(vx > 0 ? "right" : "left");
          } else {
            setFacingDirection(vy > 0 ? "down" : "up");
          }
        } else if (rand < 0.85) {
          setShowBubble(true);
          setTimeout(() => setShowBubble(false), 2000 + Math.random() * 1500);
        }
      } else {
        // Stop walking
        setVelocity({ x: 0, y: 0 });
        setState("idle");
      }
    };

    // Random interval between state changes
    const timeout = setTimeout(changeState, 1500 + Math.random() * 3000);
    return () => clearTimeout(timeout);
  }, [state]);

  // Movement animation
  useEffect(() => {
    if (state !== "walking") return;

    let lastTime = performance.now();
    let animationFrame;

    const animate = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setPosition((prev) => {
        let newX = prev.x + velocity.x * deltaTime;
        let newY = prev.y + velocity.y * deltaTime;

        // Bounce off walls
        if (newX < 0 || newX > bounds.width - agentWidth) {
          setVelocity((v) => ({ ...v, x: -v.x }));
          setFacingDirection((d) => (d === "left" ? "right" : d === "right" ? "left" : d));
          newX = Math.max(0, Math.min(bounds.width - agentWidth, newX));
        }
        if (newY < 0 || newY > bounds.height - agentHeight) {
          setVelocity((v) => ({ ...v, y: -v.y }));
          setFacingDirection((d) => (d === "up" ? "down" : d === "down" ? "up" : d));
          newY = Math.max(0, Math.min(bounds.height - agentHeight, newY));
        }

        return { x: newX, y: newY };
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [state, velocity, bounds, agentWidth, agentHeight]);

  // Get current sprite based on state and direction
  const getCurrentSprite = () => {
    const prefix = state === "walking" ? "walk" : "idle";
    if (facingDirection === "up") return SPRITES[`${prefix}_up`];
    if (facingDirection === "down") return SPRITES[`${prefix}_down`];
    return SPRITES[`${prefix}_side`];
  };

  const sprite = getCurrentSprite();
  const flipDirection = facingDirection === "left" ? "left" : "right";

  return (
    <div
      className="wandering-agent"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transition: "none",
        zIndex: Math.floor(position.y),
      }}
    >
      {/* Speech/thought bubble */}
      {showBubble && (
        <div
          className="agent-bubble"
          style={{
            position: "absolute",
            bottom: agentHeight + 4,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 11,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            zIndex: 1000,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            color: "#4a5568",
          }}
        >
          {["Hmm...", "Interesting!", "Choice A?", "Or B...", "Let me think"][
            Math.floor(Math.random() * 5)
          ]}
        </div>
      )}

      {/* Name tag */}
      <div
        className="agent-nametag"
        style={{
          position: "absolute",
          top: -18,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
          padding: "3px 8px",
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          whiteSpace: "nowrap",
          fontFamily: "var(--font-sans)",
        }}
      >
        {persona.name}
      </div>

      {/* Sprite */}
      <div
        style={{
          filter: `drop-shadow(0 2px 2px rgba(0,0,0,0.3))`,
        }}
      >
        <AnimatedSprite
          src={sprite.src}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          frameCount={sprite.frameCount}
          scale={scale}
          direction={flipDirection}
          fps={state === "walking" ? 10 : 6}
        />
      </div>

      {/* Status indicator */}
      <div
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: state === "walking" ? "#52c41a" : "#faad14",
          border: "2px solid white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

/**
 * WanderingAgents - A container with multiple wandering sprite agents
 */
export function WanderingAgents({ agentCount = 8, height = 300 }) {
  const containerRef = useRef(null);
  const [bounds, setBounds] = useState({ width: 800, height });

  // Update bounds on resize
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        setBounds({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, []);

  // Select random personas
  const agents = useMemo(() => {
    const shuffled = [...AGENT_PERSONAS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(agentCount, AGENT_PERSONAS.length));
  }, [agentCount]);

  return (
    <div
      ref={containerRef}
      className="wandering-agents-container"
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        background: "linear-gradient(to bottom, transparent, rgba(139, 195, 74, 0.3))",
      }}
    >
      {/* Ground pattern */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
          background: `
            repeating-linear-gradient(
              90deg,
              rgba(139, 195, 74, 0.15) 0px,
              rgba(139, 195, 74, 0.15) 32px,
              rgba(156, 204, 101, 0.15) 32px,
              rgba(156, 204, 101, 0.15) 64px
            )
          `,
          imageRendering: "pixelated",
        }}
      />

      {/* Agents */}
      {bounds.width > 0 &&
        agents.map((persona, index) => (
          <WanderingAgent
            key={persona.id}
            persona={persona}
            bounds={bounds}
            scale={2.5}
            initialIndex={index}
            totalAgents={agents.length}
          />
        ))}
    </div>
  );
}
