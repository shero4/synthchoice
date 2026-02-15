"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  Spin,
  Empty,
  Button,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Descriptions,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import {
  SharesPanel,
  SegmentBreakdown,
  FeatureImportancePanel,
} from "@/components/results";
import {
  getExperiment,
  getAlternatives,
  getRun,
  getResponses,
  getResultsSummary,
  saveResultsSummary,
} from "@/lib/firebase/db";
import { computeResults } from "@/lib/domain/aggregate";

const { Title, Text } = Typography;

/**
 * Results Page - display run results and analysis
 */
export default function ResultsPage() {
  const params = useParams();
  const { experimentId, runId } = params;

  const [experiment, setExperiment] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [run, setRun] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [exp, alts, runData, cachedResults] = await Promise.all([
          getExperiment(experimentId),
          getAlternatives(experimentId),
          getRun(experimentId, runId),
          getResultsSummary(experimentId, runId),
        ]);

        setExperiment(exp);
        setAlternatives(alts);
        setRun(runData);

        if (cachedResults) {
          setResults(cachedResults);
        } else if (runData?.status === "complete") {
          // Compute results if not cached
          await computeAndSaveResults(exp, alts, runData);
        }
      } catch (error) {
        console.error("Error loading results:", error);
        message.error("Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [experimentId, runId]);

  // Compute and save results
  const computeAndSaveResults = async (exp, alts, runData) => {
    setComputing(true);
    try {
      const responses = await getResponses(experimentId, runId);

      const computed = computeResults({
        responses,
        alternatives: alts,
        features: exp.featureSchema?.features || [],
        segments: exp.agentPlan?.segments || [],
      });

      setResults(computed);

      // Cache results
      await saveResultsSummary(experimentId, runId, computed);
    } catch (error) {
      console.error("Error computing results:", error);
      message.error("Failed to compute results");
    } finally {
      setComputing(false);
    }
  };

  // Handle recompute
  const handleRecompute = () => {
    if (experiment && alternatives.length > 0 && run) {
      computeAndSaveResults(experiment, alternatives, run);
    }
  };

  // Handle export (placeholder)
  const handleExport = () => {
    // TODO: Implement CSV/JSON export
    message.info("Export feature coming soon");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!experiment || !run) {
    return (
      <Card>
        <Empty description="Results not found">
          <Link href="/">
            <Button type="primary">Go Home</Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  const features = experiment.featureSchema?.features || [];
  const segments = experiment.agentPlan?.segments || [];

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <Link href={`/experiments/${experimentId}`}>
              <Button icon={<ArrowLeftOutlined />}>Back to Experiment</Button>
            </Link>
            <Title level={3} style={{ margin: 0 }}>
              Results: {experiment.name || "Untitled"}
            </Title>
          </Space>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRecompute}
              loading={computing}
            >
              Recompute
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Run info */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={4}>
          <Descriptions.Item label="Run ID">{runId}</Descriptions.Item>
          <Descriptions.Item label="Status">{run.status}</Descriptions.Item>
          <Descriptions.Item label="Tasks Completed">
            {run.progress?.completedTasks || 0} /{" "}
            {run.progress?.totalTasks || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Computed">
            {results?.computedAt
              ? new Date(results.computedAt.seconds * 1000).toLocaleString()
              : "Not computed"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {computing ? (
        <Card>
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
            <Text style={{ display: "block", marginTop: 16 }}>
              Computing results...
            </Text>
          </div>
        </Card>
      ) : !results ? (
        <Card>
          <Empty description="No results available">
            {run.status !== "complete" ? (
              <Text type="secondary">
                Run is not complete. Complete the run to see results.
              </Text>
            ) : (
              <Button type="primary" onClick={handleRecompute}>
                Compute Results
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Responses"
                  value={run.progress?.completedTasks || 0}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Alternatives" value={alternatives.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Segments" value={segments.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Features" value={features.length} />
              </Card>
            </Col>
          </Row>

          {/* Choice Shares */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <SharesPanel
                shares={results.shares}
                alternatives={alternatives}
              />
            </Col>
            <Col span={12}>
              <FeatureImportancePanel
                importance={results.featureImportance}
                features={features}
              />
            </Col>
          </Row>

          {/* Segment Breakdown */}
          <div style={{ marginBottom: 24 }}>
            <SegmentBreakdown
              segments={segments}
              sharesBySegment={results.shares?.bySegment || {}}
              importanceBySegment={results.featureImportance?.bySegment || {}}
              alternatives={alternatives}
              features={features}
            />
          </div>
        </>
      )}
    </div>
  );
}
