"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Space,
  Tag,
  Spin,
  Typography,
  Table,
  Tabs,
  Empty,
  List,
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

const { Text } = Typography;

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
      <div className="page-container">
        <div style={{ textAlign: "center", padding: 96 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#64748b' }}>Loading experiment...</p>
        </div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="page-container">
        <Card style={{ borderRadius: 16 }}>
          <Empty description="Experiment not found">
            <Link href="/">
              <Button type="primary" style={{ borderRadius: 8 }}>Go Home</Button>
            </Link>
          </Empty>
        </Card>
      </div>
    );
  }

  // Feature columns for alternatives table
  const featureColumns = (experiment.featureSchema?.features || []).map((f) => ({
    title: f.label || f.key,
    dataIndex: ["features", f.key],
    key: f.key,
    render: (value) => {
      if (f.type === "binary") {
        return value ? "Yes" : "No";
      }
      if (f.type === "continuous" && f.unit) {
        return `${value} ${f.unit}`;
      }
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return <Text type="secondary">-</Text>;
      }
      return String(value);
    },
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Link href="/">
              <Button 
                icon={<ArrowLeftOutlined />} 
                type="text"
                style={{ color: '#64748b' }}
              >
                Back
              </Button>
            </Link>
          </Space>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-header-title">
              {experiment.name || "Untitled Experiment"}
            </h1>
            <Tag 
              color={getStatusColor(experiment.status)}
              style={{ fontSize: 12, padding: '2px 10px' }}
            >
              {experiment.status}
            </Tag>
          </div>
          {experiment.description && (
            <p className="page-header-subtitle" style={{ marginTop: 8, maxWidth: 600 }}>
              {experiment.description}
            </p>
          )}
        </div>
        <Space>
          <Link href={`/experiments/${experimentId}/edit`}>
            <Button icon={<EditOutlined />} style={{ borderRadius: 8 }}>
              Edit
            </Button>
          </Link>
          <Link href={`/experiments/${experimentId}/run`}>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              style={{ 
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                border: 'none',
              }}
            >
              Run Experiment
            </Button>
          </Link>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={handleDelete}
            style={{ borderRadius: 8 }}
          >
            Delete
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <div className="stat-card">
            <div className="stat-card-value">{experiment.agentPlan?.totalAgents || 0}</div>
            <div className="stat-card-label">Total Agents</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="stat-card">
            <div className="stat-card-value">{experiment.agentPlan?.segments?.length || 0}</div>
            <div className="stat-card-label">Segments</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="stat-card">
            <div className="stat-card-value">{experiment.featureSchema?.features?.length || 0}</div>
            <div className="stat-card-label">Features</div>
          </div>
        </Col>
      </Row>

      {/* Tabs */}
      <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
