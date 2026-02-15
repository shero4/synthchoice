import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import { StoreProvider } from "@/store/StoreProvider";
import { AppLayout } from "@/components/layout";
import "./globals.css";

export const metadata = {
  title: "SynthChoice - Simulate minds, Predict decisions",
  description:
    "A choice-based experiment simulator for conjoint analysis and decision modeling",
};

// Modern Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: "#3b82f6",
    colorInfo: "#3b82f6",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    borderRadius: 10,
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f8fafc",
    colorBorder: "#e2e8f0",
    colorBorderSecondary: "#f1f5f9",
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    boxShadowSecondary: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  },
  components: {
    Layout: {
      headerBg: "#0f172a",
      bodyBg: "#f8fafc",
      siderBg: "#ffffff",
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    },
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Table: {
      borderRadius: 12,
      headerBg: "#f8fafc",
    },
    Steps: {
      colorPrimary: "#3b82f6",
    },
    Tabs: {
      itemColor: "#64748b",
      itemSelectedColor: "#3b82f6",
      inkBarColor: "#3b82f6",
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <AntdRegistry>
            <ConfigProvider theme={theme}>
              <AppLayout>{children}</AppLayout>
            </ConfigProvider>
          </AntdRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
