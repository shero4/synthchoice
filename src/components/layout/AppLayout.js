"use client";

import { Typography, Space } from "antd";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";

const { Text } = Typography;

/**
 * Main application layout wrapper
 */
export function AppLayout({ children }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div style={{ minHeight: "100vh", background: isHomePage ? "transparent" : "#f5f5f5" }}>
      <AppHeader transparent={isHomePage} />
      <main
        style={{
          paddingTop: isHomePage ? 0 : 24,
          paddingBottom: isHomePage ? 0 : 24,
          paddingLeft: isHomePage ? 0 : 48,
          paddingRight: isHomePage ? 0 : 48,
        }}
      >
        <div
          style={{
            maxWidth: isHomePage ? "none" : 1400,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {children}
        </div>
      </main>
      {!isHomePage && (
        <footer
          style={{
            textAlign: "center",
            background: "#0a0a1a",
            color: "rgba(255,255,255,0.65)",
            padding: "32px 48px",
          }}
        >
          <Space direction="vertical" size={8}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              SynthChoice
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
              Simulate minds. Predict decisions.
            </Text>
          </Space>
        </footer>
      )}
    </div>
  );
}
