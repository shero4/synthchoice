"use client";

import {
  CheckCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  message,
  Progress,
  Space,
  Spin,
  Statistic,
  Typography,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import SimWorldCanvas from "@/components/simworld/SimWorldCanvas";
import SimWorldSidebar from "@/components/simworld/SimWorldSidebar";
import { computeResults } from "@/lib/domain/aggregate";
import { ExperimentRunner, RunnerStatus } from "@/lib/experiment";
import {
  addResponse,
  createRun,
  getAlternatives,
  getExperiment,
  saveResultsSummary,
  updateRun,
} from "@/lib/firebase/db";

const { Text, Title } = Typography;

// ---------------------------------------------------------------------------
// Page states
// ---------------------------------------------------------------------------

const PageState = Object.freeze({
  LOADING: "loading", // fetching experiment data
  INIT_WORLD: "init_world", // SimWorld is attaching
  READY: "ready", // buildings placed, waiting for Run click
  RUNNING: "running", // experiment in progress
  COMPLETE: "complete", // all agents done, waiting for Save
  SAVING: "saving", // persisting to Firebase
  ERROR: "error",
});

// ---------------------------------------------------------------------------
// RunnerPage
// ---------------------------------------------------------------------------

export default function RunnerPage() {
  const params = useParams();
  const router = useRouter();
  const { experimentId } = params;

  // Data
  const [experiment, setExperiment] = useState(null);
  const [alternatives, setAlternatives] = useState([]);

  // Page state
  const [pageState, setPageState] = useState(PageState.LOADING);
  const [errorMsg, setErrorMsg] = useState(null);

  // SimWorld
  const runtimeRef = useRef(null);
  const runnerRef = useRef(null);
  const [worldReady, setWorldReady] = useState(false);

  // Progress
  const [progress, setProgress] = useState({
    status: RunnerStatus.IDLE,
    total: 0,
    completed: 0,
    active: 0,
    deciding: 0,
    pending: 0,
    optionsTotal: 0,
    optionsReady: 0,
    optionsFailed: 0,
    initialSpawnTarget: 0,
    initialSpawned: 0,
  });

  // Sidebar data
  const [sprites, setSprites] = useState([]);
  const [actionLog, setActionLog] = useState([]);

  // Results
  const [results, setResults] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // -----------------------------------------------------------------------
  // Step 1: Load experiment data from Firebase
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [exp, alts] = await Promise.all([
          getExperiment(experimentId),
          getAlternatives(experimentId),
        ]);

        if (cancelled) return;

        if (!exp) {
          setErrorMsg("Experiment not found.");
          setPageState(PageState.ERROR);
          return;
        }

        setExperiment(exp);
        setAlternatives(alts);
        setPageState(PageState.INIT_WORLD);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load experiment:", err);
        setErrorMsg(err.message || "Failed to load experiment data.");
        setPageState(PageState.ERROR);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [experimentId]);

  // -----------------------------------------------------------------------
  // Step 2: SimWorld canvas ready → init ExperimentRunner
  // -----------------------------------------------------------------------
  const handleWorldReady = useCallback((runtime) => {
    runtimeRef.current = runtime;

    // Subscribe to runtime events for sidebar
    runtime.onAction((event) => {
      setActionLog((prev) => [...prev, event]);

      // Refresh sprites list on meaningful changes
      if (
        event.type === "sprite.added" ||
        event.type === "sprite.removed" ||
        event.type === "pick" ||
        event.type === "exit"
      ) {
        setSprites(runtime.getSprites());
      }
    });

    setWorldReady(true);
  }, []);

  // When both data + world are ready → init the runner
  useEffect(() => {
    if (!worldReady || !experiment) return;
    if (pageState !== PageState.INIT_WORLD) return;

    // Validate we have data to work with
    if (!alternatives.length) {
      setErrorMsg(
        "This experiment has no alternatives. Add alternatives before running.",
      );
      setPageState(PageState.ERROR);
      return;
    }

    const segments = experiment?.agentPlan?.segments || [];
    if (!segments.length) {
      setErrorMsg(
        "This experiment has no agent segments configured. Edit the experiment first.",
      );
      setPageState(PageState.ERROR);
      return;
    }

    const runner = new ExperimentRunner({
      runtime: runtimeRef.current,
      experiment,
      alternatives,
      concurrency: 10,
      decisionConcurrency: 6,
      optionSpriteConcurrency: 6,
      onProgress: (p) => {
        setProgress(p);
      },
      onAgentUpdate: (evt) => {
        // Also push agent events to the action log so sidebar picks them up
        setActionLog((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}-${Math.random()}`,
            spriteId: evt.spriteId || evt.agentId,
            type: evt.type,
            detail: evt,
            timestamp: Date.now(),
          },
        ]);
      },
      onComplete: (res) => {
        setResults(res);
      },
    });

    runnerRef.current = runner;

    runner
      .init()
      .then(() => {
        // Refresh sprites list after all agents are spawned
        setSprites(runtimeRef.current.getSprites());
        setPageState(PageState.READY);
      })
      .catch((err) => {
        console.error("Runner init failed:", err);
        setErrorMsg(err.message);
        setPageState(PageState.ERROR);
      });
  }, [worldReady, experiment, alternatives, pageState]);

  // -----------------------------------------------------------------------
  // Step 3: User clicks Run
  // -----------------------------------------------------------------------
  const handleStartRun = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner) return;

    setPageState(PageState.RUNNING);
    setStartTime(Date.now());

    runner.start().catch((err) => {
      console.error("Run failed:", err);
      setErrorMsg(err.message);
      setPageState(PageState.ERROR);
    });
  }, []);

  // Watch for runner completing
  useEffect(() => {
    if (results && pageState === PageState.RUNNING) {
      setPageState(PageState.COMPLETE);
    }
  }, [results, pageState]);

  // -----------------------------------------------------------------------
  // Step 4: Save results
  // -----------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!results || !experiment) return;
    setPageState(PageState.SAVING);

    try {
      // Create the run document
      const runId = await createRun(experimentId, {
        status: "complete",
        progress: {
          totalTasks: results.totalAgents,
          completedTasks: results.completedAgents,
        },
        configSnapshot: {
          featureSchemaVersion: experiment.featureSchema?.version || 1,
          agentPlan: experiment.agentPlan,
        },
        completedAt: new Date(),
      });

      // Save each response
      const validResponses = results.responses.filter((r) => !r.error);
      await Promise.all(
        validResponses.map((r) =>
          addResponse(experimentId, runId, {
            agentId: r.agentId,
            chosen: r.chosenAlternativeId || "NONE",
            confidence: r.confidence,
            reasonCodes: r.reasonCodes,
            explanation: r.reason,
            timings: r.timings,
          }),
        ),
      );

      // Compute and save results summary
      const features = experiment.featureSchema?.features || [];
      const segments = experiment.agentPlan?.segments || [];
      const computed = computeResults({
        responses: validResponses,
        alternatives,
        features,
        segments,
      });
      await saveResultsSummary(experimentId, runId, computed);

      // Update run status
      await updateRun(experimentId, runId, { status: "complete" });

      message.success("Results saved successfully!");
      router.push(`/experiments/${experimentId}/results/${runId}`);
    } catch (err) {
      console.error("Save failed:", err);
      message.error(`Failed to save: ${err.message}`);
      setPageState(PageState.COMPLETE); // let user retry
    }
  }, [results, experiment, experimentId, alternatives, router]);

  // -----------------------------------------------------------------------
  // Progress helpers
  // -----------------------------------------------------------------------
  const progressPercent =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;
  const initOptionsCompleted = progress.optionsReady + progress.optionsFailed;
  const initOptionsPercent =
    progress.optionsTotal > 0
      ? Math.round((initOptionsCompleted / progress.optionsTotal) * 100)
      : 0;

  const getElapsedStr = () => {
    if (!startTime) return "0s";
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  };

  // Re-render timer every second while running
  const [, setTick] = useState(0);
  useEffect(() => {
    if (pageState !== PageState.RUNNING) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [pageState]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const renderTopBar = () => {
    switch (pageState) {
      case PageState.LOADING:
        return (
          <Card size="small">
            <Space>
              <Spin size="small" />
              <Text>Loading experiment data...</Text>
            </Space>
          </Card>
        );

      case PageState.INIT_WORLD:
        return (
          <Card size="small">
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <Space>
                <Spin size="small" />
                <Text>
                  {!worldReady
                    ? "Initializing SimWorld..."
                    : "Preparing houses, sprites, and agents..."}
                </Text>
              </Space>
              {worldReady && progress.status === RunnerStatus.INITIALIZING && (
                <>
                  <Text type="secondary">
                    Option sprites: {initOptionsCompleted}/
                    {progress.optionsTotal} &middot; Initial agents:{" "}
                    {progress.initialSpawned}/{progress.initialSpawnTarget}
                  </Text>
                  <Progress
                    percent={initOptionsPercent}
                    status="active"
                    size="small"
                    strokeColor={{ "0%": "#1677ff", "100%": "#52c41a" }}
                  />
                </>
              )}
            </Space>
          </Card>
        );

      case PageState.READY:
        return (
          <Card size="small">
            <Space
              style={{ width: "100%", justifyContent: "space-between" }}
              align="center"
            >
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  {experiment?.name || "Experiment"}
                </Title>
                <Text type="secondary">
                  {progress.total} agents &middot; {alternatives.length}{" "}
                  alternatives
                </Text>
              </Space>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartRun}
              >
                Run Experiment
              </Button>
            </Space>
          </Card>
        );

      case PageState.RUNNING:
        return (
          <Card size="small">
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
              <Space
                style={{ width: "100%", justifyContent: "space-between" }}
                align="center"
              >
                <Space>
                  <LoadingOutlined style={{ color: "#1890ff" }} />
                  <Title level={5} style={{ margin: 0 }}>
                    Running...
                  </Title>
                  <Text type="secondary">
                    {progress.completed}/{progress.total} agents
                  </Text>
                </Space>
                <Space split={<Text type="secondary">&middot;</Text>}>
                  <Statistic
                    title="Active"
                    value={progress.active}
                    valueStyle={{ fontSize: 14 }}
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  />
                  <Statistic
                    title="Pending"
                    value={progress.pending}
                    valueStyle={{ fontSize: 14 }}
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  />
                  <Statistic
                    title="Deciding"
                    value={progress.deciding}
                    valueStyle={{ fontSize: 14 }}
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  />
                  <Statistic
                    title="Elapsed"
                    value={getElapsedStr()}
                    valueStyle={{ fontSize: 14 }}
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "baseline",
                    }}
                  />
                </Space>
              </Space>
              <Progress
                percent={progressPercent}
                status="active"
                strokeColor={{ "0%": "#1890ff", "100%": "#52c41a" }}
                size="small"
              />
            </Space>
          </Card>
        );

      case PageState.COMPLETE: {
        const totalResponses = results?.responses?.length || 0;
        const errorCount =
          results?.responses?.filter((r) => r.error)?.length || 0;
        const successCount = totalResponses - errorCount;

        return (
          <Card size="small">
            <Space
              style={{ width: "100%", justifyContent: "space-between" }}
              align="center"
            >
              <Space>
                <CheckCircleOutlined
                  style={{ color: "#52c41a", fontSize: 20 }}
                />
                <Title level={5} style={{ margin: 0 }}>
                  Experiment Complete
                </Title>
                <Text type="secondary">
                  {successCount} decisions collected
                  {errorCount > 0 ? `, ${errorCount} errors` : ""}
                </Text>
              </Space>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSave}
              >
                Save Results
              </Button>
            </Space>
          </Card>
        );
      }

      case PageState.SAVING:
        return (
          <Card size="small">
            <Space>
              <Spin size="small" />
              <Text>Saving results to database...</Text>
            </Space>
          </Card>
        );

      case PageState.ERROR:
        return (
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined />}
            message="Error"
            description={errorMsg || "An unexpected error occurred."}
            style={{ borderRadius: 8 }}
          />
        );

      default:
        return null;
    }
  };

  // Should we show the world canvas?
  const showCanvas =
    pageState !== PageState.LOADING && pageState !== PageState.ERROR;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        width: "100%",
        overflow: "hidden",
        background: "#f5f5f5",
      }}
    >
      {/* Top bar */}
      <div style={{ padding: "8px 16px 0 16px", flexShrink: 0 }}>
        {renderTopBar()}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          padding: "8px 16px 16px 16px",
          gap: 0,
        }}
      >
        {/* Canvas area */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showCanvas && (
            <SimWorldCanvas onReady={handleWorldReady} onProgress={() => {}} />
          )}

          {/* Loading overlay when data is loading or world initializing */}
          {(pageState === PageState.LOADING ||
            (pageState === PageState.INIT_WORLD && !worldReady)) && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.95)",
                zIndex: 10,
                gap: 16,
                borderRadius: 12,
              }}
            >
              <PlayCircleOutlined
                style={{ fontSize: 48, color: "#1890ff", opacity: 0.8 }}
              />
              <Title level={4} style={{ margin: 0, color: "#374151" }}>
                {pageState === PageState.LOADING
                  ? "Loading Experiment"
                  : "Initializing SimWorld"}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {pageState === PageState.LOADING
                  ? "Fetching experiment data..."
                  : "Loading assets and preparing the simulation..."}
              </Text>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <SimWorldSidebar sprites={sprites} actionLog={actionLog} />
      </div>
    </div>
  );
}
