"use client";

import { Layout } from "antd";
import { AppHeader } from "./AppHeader";

const { Content, Footer } = Layout;

/**
 * Main application layout wrapper
 */
export function AppLayout({ children }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader />
      <Content
        style={{
          padding: "24px 48px",
          background: "#f5f5f5",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {children}
        </div>
      </Content>
      <Footer style={{ textAlign: "center", background: "#f5f5f5" }}>
        SynthChoice - Simulate minds, Predict decisions.
      </Footer>
    </Layout>
  );
}
