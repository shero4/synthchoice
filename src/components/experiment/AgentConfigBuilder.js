"use client";

import { useState } from "react";
import {
  Card,
  Checkbox,
  InputNumber,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Statistic,
  Divider,
  Tag,
  Input,
  Collapse,
  Form,
  Slider,
  Modal,
  Alert,
} from "antd";
import {
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  GlobalOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import {
  MBTI_PERSONALITIES,
  BEHAVIORAL_ARCHETYPES,
  LOCATION_PRESETS,
  MODEL_PRESETS,
  getLocationsByRegion,
  calculateTotalAgents,
} from "@/lib/agents/presets";

const { Text, Title } = Typography;

/**
 * Agent Config Builder - simplified agent configuration
 *
 * Props:
 * - config: AgentConfig - current configuration
 * - onChange: (config: AgentConfig) => void - callback when config changes
 */
export function AgentConfigBuilder({ config = {}, onChange }) {
  const [customPersonalityModal, setCustomPersonalityModal] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [form] = Form.useForm();

  // Ensure config has default values
  const currentConfig = {
    selectedModels: [],
    selectedPersonalities: [],
    selectedLocations: [],
    agentsPerCombo: 1,
    customPersonalities: [],
    customLocations: [],
    ...config,
  };

  // Calculate totals
  const totalAgents = calculateTotalAgents(currentConfig);
  const numCombinations =
    currentConfig.selectedModels.length *
    currentConfig.selectedPersonalities.length *
    currentConfig.selectedLocations.length;

  // Handle config updates
  const updateConfig = (updates) => {
    onChange({ ...currentConfig, ...updates });
  };

  // Toggle selection helper
  const toggleSelection = (field, value) => {
    const current = currentConfig[field] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateConfig({ [field]: updated });
  };

  // Select all / none helpers
  const selectAll = (field, values) => {
    updateConfig({ [field]: values });
  };

  // Handle adding custom personality
  const handleAddCustomPersonality = async () => {
    try {
      const values = await form.validateFields();
      const customId = `custom_${Date.now()}`;
      const newPersonality = {
        id: customId,
        label: values.label,
        description: values.description || "Custom personality",
        traits: {
          personality: values.label,
          priceSensitivity: values.priceSensitivity,
          riskTolerance: values.riskTolerance,
          consistency: values.consistency,
        },
      };

      updateConfig({
        customPersonalities: [
          ...currentConfig.customPersonalities,
          newPersonality,
        ],
        selectedPersonalities: [
          ...currentConfig.selectedPersonalities,
          customId,
        ],
      });

      form.resetFields();
      setCustomPersonalityModal(false);
    } catch (err) {
      // Validation failed
    }
  };

  // Handle adding custom location
  const handleAddCustomLocation = () => {
    const location = customLocationInput.trim();
    if (!location) return;

    const locationId = `custom_${location.toLowerCase().replace(/\s+/g, "_")}`;

    // Check if already exists
    if (
      currentConfig.selectedLocations.includes(locationId) ||
      LOCATION_PRESETS.find((l) => l.label.toLowerCase() === location.toLowerCase())
    ) {
      setCustomLocationInput("");
      return;
    }

    updateConfig({
      customLocations: [
        ...currentConfig.customLocations,
        { id: locationId, label: location },
      ],
      selectedLocations: [...currentConfig.selectedLocations, locationId],
    });

    setCustomLocationInput("");
  };

  // Handle removing custom personality
  const handleRemoveCustomPersonality = (id) => {
    updateConfig({
      customPersonalities: currentConfig.customPersonalities.filter(
        (p) => p.id !== id
      ),
      selectedPersonalities: currentConfig.selectedPersonalities.filter(
        (p) => p !== id
      ),
    });
  };

  // Handle removing custom location
  const handleRemoveCustomLocation = (id) => {
    updateConfig({
      customLocations: currentConfig.customLocations.filter((l) => l.id !== id),
      selectedLocations: currentConfig.selectedLocations.filter((l) => l !== id),
    });
  };

  // Group locations by region
  const locationsByRegion = getLocationsByRegion();

  // Get all MBTI types as array
  const mbtiTypes = Object.values(MBTI_PERSONALITIES);
  const archetypes = Object.values(BEHAVIORAL_ARCHETYPES);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Summary Card */}
      <Card>
        <Row gutter={24} align="middle">
          <Col>
            <Statistic
              title="Total Agents"
              value={totalAgents}
              prefix={<TeamOutlined />}
              styles={{ content: { color: totalAgents > 0 ? "#1890ff" : "#999" } }}
            />
          </Col>
          <Col flex="auto">
            <Text type="secondary">
              {currentConfig.selectedModels.length} models ×{" "}
              {currentConfig.selectedPersonalities.length} personalities ×{" "}
              {currentConfig.selectedLocations.length} locations ×{" "}
              {currentConfig.agentsPerCombo} per combo = {numCombinations}{" "}
              combinations
            </Text>
          </Col>
          <Col>
            <Space>
              <Text>Agents per combination:</Text>
              <InputNumber
                value={currentConfig.agentsPerCombo}
                min={1}
                max={100}
                onChange={(v) => updateConfig({ agentsPerCombo: v || 1 })}
                style={{ width: 80 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Models Selection */}
      <Card
        title={
          <Space>
            <RobotOutlined />
            <span>Models</span>
            <Tag>{currentConfig.selectedModels.length} selected</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              onClick={() =>
                selectAll(
                  "selectedModels",
                  MODEL_PRESETS.map((m) => m.id)
                )
              }
            >
              Select All
            </Button>
            <Button
              size="small"
              onClick={() => selectAll("selectedModels", [])}
            >
              Clear
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 12]}>
          {MODEL_PRESETS.map((model) => (
            <Col key={model.id} xs={24} sm={12} md={8} lg={6}>
              <Checkbox
                checked={currentConfig.selectedModels.includes(model.id)}
                onChange={() => toggleSelection("selectedModels", model.id)}
              >
                <Space direction="vertical" size={0}>
                  <Text strong>{model.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {model.description}
                  </Text>
                </Space>
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Personalities Selection */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>Personalities</span>
            <Tag>{currentConfig.selectedPersonalities.length} selected</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCustomPersonalityModal(true)}
            >
              Add Custom
            </Button>
            <Button
              size="small"
              onClick={() => selectAll("selectedPersonalities", [])}
            >
              Clear
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* MBTI Personalities */}
          <div>
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14 }}>
                MBTI Personalities
              </Text>
              <Button
                size="small"
                type="link"
                onClick={() =>
                  selectAll(
                    "selectedPersonalities",
                    [
                      ...currentConfig.selectedPersonalities.filter(
                        (p) => !mbtiTypes.find((m) => m.id === p)
                      ),
                      ...mbtiTypes.map((m) => m.id),
                    ]
                  )
                }
              >
                Select All MBTI
              </Button>
            </Row>
            <Row gutter={[12, 8]}>
              {mbtiTypes.map((personality) => (
                <Col key={personality.id} xs={12} sm={8} md={6} lg={4} xl={3}>
                  <Checkbox
                    checked={currentConfig.selectedPersonalities.includes(
                      personality.id
                    )}
                    onChange={() =>
                      toggleSelection("selectedPersonalities", personality.id)
                    }
                  >
                    <Text>{personality.id}</Text>
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* Behavioral Archetypes */}
          <div>
            <Text strong style={{ fontSize: 14, display: "block", marginBottom: 12 }}>
              Behavioral Archetypes
            </Text>
            <Row gutter={[16, 12]}>
              {archetypes.map((archetype) => (
                <Col key={archetype.id} xs={24} sm={12} md={8}>
                  <Checkbox
                    checked={currentConfig.selectedPersonalities.includes(
                      archetype.id
                    )}
                    onChange={() =>
                      toggleSelection("selectedPersonalities", archetype.id)
                    }
                  >
                    <Space direction="vertical" size={0}>
                      <Text strong>{archetype.label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {archetype.description}
                      </Text>
                    </Space>
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </div>

          {/* Custom Personalities */}
          {currentConfig.customPersonalities.length > 0 && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <div>
                <Text strong style={{ fontSize: 14, display: "block", marginBottom: 12 }}>
                  Custom Personalities
                </Text>
                <Row gutter={[16, 12]}>
                  {currentConfig.customPersonalities.map((personality) => (
                    <Col key={personality.id} xs={24} sm={12} md={8}>
                      <Space>
                        <Checkbox
                          checked={currentConfig.selectedPersonalities.includes(
                            personality.id
                          )}
                          onChange={() =>
                            toggleSelection(
                              "selectedPersonalities",
                              personality.id
                            )
                          }
                        >
                          <Text strong>{personality.label}</Text>
                        </Checkbox>
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            handleRemoveCustomPersonality(personality.id)
                          }
                        />
                      </Space>
                    </Col>
                  ))}
                </Row>
              </div>
            </>
          )}
        </Space>
      </Card>

      {/* Locations Selection */}
      <Card
        title={
          <Space>
            <GlobalOutlined />
            <span>Locations</span>
            <Tag>{currentConfig.selectedLocations.length} selected</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              onClick={() =>
                selectAll(
                  "selectedLocations",
                  LOCATION_PRESETS.map((l) => l.id)
                )
              }
            >
              Select All
            </Button>
            <Button
              size="small"
              onClick={() => selectAll("selectedLocations", [])}
            >
              Clear
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Add Custom Location */}
          <Space.Compact style={{ width: "100%", maxWidth: 400 }}>
            <Input
              placeholder="Add custom location..."
              value={customLocationInput}
              onChange={(e) => setCustomLocationInput(e.target.value)}
              onPressEnter={handleAddCustomLocation}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddCustomLocation}
              disabled={!customLocationInput.trim()}
            >
              Add
            </Button>
          </Space.Compact>

          {/* Custom Locations */}
          {currentConfig.customLocations.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Custom locations:
              </Text>
              <div style={{ marginTop: 4 }}>
                {currentConfig.customLocations.map((loc) => (
                  <Tag
                    key={loc.id}
                    closable
                    onClose={() => handleRemoveCustomLocation(loc.id)}
                    color={
                      currentConfig.selectedLocations.includes(loc.id)
                        ? "blue"
                        : "default"
                    }
                    style={{ marginBottom: 4, cursor: "pointer" }}
                    onClick={() => toggleSelection("selectedLocations", loc.id)}
                  >
                    {loc.label}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Locations by Region */}
          <Collapse
            defaultActiveKey={["Asia", "North America"]}
            ghost
            items={Object.entries(locationsByRegion).map(
              ([region, locations]) => ({
                key: region,
                label: (
                  <Space>
                    <Text strong>{region}</Text>
                    <Tag>
                      {
                        locations.filter((l) =>
                          currentConfig.selectedLocations.includes(l.id)
                        ).length
                      }
                      /{locations.length}
                    </Tag>
                  </Space>
                ),
                extra: (
                  <Button
                    size="small"
                    type="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      const regionIds = locations.map((l) => l.id);
                      const allSelected = regionIds.every((id) =>
                        currentConfig.selectedLocations.includes(id)
                      );
                      if (allSelected) {
                        updateConfig({
                          selectedLocations:
                            currentConfig.selectedLocations.filter(
                              (id) => !regionIds.includes(id)
                            ),
                        });
                      } else {
                        updateConfig({
                          selectedLocations: [
                            ...new Set([
                              ...currentConfig.selectedLocations,
                              ...regionIds,
                            ]),
                          ],
                        });
                      }
                    }}
                  >
                    Toggle All
                  </Button>
                ),
                children: (
                  <Row gutter={[12, 8]}>
                    {locations.map((location) => (
                      <Col key={location.id} xs={12} sm={8} md={6} lg={4}>
                        <Checkbox
                          checked={currentConfig.selectedLocations.includes(
                            location.id
                          )}
                          onChange={() =>
                            toggleSelection("selectedLocations", location.id)
                          }
                        >
                          {location.label}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                ),
              })
            )}
          />
        </Space>
      </Card>

      {/* Validation Alert */}
      {totalAgents === 0 && (
        <Alert
          type="warning"
          showIcon
          title="No agents configured"
          description="Select at least one model, one personality, and one location to create agents."
        />
      )}

      {totalAgents > 1000 && (
        <Alert
          type="warning"
          showIcon
          title="Large agent count"
          description={`You have ${totalAgents} agents configured. This may take a while to run and incur significant API costs.`}
        />
      )}

      {/* Custom Personality Modal */}
      <Modal
        title="Add Custom Personality"
        open={customPersonalityModal}
        onOk={handleAddCustomPersonality}
        onCancel={() => {
          form.resetFields();
          setCustomPersonalityModal(false);
        }}
        okText="Add Personality"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            priceSensitivity: 0.5,
            riskTolerance: 0.5,
            consistency: 0.7,
          }}
        >
          <Form.Item
            name="label"
            label="Personality Name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="e.g., Frugal Minimalist" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input placeholder="Brief description of this personality" />
          </Form.Item>

          <Form.Item
            name="priceSensitivity"
            label={`Price Sensitivity: ${form.getFieldValue("priceSensitivity") || 0.5}`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>

          <Form.Item
            name="riskTolerance"
            label={`Risk Tolerance: ${form.getFieldValue("riskTolerance") || 0.5}`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>

          <Form.Item
            name="consistency"
            label={`Consistency: ${form.getFieldValue("consistency") || 0.7}`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
