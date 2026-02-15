"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Steps,
  Button,
  Space,
  Form,
  Input,
  message,
  Result,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  FeatureSchemaBuilder,
  AlternativesInput,
  AlternativesTable,
  AgentSegmentsBuilder,
  TaskPlanPanel,
} from "@/components/experiment";
import { ensureAuth } from "@/lib/firebase/auth";
import { createExperiment, addAlternative } from "@/lib/firebase/db";
import {
  initDraft,
  updateDraft,
  updateDraftFeatureSchema,
  updateDraftAgentPlan,
  updateDraftTaskPlan,
  setCurrentStep,
  nextStep,
  prevStep,
  clearDraft,
} from "@/store/experimentSlice";

const { TextArea } = Input;

/**
 * New Experiment Page - multi-step form for creating experiments
 */
export default function NewExperimentPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { draft, currentStep } = useSelector((state) => state.experiment);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [rawInput, setRawInput] = useState("");
  const [alternatives, setAlternatives] = useState([]);

  // Initialize draft on mount
  useEffect(() => {
    const init = async () => {
      try {
        const user = await ensureAuth();
        if (user) {
          dispatch(initDraft(user.uid));
        } else {
          // If no user, create draft with a temporary ID
          dispatch(initDraft("anonymous_" + Date.now()));
        }
      } catch (error) {
        console.error("Auth error:", error);
        setAuthError(error.message || "Failed to initialize authentication");
        // Still create draft with temporary ID so user can work
        dispatch(initDraft("anonymous_" + Date.now()));
      } finally {
        setLoading(false);
      }
    };
    init();

    // Cleanup on unmount
    return () => {
      dispatch(clearDraft());
    };
  }, [dispatch]);

  // Step definitions
  const steps = [
    { title: "Basics", description: "Name & description" },
    { title: "Features", description: "Define schema" },
    { title: "Alternatives", description: "Add options" },
    { title: "Agents", description: "Configure segments" },
    { title: "Task Plan", description: "Set parameters" },
    { title: "Review", description: "Save experiment" },
  ];

  // Handle normalize (placeholder - just parse basic format)
  const handleNormalize = () => {
    // TODO: Implement actual normalization logic
    // For now, just show a message
    message.info("Normalization will be implemented. Add alternatives manually for now.");
  };

  // Handle save experiment
  const handleSave = async () => {
    if (!draft) return;

    setSaving(true);
    try {
      // Create experiment
      const experimentId = await createExperiment({
        ...draft,
        status: "draft",
        agentPlan: {
          ...draft.agentPlan,
          totalAgents: draft.agentPlan.segments.reduce(
            (sum, s) => sum + (s.count || 0),
            0
          ),
        },
      });

      // Add alternatives
      for (const alt of alternatives) {
        await addAlternative(experimentId, alt);
      }

      message.success("Experiment created successfully!");
      dispatch(clearDraft());
      router.push(`/experiments/${experimentId}`);
    } catch (error) {
      console.error("Error saving experiment:", error);
      message.error("Failed to save experiment");
    } finally {
      setSaving(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    if (loading) {
      return (
        <Card>
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>Initializing...</p>
          </div>
        </Card>
      );
    }

    if (!draft) {
      return (
        <Card>
          <div style={{ textAlign: "center", padding: 48 }}>
            <p>Something went wrong loading the form.</p>
            <Button type="primary" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </Card>
      );
    }

    // Show auth warning if there was an error (but still allow usage)
    const authWarning = authError ? (
      <Card style={{ marginBottom: 16, background: "#fffbe6", borderColor: "#ffe58f" }}>
        <p style={{ margin: 0, color: "#ad6800" }}>
          Note: Running in offline mode. Your experiment may not be saved to the cloud.
        </p>
      </Card>
    ) : null;

    switch (currentStep) {
      case 0: // Basics
        return (
          <>
            {authWarning}
            <Card title="Experiment Basics">
              <Form layout="vertical">
                <Form.Item label="Experiment Name" required>
                  <Input
                    value={draft.name}
                    onChange={(e) => dispatch(updateDraft({ name: e.target.value }))}
                    placeholder="e.g., Pricing Plan Test Q1 2024"
                    size="large"
                  />
                </Form.Item>
                <Form.Item label="Description">
                  <TextArea
                    value={draft.description}
                    onChange={(e) =>
                      dispatch(updateDraft({ description: e.target.value }))
                    }
                    placeholder="Describe what you're testing..."
                    rows={4}
                  />
                </Form.Item>
              </Form>
            </Card>
          </>
        );

      case 1: // Features
        return (
          <FeatureSchemaBuilder
            features={draft.featureSchema?.features || []}
            onChange={(features) =>
              dispatch(
                updateDraftFeatureSchema({
                  ...draft.featureSchema,
                  features,
                })
              )
            }
          />
        );

      case 2: // Alternatives
        return (
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <AlternativesInput
              value={rawInput}
              onChange={setRawInput}
              onNormalize={handleNormalize}
            />
            <AlternativesTable
              alternatives={alternatives}
              features={draft.featureSchema?.features || []}
              onChange={setAlternatives}
            />
          </Space>
        );

      case 3: // Agents
        return (
          <AgentSegmentsBuilder
            segments={draft.agentPlan?.segments || []}
            onChange={(segments) =>
              dispatch(
                updateDraftAgentPlan({
                  ...draft.agentPlan,
                  segments,
                  totalAgents: segments.reduce((sum, s) => sum + (s.count || 0), 0),
                })
              )
            }
          />
        );

      case 4: // Task Plan
        return (
          <TaskPlanPanel
            taskPlan={draft.taskPlan}
            choiceFormat={draft.choiceFormat}
            totalAgents={draft.agentPlan?.totalAgents || 0}
            onChange={(taskPlan) => dispatch(updateDraftTaskPlan(taskPlan))}
            onChoiceFormatChange={(format) =>
              dispatch(updateDraft({ choiceFormat: format }))
            }
          />
        );

      case 5: // Review
        return (
          <Card title="Review & Save">
            <Result
              icon={<CheckCircleOutlined />}
              title="Ready to create experiment"
              subTitle={
                <Space orientation="vertical">
                  <span>
                    <strong>Name:</strong> {draft.name || "Untitled"}
                  </span>
                  <span>
                    <strong>Features:</strong>{" "}
                    {draft.featureSchema?.features?.length || 0}
                  </span>
                  <span>
                    <strong>Alternatives:</strong> {alternatives.length}
                  </span>
                  <span>
                    <strong>Agents:</strong> {draft.agentPlan?.totalAgents || 0} across{" "}
                    {draft.agentPlan?.segments?.length || 0} segments
                  </span>
                  <span>
                    <strong>Tasks per agent:</strong>{" "}
                    {draft.taskPlan?.tasksPerAgent || 10}
                  </span>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  size="large"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                >
                  Create Experiment
                </Button>
              }
            />
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          items={steps}
          size="small"
          onChange={(step) => dispatch(setCurrentStep(step))}
        />
      </Card>

      {renderStepContent()}

      <Card style={{ marginTop: 24 }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => dispatch(prevStep())}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => dispatch(nextStep())}
            >
              Next
            </Button>
          ) : null}
        </Space>
      </Card>
    </div>
  );
}
