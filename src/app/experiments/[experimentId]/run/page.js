"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Card, Spin, Empty, Button, message } from "antd";
import { ArrowLeftOutlined, BarChartOutlined } from "@ant-design/icons";
import Link from "next/link";
import { RunnerController } from "@/components/runner";
import {
  getExperiment,
  getAlternatives,
  createRun,
  updateRun,
  addTask,
  addResponse,
} from "@/lib/firebase/db";
import { generateTasks } from "@/lib/domain/taskgen";
import { simulateChoice } from "@/lib/domain/simulate";
import {
  initRun,
  setTasks,
  startRun,
  pauseRun,
  resumeRun,
  setCurrentAgent,
  setCurrentTaskIndex,
  addResponse as addResponseAction,
  completeRun,
  failRun,
  resetRunner,
} from "@/store/runnerSlice";

/**
 * Runner Page - execute experiment run
 */
export default function RunnerPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { experimentId } = params;

  const runnerState = useSelector((state) => state.runner);
  const { status, progress, currentTaskIndex, currentAgent } = runnerState;

  const [experiment, setExperiment] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runId, setRunId] = useState(null);
  const [tasks, setLocalTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  // Load experiment data
  useEffect(() => {
    const load = async () => {
      try {
        const [exp, alts] = await Promise.all([
          getExperiment(experimentId),
          getAlternatives(experimentId),
        ]);
        setExperiment(exp);
        setAlternatives(alts);

        // Generate agents from segments
        const generatedAgents = [];
        (exp.agentPlan?.segments || []).forEach((segment) => {
          for (let i = 0; i < segment.count; i++) {
            generatedAgents.push({
              id: `${segment.segmentId}_${i}`,
              segmentId: segment.segmentId,
              label: `${segment.label} #${i + 1}`,
              traits: { ...segment.traits },
              modelTag: segment.modelTag,
              sprite: {
                seed: `${segment.segmentId}_${i}`,
                style: "pixel",
              },
            });
          }
        });
        setAgents(generatedAgents);
      } catch (error) {
        console.error("Error loading experiment:", error);
        message.error("Failed to load experiment");
      } finally {
        setLoading(false);
      }
    };
    load();

    // Cleanup on unmount
    return () => {
      dispatch(resetRunner());
    };
  }, [experimentId, dispatch]);

  // Handle start run
  const handleStart = useCallback(async () => {
    if (!experiment || alternatives.length < 2) {
      message.error("Need at least 2 alternatives to run");
      return;
    }

    try {
      // Create run document
      const newRunId = await createRun(experimentId, {
        status: "running",
        configSnapshot: {
          featureSchemaVersion: experiment.featureSchema?.version || 1,
          choiceFormat: experiment.choiceFormat,
          agentPlan: experiment.agentPlan,
          taskPlan: experiment.taskPlan,
        },
        progress: {
          totalTasks: agents.length * (experiment.taskPlan?.tasksPerAgent || 10),
          completedTasks: 0,
        },
      });
      setRunId(newRunId);
      setStartTime(new Date());

      // Generate tasks
      const generatedTasks = generateTasks({
        agents,
        alternatives,
        choiceFormat: experiment.choiceFormat,
        taskPlan: experiment.taskPlan,
      });
      setLocalTasks(generatedTasks);

      // Initialize Redux state
      dispatch(initRun({ id: newRunId, experimentId }));
      dispatch(setTasks(generatedTasks));
      dispatch(startRun());

      // Process tasks
      processNextTask(generatedTasks, 0, newRunId);
    } catch (error) {
      console.error("Error starting run:", error);
      message.error("Failed to start run");
      dispatch(failRun(error.message));
    }
  }, [experiment, alternatives, agents, experimentId, dispatch]);

  // Process next task
  const processNextTask = useCallback(
    async (taskList, index, currentRunId) => {
      if (isPaused) return;
      if (index >= taskList.length) {
        // All tasks complete
        await updateRun(experimentId, currentRunId, {
          status: "complete",
          completedAt: new Date(),
          progress: {
            totalTasks: taskList.length,
            completedTasks: taskList.length,
          },
        });
        dispatch(completeRun());
        message.success("Run completed!");
        return;
      }

      const task = taskList[index];
      const agent = agents.find((a) => a.id === task.agentId);

      dispatch(setCurrentTaskIndex(index));
      dispatch(setCurrentAgent(agent));

      try {
        // Save task to Firestore
        const taskId = await addTask(experimentId, currentRunId, task);

        // Simulate choice (stub engine)
        const taskAlternatives = task.shownAlternatives
          .map((id) => alternatives.find((a) => a.id === id))
          .filter(Boolean);

        const response = simulateChoice({
          agent,
          alternatives: taskAlternatives,
          features: experiment.featureSchema?.features || [],
          includeNone: experiment.choiceFormat?.includes("NONE"),
        });

        // Save response
        await addResponse(experimentId, currentRunId, {
          taskId,
          agentId: task.agentId,
          ...response,
          timings: {
            startedAt: new Date(),
            endedAt: new Date(),
          },
        });

        dispatch(addResponseAction(response));

        // Update progress in Firestore periodically
        if (index % 10 === 0) {
          await updateRun(experimentId, currentRunId, {
            progress: {
              totalTasks: taskList.length,
              completedTasks: index + 1,
            },
          });
        }

        // Small delay for visual effect, then process next
        setTimeout(() => {
          if (!isPaused) {
            processNextTask(taskList, index + 1, currentRunId);
          }
        }, 50); // Fast for stub simulator
      } catch (error) {
        console.error("Error processing task:", error);
        dispatch(failRun(error.message));
      }
    },
    [agents, alternatives, experiment, experimentId, isPaused, dispatch]
  );

  // Handle pause
  const handlePause = useCallback(() => {
    setIsPaused(true);
    dispatch(pauseRun());
  }, [dispatch]);

  // Handle resume
  const handleResume = useCallback(() => {
    setIsPaused(false);
    dispatch(resumeRun());
    processNextTask(tasks, currentTaskIndex + 1, runId);
  }, [tasks, currentTaskIndex, runId, dispatch, processNextTask]);

  // Handle stop
  const handleStop = useCallback(async () => {
    setIsPaused(false);
    if (runId) {
      await updateRun(experimentId, runId, { status: "failed" });
    }
    dispatch(failRun("Run stopped by user"));
  }, [experimentId, runId, dispatch]);

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

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Link href={`/experiments/${experimentId}`}>
              <Button icon={<ArrowLeftOutlined />}>Back to Experiment</Button>
            </Link>
          </div>
          {status === "complete" && runId && (
            <Link href={`/experiments/${experimentId}/results/${runId}`}>
              <Button type="primary" icon={<BarChartOutlined />}>
                View Results
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Runner */}
      <RunnerController
        experiment={experiment}
        alternatives={alternatives}
        agents={agents}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        status={status}
        progress={{
          completed: progress.completedTasks,
          total: progress.totalTasks,
        }}
        currentTask={tasks[currentTaskIndex]}
        currentAgent={currentAgent}
        startTime={startTime}
      />
    </div>
  );
}
