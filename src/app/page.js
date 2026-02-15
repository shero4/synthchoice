"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  Button,
  Typography,
  Tag,
  Spin,
  message,
} from "antd";
import {
  PlusOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  RocketOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { onAuthChange, ensureAuth } from "@/lib/firebase/auth";
import { getExperiments } from "@/lib/firebase/db";
import { LandingHero } from "@/components/landing";

const { Title, Text, Paragraph } = Typography;

/**
 * Home page - Landing page with hero section and experiments list
 */
export default function HomePage() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const experimentsRef = useRef(null);

  // Set up auth listener and load experiments
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser) {
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

  // Scroll to experiments section
  const scrollToExperiments = () => {
    if (experimentsRef.current) {
      experimentsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Get status tag color
  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "default";
      case "ready":
        return "green";
      case "running":
        return "blue";
      case "completed":
        return "purple";
      case "archived":
        return "gray";
      default:
        return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "running":
        return <ThunderboltOutlined />;
      case "completed":
        return <BarChartOutlined />;
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      {/* Hero Section */}
      <LandingHero onScrollToExperiments={scrollToExperiments} />

      {/* Experiments Section */}
      <div
        ref={experimentsRef}
        className="experiments-section"
        style={{
          padding: "64px 48px",
          minHeight: "60vh",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Section Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            <Title
              level={2}
              style={{
                marginBottom: 12,
                background: "linear-gradient(135deg, #1890ff 0%, #722ed1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Your Experiments
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 16 }}>
              Manage your choice experiments and view simulation results
            </Paragraph>
          </div>

          {/* Experiments Grid/List */}
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 96,
                background: "#fff",
                borderRadius: 16,
              }}
            >
              <Spin size="large" />
              <Paragraph type="secondary" style={{ marginTop: 16 }}>
                Loading your experiments...
              </Paragraph>
            </div>
          ) : experiments.length === 0 ? (
            <Card
              style={{
                textAlign: "center",
                padding: 48,
                borderRadius: 16,
                background: "linear-gradient(135deg, #f6f9fc 0%, #fff 100%)",
              }}
            >
              <div className="empty-state-icon" style={{ marginBottom: 24 }}>
                <ExperimentOutlined
                  style={{ fontSize: 64, color: "#bfbfbf" }}
                />
              </div>
              <Title level={4} type="secondary">
                No experiments yet
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                Start your first experiment to simulate how diverse personas
                make decisions about your product or service.
              </Paragraph>
              <Link href="/experiments/new">
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  style={{
                    height: 48,
                    padding: "0 32px",
                    borderRadius: 8,
                  }}
                >
                  Create Your First Experiment
                </Button>
              </Link>
            </Card>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: 24,
              }}
            >
              {/* Create New Card */}
              <Link href="/experiments/new">
                <Card
                  hoverable
                  className="experiment-card"
                  style={{
                    height: "100%",
                    minHeight: 200,
                    borderRadius: 12,
                    border: "2px dashed #d9d9d9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "linear-gradient(135deg, #fafafa 0%, #fff 100%)",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <PlusOutlined
                      style={{
                        fontSize: 36,
                        color: "#1890ff",
                        marginBottom: 12,
                      }}
                    />
                    <div style={{ color: "#1890ff", fontWeight: 500 }}>
                      New Experiment
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Experiment Cards */}
              {experiments.map((experiment) => (
                <Card
                  key={experiment.id}
                  hoverable
                  className="experiment-card"
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      marginBottom: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Link href={`/experiments/${experiment.id}`}>
                        <Title
                          level={5}
                          style={{ margin: 0, marginBottom: 4 }}
                        >
                          {experiment.name || "Untitled Experiment"}
                        </Title>
                      </Link>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(experiment.createdAt)}
                      </Text>
                    </div>
                    <Tag
                      color={getStatusColor(experiment.status)}
                      icon={getStatusIcon(experiment.status)}
                    >
                      {experiment.status}
                    </Tag>
                  </div>

                  {/* Description */}
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 16, minHeight: 44 }}
                  >
                    {experiment.description || "No description provided"}
                  </Paragraph>

                  {/* Stats */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginBottom: 16,
                      padding: "12px 0",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <TeamOutlined style={{ color: "#1890ff" }} />
                      <Text type="secondary">
                        {experiment.agentPlan?.totalAgents || 0} agents
                      </Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <BarChartOutlined style={{ color: "#722ed1" }} />
                      <Text type="secondary">
                        {experiment.featureSchema?.features?.length || 0} features
                      </Text>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      href={`/experiments/${experiment.id}`}
                      style={{ flex: 1 }}
                    >
                      <Button block>View Details</Button>
                    </Link>
                    <Link href={`/experiments/${experiment.id}/run`}>
                      <Button type="primary" icon={<PlayCircleOutlined />}>
                        Run
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
