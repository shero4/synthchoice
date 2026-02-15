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
  AgentConfigBuilder,
} from "@/components/experiment";
import {
  generateSegmentsFromConfig,
  calculateTotalAgents,
} from "@/lib/agents/presets";
import { ensureAuth } from "@/lib/firebase/auth";
import { createExperiment, addAlternative } from "@/lib/firebase/db";
import {
  initDraft,
  updateDraft,
  updateDraftFeatureSchema,
  updateDraftAgentConfig,
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
    { title: "Basics", content: "Name & description" },
    { title: "Features", content: "Define schema" },
    { title: "Alternatives", content: "Add options" },
    { title: "Agents", content: "Configure agents" },
    { title: "Review", content: "Save experiment" },
  ];

  // Handle save experiment
  const handleSave = async () => {
    if (!draft) {
      message.error("No draft to save");
      return;
    }

    setSaving(true);
    
    try {
      // Generate segments from agentConfig
      const agentConfig = draft.agentConfig || {};
      const segments = generateSegmentsFromConfig(agentConfig);
      const totalAgents = calculateTotalAgents(agentConfig);

      // Create experiment
      const experimentId = await createExperiment({
        ...draft,
        status: "draft",
        agentPlan: {
          segments,
          totalAgents,
        },
        agentConfig, // Also save the config for future editing
      });

      // Add alternatives in parallel for faster save
      if (alternatives.length > 0) {
        await Promise.all(
          alternatives.map((alt) => addAlternative(experimentId, alt))
        );
      }

      message.success("Experiment created successfully!");
      dispatch(clearDraft());
      router.push(`/experiments/${experimentId}`);
    } catch (error) {
      console.error("Error saving experiment:", error);
      message.error(`Failed to save experiment: ${error.message || "Unknown error"}`);
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
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <AlternativesInput
              value={rawInput}
              onChange={setRawInput}
              features={draft.featureSchema?.features || []}
              onAlternativesParsed={(parsed) => {
                // Merge with existing alternatives or replace
                setAlternatives((prev) => [...prev, ...parsed]);
              }}
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
          <AgentConfigBuilder
            config={draft.agentConfig || {}}
            onChange={(agentConfig) =>
              dispatch(updateDraftAgentConfig(agentConfig))
            }
          />
        );

      case 4: {
        // Review
        const reviewAgentConfig = draft.agentConfig || {};
        const reviewTotalAgents = calculateTotalAgents(reviewAgentConfig);
        const reviewNumCombinations =
          (reviewAgentConfig.selectedModels?.length || 0) *
          (reviewAgentConfig.selectedPersonalities?.length || 0) *
          (reviewAgentConfig.selectedLocations?.length || 0);

        return (
          <Card title="Review & Save" style={{ borderRadius: 14 }}>
            <Result
              icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              title="Ready to create experiment"
              subTitle={
                <Space direction="vertical" style={{ textAlign: 'left' }}>
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
                    <strong>Agents:</strong> {reviewTotalAgents} across{" "}
                    {reviewNumCombinations} segments ({reviewAgentConfig.selectedModels?.length || 0} models × {reviewAgentConfig.selectedPersonalities?.length || 0} personalities × {reviewAgentConfig.selectedLocations?.length || 0} locations)
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
                  style={{
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    border: 'none',
                    height: 48,
                    padding: '0 32px',
                  }}
                >
                  Create Experiment
                </Button>
              }
            />
          </Card>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-header-title">Create New Experiment</h1>
        <p className="page-header-subtitle">Set up your choice-based experiment in a few steps</p>
      </div>

      {/* Steps Progress */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 14,
          border: '1px solid #e2e8f0',
        }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Steps
          current={currentStep}
          items={steps}
          size="small"
          onChange={(step) => dispatch(setCurrentStep(step))}
          style={{ fontFamily: 'var(--font-sans)' }}
        />
      </Card>

      {renderStepContent()}

      {/* Navigation */}
      <Card 
        style={{ 
          marginTop: 24, 
          borderRadius: 14,
          border: '1px solid #e2e8f0',
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => dispatch(prevStep())}
            disabled={currentStep === 0}
            style={{ borderRadius: 8 }}
          >
            Previous
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => dispatch(nextStep())}
              style={{ 
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                border: 'none',
              }}
            >
              Next Step
            </Button>
          ) : null}
        </Space>
      </Card>
    </div>
  );
}
