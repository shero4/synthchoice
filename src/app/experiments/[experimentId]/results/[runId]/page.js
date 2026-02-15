"use client";

import { useEffect, useState, useCallback } from "react";
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

const { Text } = Typography;

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

  // Compute and save results
  const computeAndSaveResults = useCallback(async (exp, alts) => {
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
  }, [experimentId, runId]);

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
          await computeAndSaveResults(exp, alts);
        }
      } catch (error) {
        console.error("Error loading results:", error);
        message.error("Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [experimentId, runId, computeAndSaveResults]);

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
      <div className="page-container">
        <div style={{ textAlign: "center", padding: 96 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#64748b' }}>Loading results...</p>
        </div>
      </div>
    );
  }

  if (!experiment || !run) {
    return (
      <div className="page-container">
        <Card style={{ borderRadius: 16 }}>
          <Empty description="Results not found">
            <Link href="/">
              <Button type="primary" style={{ borderRadius: 8 }}>Go Home</Button>
            </Link>
          </Empty>
        </Card>
      </div>
    );
  }

  const features = experiment.featureSchema?.features || [];
  const segments = experiment.agentPlan?.segments || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Link href={`/experiments/${experimentId}`}>
              <Button 
                icon={<ArrowLeftOutlined />}
                type="text"
                style={{ color: '#64748b' }}
              >
                Back to Experiment
              </Button>
            </Link>
          </Space>
          <h1 className="page-header-title">
            Results: <span className="gradient-text">{experiment.name || "Untitled"}</span>
          </h1>
          <p className="page-header-subtitle">
            Run ID: {runId?.slice(0, 8)}... • Status: {run.status}
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRecompute}
            loading={computing}
            style={{ borderRadius: 8 }}
          >
            Recompute
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            style={{ borderRadius: 8 }}
          >
            Export
          </Button>
        </Space>
      </div>

      {/* Run Progress Card */}
      <Card 
        style={{ marginBottom: 24, borderRadius: 14, border: '1px solid #e2e8f0' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Row gutter={32} align="middle">
          <Col>
            <Text type="secondary" style={{ fontSize: 13 }}>Tasks Completed</Text>
            <div style={{ fontWeight: 600, fontSize: 18, color: '#0f172a' }}>
              {run.progress?.completedTasks || 0} / {run.progress?.totalTasks || 0}
            </div>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 13 }}>Computed At</Text>
            <div style={{ fontWeight: 500, color: '#0f172a' }}>
              {results?.computedAt
                ? new Date(results.computedAt.seconds * 1000).toLocaleString()
                : "Not computed"}
            </div>
          </Col>
        </Row>
      </Card>

      {computing ? (
        <Card style={{ borderRadius: 14 }}>
          <div style={{ textAlign: "center", padding: 64 }}>
            <Spin size="large" />
            <Text style={{ display: "block", marginTop: 16, color: '#64748b' }}>
              Computing results...
            </Text>
          </div>
        </Card>
      ) : !results ? (
        <Card style={{ borderRadius: 14 }}>
          <Empty description="No results available">
            {run.status !== "complete" ? (
              <Text type="secondary">
                Run is not complete. Complete the run to see results.
              </Text>
            ) : (
              <Button type="primary" onClick={handleRecompute} style={{ borderRadius: 8 }}>
                Compute Results
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: '#3b82f6' }}>
                  {run.progress?.completedTasks || 0}
                </div>
                <div className="stat-card-label">Total Responses</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: '#8b5cf6' }}>
                  {alternatives.length}
                </div>
                <div className="stat-card-label">Alternatives</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: '#10b981' }}>
                  {segments.length}
                </div>
                <div className="stat-card-label">Segments</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: '#f59e0b' }}>
                  {features.length}
                </div>
                <div className="stat-card-label">Features</div>
              </div>
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
