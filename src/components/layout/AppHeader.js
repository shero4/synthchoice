"use client";

import { Layout, Menu, Button, Space, Typography } from "antd";
import { ExperimentOutlined, HomeOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Header } = Layout;
const { Text } = Typography;

/**
 * Main application header with navigation
 */
export function AppHeader() {
  const pathname = usePathname();

  // Determine active menu key based on pathname
  const getSelectedKey = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/experiments")) return "experiments";
    return "";
  };

  const menuItems = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: <Link href="/">Home</Link>,
    },
    {
      key: "experiments",
      icon: <ExperimentOutlined />,
      label: <Link href="/">Experiments</Link>,
    },
  ];

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "#001529",
      }}
    >
      <Space>
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Text
            strong
            style={{
              color: "#fff",
              fontSize: 18,
              marginRight: 32,
            }}
          >
            SynthChoice
          </Text>
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{
            flex: 1,
            minWidth: 200,
            background: "transparent",
            borderBottom: "none",
          }}
        />
      </Space>
      <Link href="/experiments/new">
        <Button type="primary" icon={<PlusOutlined />}>
          New Experiment
        </Button>
      </Link>
    </Header>
  );
}
