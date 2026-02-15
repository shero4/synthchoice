"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Spin,
  Typography,
  Table,
  Tabs,
  Empty,
  List,
  Statistic,
  Row,
  Col,
  message,
} from "antd";
import {
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import {
  getExperiment,
  getAlternatives,
  getRuns,
  deleteExperiment,
} from "@/lib/firebase/db";

const { Title, Text } = Typography;

/**
 * Experiment Detail Page - view experiment overview
 */
export default function ExperimentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { experimentId } = params;

  const [experiment, setExperiment] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load experiment data
  useEffect(() => {
    const load = async () => {
      try {
        const [exp, alts, runList] = await Promise.all([
          getExperiment(experimentId),
          getAlternatives(experimentId),
          getRuns(experimentId),
        ]);
        setExperiment(exp);
        setAlternatives(alts);
        setRuns(runList);
      } catch (error) {
        console.error("Error loading experiment:", error);
        message.error("Failed to load experiment");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [experimentId]);

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteExperiment(experimentId);
      message.success("Experiment deleted");
      router.push("/");
    } catch (error) {
      console.error("Error deleting:", error);
      message.error("Failed to delete experiment");
    }
  };

  // Get status color
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!experiment) {
    return (
      <Card>
        <Empty description="Experiment not found">
          <Link href="/">
            <Button type="primary">Go Home</Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  // Feature columns for alternatives table
  const featureColumns = (experiment.featureSchema?.features || []).map((f) => ({
    title: f.label || f.key,
    dataIndex: ["features", f.key],
    key: f.key,
  }));

  const alternativeColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    ...featureColumns,
  ];

  // Runs columns
  const runColumns = [
    { title: "Run ID", dataIndex: "id", key: "id", width: 200 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "complete" ? "green" : status === "running" ? "blue" : "default"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Progress",
      key: "progress",
      render: (_, record) =>
        `${record.progress?.completedTasks || 0} / ${record.progress?.totalTasks || 0}`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Link href={`/experiments/${experimentId}/results/${record.id}`}>
          <Button icon={<BarChartOutlined />} size="small">
            Results
          </Button>
        </Link>
      ),
    },
  ];

  const tabItems = [
    {
      key: "overview",
      label: "Overview",
      children: (
        <Row gutter={24}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Alternatives"
                value={alternatives.length}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Agents"
                value={experiment.agentPlan?.totalAgents || 0}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Segments"
                value={experiment.agentPlan?.segments?.length || 0}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: "alternatives",
      label: `Alternatives (${alternatives.length})`,
      children: (
        <Table
          dataSource={alternatives}
          columns={alternativeColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: "segments",
      label: `Segments (${experiment.agentPlan?.segments?.length || 0})`,
      children: (
        <List
          dataSource={experiment.agentPlan?.segments || []}
          renderItem={(segment) => (
            <List.Item>
              <List.Item.Meta
                title={segment.label}
                description={`${segment.count} agents • ${segment.traits?.location || "No location"} • ${segment.traits?.personality || "No personality"}`}
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: "runs",
      label: `Runs (${runs.length})`,
      children: (
        <Table
          dataSource={runs}
          columns={runColumns}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{
            emptyText: (
              <Empty description="No runs yet">
                <Link href={`/experiments/${experimentId}/run`}>
                  <Button type="primary" icon={<PlayCircleOutlined />}>
                    Start First Run
                  </Button>
                </Link>
              </Empty>
            ),
          }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <Link href="/">
              <Button icon={<ArrowLeftOutlined />}>Back</Button>
            </Link>
            <Title level={3} style={{ margin: 0 }}>
              {experiment.name || "Untitled Experiment"}
            </Title>
            <Tag color={getStatusColor(experiment.status)}>
              {experiment.status}
            </Tag>
          </Space>
          <Space>
            <Button icon={<EditOutlined />} disabled>
              Edit
            </Button>
            <Link href={`/experiments/${experimentId}/run`}>
              <Button type="primary" icon={<PlayCircleOutlined />}>
                Run Experiment
              </Button>
            </Link>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Delete
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Description */}
      {experiment.description && (
        <Card style={{ marginBottom: 24 }}>
          <Text>{experiment.description}</Text>
        </Card>
      )}

      {/* Configuration */}
      <Card title="Configuration" style={{ marginBottom: 24 }}>
        <Descriptions column={3}>
          <Descriptions.Item label="Total Agents">
            {experiment.agentPlan?.totalAgents || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Segments">
            {experiment.agentPlan?.segments?.length || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Features">
            {experiment.featureSchema?.features?.length || 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
