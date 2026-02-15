"use client";

import { Button } from "antd";
import { RocketOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Main application header with navigation
 * @param {boolean} transparent - Whether to use transparent background (for landing page)
 */
export function AppHeader({ transparent = false }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <header
      className="app-header"
      style={{
        position: transparent ? "fixed" : "relative",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        background: transparent
          ? "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)"
          : "#0a0a1a",
        transition: "background 0.3s ease",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="SynthChoice logo"
          role="img"
        >
          <title>SynthChoice</title>
          <circle cx="16" cy="16" r="14" fill="url(#logo-gradient)" />
          <path
            d="M10 16C10 13 12 11 16 11C20 11 22 13 22 16C22 19 20 21 16 21"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="16" r="3" fill="white" />
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            fontFamily: "var(--font-display)",
          }}
        >
          <span style={{ color: "#60a5fa" }}>Synth</span>
          <span style={{ color: "#a78bfa" }}>Choice</span>
        </span>
      </Link>

      {/* Right side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {!isHomePage && (
          <Link href="/">
            <Button
              type="text"
              style={{
                color: "rgba(255,255,255,0.8)",
                fontWeight: 500,
              }}
            >
              Home
            </Button>
          </Link>
        )}
        <Link href="/experiments/new">
          <Button
            type="primary"
            icon={<RocketOutlined />}
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              height: 40,
              padding: "0 20px",
              boxShadow: "0 4px 14px rgba(24, 144, 255, 0.4)",
            }}
          >
            New Experiment
          </Button>
        </Link>
      </div>
    </header>
  );
}
