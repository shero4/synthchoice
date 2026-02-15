"use client";

import { useEffect, useState } from "react";
import {
  Card,
  List,
  Button,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  message,
} from "antd";
import {
  PlusOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { onAuthChange, ensureAuth } from "@/lib/firebase/auth";
import { getExperiments } from "@/lib/firebase/db";

const { Title, Text, Paragraph } = Typography;

/**
 * Home page - displays list of experiments
 */
export default function HomePage() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Set up auth listener and load experiments
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        try {
          const exps = await getExperiments(authUser.uid);
          if (isMounted) {
            setExperiments(exps);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error loading experiments:", error);
          if (isMounted) {
            message.error("Failed to load experiments");
            setLoading(false);
          }
        }
      } else {
        // Sign in anonymously - don't set loading=false here,
        // wait for the auth callback with the signed-in user
        try {
          await ensureAuth();
        } catch (error) {
          console.error("Auth error:", error);
          if (isMounted) {
            message.error("Authentication failed");
            setLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Get status tag color
  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "default";
      case "ready":
        return "green";
      case "archived":
        return "gray";
      default:
        return "default";
    }
  };

  return (
    <div>
      {/* Hero section */}
      <Card style={{ marginBottom: 24 }}>
        <Space orientation="vertical" size="small">
          <Title level={2} style={{ margin: 0 }}>
            Welcome to SynthChoice
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, maxWidth: 600 }}>
            Simulate minds, predict decisions. Create choice-based experiments
            to understand how different personas evaluate your alternatives.
          </Paragraph>
          <Link href="/experiments/new">
            <Button type="primary" icon={<PlusOutlined />} size="large">
              Create New Experiment
            </Button>
          </Link>
        </Space>
      </Card>

      {/* Experiments list */}
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>Your Experiments</span>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : experiments.length === 0 ? (
          <Empty
            description="No experiments yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Link href="/experiments/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Create your first experiment
              </Button>
            </Link>
          </Empty>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={experiments}
            renderItem={(experiment) => (
              <List.Item
                actions={[
                  <Link key="view" href={`/experiments/${experiment.id}`}>
                    <Button>View</Button>
                  </Link>,
                  <Link key="run" href={`/experiments/${experiment.id}/run`}>
                    <Button icon={<PlayCircleOutlined />}>Run</Button>
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <ExperimentOutlined
                      style={{ fontSize: 24, color: "#1890ff" }}
                    />
                  }
                  title={
                    <Space>
                      <Link href={`/experiments/${experiment.id}`}>
                        {experiment.name || "Untitled Experiment"}
                      </Link>
                      <Tag color={getStatusColor(experiment.status)}>
                        {experiment.status}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space orientation="vertical" size={0}>
                      <Text type="secondary">
                        {experiment.description || "No description"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {experiment.agentPlan?.totalAgents || 0} agents •{" "}
                        {experiment.featureSchema?.features?.length || 0}{" "}
                        features
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
