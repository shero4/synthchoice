"use client";

import { Button, Space } from "antd";
import {
  RocketOutlined,
  ArrowDownOutlined,
  TeamOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { WanderingAgents } from "./WanderingAgents";

/**
 * Pixel art decorative elements for the world
 */
function PixelDecorations() {
  return (
    <>
      {/* Decorative pixel trees/plants scattered around */}
      <div className="pixel-decorations">
        {/* Left side decorations */}
        <div className="pixel-tree" style={{ left: "5%", bottom: "15%" }} />
        <div className="pixel-plant" style={{ left: "12%", bottom: "25%" }} />
        <div className="pixel-desk" style={{ left: "8%", bottom: "40%" }} />

        {/* Right side decorations */}
        <div className="pixel-tree" style={{ right: "8%", bottom: "20%" }} />
        <div className="pixel-plant" style={{ right: "15%", bottom: "30%" }} />
        <div className="pixel-couch" style={{ right: "5%", bottom: "45%" }} />

        {/* Floating elements */}
        <div className="pixel-cloud" style={{ left: "20%", top: "10%" }} />
        <div className="pixel-cloud" style={{ right: "25%", top: "15%" }} />
        <div className="pixel-bird" style={{ right: "40%", top: "8%" }} />
      </div>
    </>
  );
}

/**
 * Animated title with modern gradient effect
 */
function AnimatedTitle() {
  return (
    <div className="hero-title">
      <h1
        style={{
          fontSize: "clamp(3rem, 8vw, 5rem)",
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          fontFamily: "var(--font-display)",
        }}
      >
        <span
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Synth
        </span>
        <span
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Choice
        </span>
      </h1>
    </div>
  );
}

/**
 * LandingHero - Full-screen hero section with animated agents
 */
export function LandingHero({ onScrollToExperiments }) {
  const handleScrollClick = () => {
    if (onScrollToExperiments) {
      onScrollToExperiments();
    }
  };

  return (
    <div
      className="landing-hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: `
          linear-gradient(180deg, 
            #e8f4fd 0%, 
            #d4e9f7 30%,
            #c7e2b4 70%,
            #a8d08d 100%
          )
        `,
      }}
    >
      {/* Animated background grid */}
      <div
        className="hero-grid"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(24, 144, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(24, 144, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Pixel decorations */}
      <PixelDecorations />

      {/* Main content - top half */}
      <div
        className="hero-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px 24px 48px", // Extra top padding for fixed header
          position: "relative",
          zIndex: 10,
          textAlign: "center",
        }}
      >
        {/* Tagline */}
        <div
          className="hero-badge"
          style={{
            background: "rgba(24, 144, 255, 0.1)",
            border: "1px solid rgba(24, 144, 255, 0.3)",
            borderRadius: 24,
            padding: "8px 20px",
            marginBottom: 24,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#1890ff",
              boxShadow: "0 0 8px rgba(24, 144, 255, 0.6)",
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1890ff",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "var(--font-sans)",
            }}
          >
            AI-Powered Decision Simulation
          </span>
        </div>

        <AnimatedTitle />

        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            maxWidth: 580,
            margin: "24px 0 36px",
            color: "#4a5568",
            lineHeight: 1.7,
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
          }}
        >
          Simulate diverse minds. Predict real decisions. Create choice experiments
          with AI agents that think, deliberate, and choose — just like your users would.
        </p>

        <Space size="large" wrap style={{ justifyContent: "center" }}>
          <Link href="/experiments/new">
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              className="cta-button"
              style={{
                height: 52,
                padding: "0 36px",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 10,
                fontFamily: "var(--font-sans)",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                boxShadow: "0 8px 24px rgba(59, 130, 246, 0.35)",
              }}
            >
              Start an Experiment
            </Button>
          </Link>
        </Space>

        {/* Stats/features */}
        <div
          className="hero-stats"
          style={{
            display: "flex",
            gap: 32,
            marginTop: 48,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { id: "mbti", icon: TeamOutlined, label: "16 MBTI Types", desc: "Personality coverage", color: "#3b82f6" },
            { id: "demo", icon: GlobalOutlined, label: "50+ Demographics", desc: "Diverse segments", color: "#8b5cf6" },
            { id: "speed", icon: ThunderboltOutlined, label: "Instant Results", desc: "Real-time simulation", color: "#f59e0b" },
          ].map((stat) => (
            <div
              key={stat.id}
              style={{
                textAlign: "center",
                padding: "20px 28px",
                background: "rgba(255,255,255,0.7)",
                borderRadius: 16,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.8)",
              }}
            >
              <stat.icon style={{ fontSize: 28, color: stat.color, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, color: "#1a1a2e", fontSize: 15, fontFamily: "var(--font-sans)" }}>{stat.label}</div>
              <div style={{ fontSize: 13, color: "#666", fontFamily: "var(--font-sans)" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wandering agents - bottom section */}
      <div
        className="hero-agents-section"
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {/* Divider/horizon line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, rgba(139, 195, 74, 0.5), transparent)",
          }}
        />

        {/* The wandering agents area */}
        <WanderingAgents agentCount={8} height={280} />

        {/* Ground decoration */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#7cb342",
          }}
        />
      </div>

      {/* Scroll indicator */}
      <button
        type="button"
        onClick={handleScrollClick}
        className="scroll-indicator"
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 24,
          padding: "12px 24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          zIndex: 100,
          animation: "bounce 2s infinite",
          fontFamily: "var(--font-sans)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: "#4a5568" }}>
          View Your Experiments
        </span>
        <ArrowDownOutlined style={{ color: "#3b82f6" }} />
      </button>
    </div>
  );
}
