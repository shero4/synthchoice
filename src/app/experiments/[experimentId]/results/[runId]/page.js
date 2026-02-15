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
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import {
  SharesChartPanel,
  FeatureImportancePanel,
  PartWorthPanel,
  ChoiceDriversPanel,
  WTPPanel,
  ConfidencePanel,
  SegmentBreakdown,
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
 * Results Page - display run results and conjoint analysis
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
  const computeAndSaveResults = useCallback(
    async (exp, alts) => {
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
    },
    [experimentId, runId],
  );

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
      computeAndSaveResults(experiment, alternatives);
    }
  };

  // Handle export
  const handleExport = () => {
    if (!results) return;
    try {
      const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `results-${runId?.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Results exported");
    } catch {
      message.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: "center", padding: 96 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: "#64748b" }}>
            Loading results...
          </p>
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
              <Button type="primary" style={{ borderRadius: 8 }}>
                Go Home
              </Button>
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
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Link href={`/experiments/${experimentId}`}>
              <Button
                icon={<ArrowLeftOutlined />}
                type="text"
                style={{ color: "#64748b" }}
              >
                Back to Experiment
              </Button>
            </Link>
          </Space>
          <h1 className="page-header-title">
            Results:{" "}
            <span className="gradient-text">
              {experiment.name || "Untitled"}
            </span>
          </h1>
          <p className="page-header-subtitle">
            Run ID: {runId?.slice(0, 8)}... &bull; Status: {run.status}
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
            disabled={!results}
            style={{ borderRadius: 8 }}
          >
            Export JSON
          </Button>
        </Space>
      </div>

      {/* ── Run Progress ────────────────────────────────────── */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 14,
          border: "1px solid #e2e8f0",
        }}
        styles={{ body: { padding: "16px 24px" } }}
      >
        <Row gutter={32} align="middle">
          <Col>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tasks Completed
            </Text>
            <div style={{ fontWeight: 600, fontSize: 18, color: "#0f172a" }}>
              {run.progress?.completedTasks || 0} /{" "}
              {run.progress?.totalTasks || 0}
            </div>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Computed At
            </Text>
            <div style={{ fontWeight: 500, color: "#0f172a" }}>
              {results?.computedAt
                ? new Date(results.computedAt.seconds * 1000).toLocaleString()
                : "Not computed"}
            </div>
          </Col>
        </Row>
      </Card>

      {/* ── Body ────────────────────────────────────────────── */}
      {computing ? (
        <Card style={{ borderRadius: 14 }}>
          <div style={{ textAlign: "center", padding: 64 }}>
            <Spin size="large" />
            <Text
              style={{ display: "block", marginTop: 16, color: "#64748b" }}
            >
              Computing conjoint analysis...
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
              <Button
                type="primary"
                onClick={handleRecompute}
                style={{ borderRadius: 8 }}
              >
                Compute Results
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <>
          {/* ── Summary stats ──────────────────────────────── */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "#3b82f6" }}
                >
                  {results.responseStats?.totalResponses ??
                    run.progress?.completedTasks ??
                    0}
                </div>
                <div className="stat-card-label">Total Responses</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "#8b5cf6" }}
                >
                  {alternatives.length}
                </div>
                <div className="stat-card-label">Alternatives</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "#10b981" }}
                >
                  {segments.length}
                </div>
                <div className="stat-card-label">Segments</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "#f59e0b" }}
                >
                  {features.length}
                </div>
                <div className="stat-card-label">Features</div>
              </div>
            </Col>
          </Row>

          {/* ── Section 1: Choice Shares + Confidence ──────── */}
          <SectionTitle title="Choice Shares & Confidence" />
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <SharesChartPanel
                shares={results.shares}
                alternatives={alternatives}
                segments={segments}
              />
            </Col>
            <Col span={12}>
              <ConfidencePanel
                confidence={results.confidence}
                shares={results.shares}
                alternatives={alternatives}
                responseStats={results.responseStats}
              />
            </Col>
          </Row>

          {/* ── Section 2: Conjoint Estimation ──────────────── */}
          <SectionTitle title="Conjoint Estimation (Part-Worth Utilities)" />
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={results.wtp ? 14 : 24}>
              <PartWorthPanel
                partWorths={results.partWorths}
                features={features}
                segments={segments}
              />
            </Col>
            {results.wtp && (
              <Col span={10}>
                <WTPPanel wtp={results.wtp} features={features} />
              </Col>
            )}
          </Row>

          {/* ── Section 3: Choice Drivers ───────────────────── */}
          <SectionTitle title="Choice Drivers Analysis" />
          <div style={{ marginBottom: 24 }}>
            <ChoiceDriversPanel
              choiceDrivers={results.choiceDrivers}
              alternatives={alternatives}
              features={features}
            />
          </div>

          {/* ── Section 4: Feature Importance ───────────────── */}
          <SectionTitle title="Feature Importance (Reason Codes)" />
          <div style={{ marginBottom: 24 }}>
            <FeatureImportancePanel
              importance={results.featureImportance}
              features={features}
            />
          </div>

          {/* ── Section 5: Segment Breakdown ────────────────── */}
          <SectionTitle title="Segment Breakdown" />
          <div style={{ marginBottom: 24 }}>
            <SegmentBreakdown
              segments={segments}
              sharesBySegment={results.shares?.bySegment || {}}
              importanceBySegment={
                results.featureImportance?.bySegment || {}
              }
              alternatives={alternatives}
              features={features}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Section Title Helper ──────────────────────────────── */

function SectionTitle({ title }) {
  return (
    <Divider
      orientation="left"
      style={{ borderColor: "#e2e8f0", margin: "8px 0 16px" }}
    >
      <Text
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 15,
          color: "#475569",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </Text>
    </Divider>
  );
}
