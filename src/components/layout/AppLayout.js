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
    <div 
      style={{ 
        minHeight: "100vh", 
        background: isHomePage ? "transparent" : "#f8fafc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppHeader transparent={isHomePage} />
      <main
        style={{
          flex: 1,
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
            background: "#0f172a",
            color: "rgba(255,255,255,0.65)",
            padding: "24px 48px",
            marginTop: "auto",
          }}
        >
          <Space orientation="vertical" size={4}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 14 }}>
              SynthChoice
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              Simulate minds. Predict decisions.
            </Text>
          </Space>
        </footer>
      )}
    </div>
  );
}
