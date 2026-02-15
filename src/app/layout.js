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

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: "#1890ff",
    borderRadius: 6,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: "#001529",
      bodyBg: "#f5f5f5",
    },
    Card: {
      borderRadiusLG: 8,
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
