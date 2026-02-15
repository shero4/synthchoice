"use client";

import { useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  InputNumber,
  Tag,
  Popconfirm,
  Typography,
  Alert,
  Collapse,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { createDefaultFeature } from "@/models/firestore";
import { parseFeatureSchema } from "@/app/experiments/new/actions";

const { Text } = Typography;
const { TextArea } = Input;

/**
 * Feature Schema Builder - define features for alternatives
 * 
 * Props:
 * - features: Feature[] - current features
 * - onChange: (features: Feature[]) => void - callback when features change
 */
export function FeatureSchemaBuilder({ features = [], onChange }) {
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [rawSchemaInput, setRawSchemaInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  // Handle AI parsing of feature schema
  const handleAIParse = async () => {
    if (!rawSchemaInput.trim()) return;
    
    setParsing(true);
    setParseError(null);
    
    try {
      const result = await parseFeatureSchema(rawSchemaInput);
      
      if (result.error) {
        setParseError(result.error);
      } else if (result.features) {
        onChange(result.features);
        setRawSchemaInput("");
      }
    } catch (err) {
      setParseError(err.message || "Failed to parse schema");
    } finally {
      setParsing(false);
    }
  };

  // Handle adding a new feature
  const handleAdd = () => {
    const newFeature = createDefaultFeature();
    newFeature.key = `feature_${Date.now()}`;
    setIsAdding(true);
    setEditingKey(newFeature.key);
    onChange([...features, newFeature]);
    form.setFieldsValue(newFeature);
  };

  // Handle saving edits
  const handleSave = async (key) => {
    try {
      const row = await form.validateFields();
      const newFeatures = features.map((f) =>
        f.key === key ? { ...f, ...row } : f
      );
      onChange(newFeatures);
      setEditingKey("");
      setIsAdding(false);
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  // Handle deleting a feature
  const handleDelete = (key) => {
    onChange(features.filter((f) => f.key !== key));
  };

  // Handle editing a feature
  const handleEdit = (record) => {
    form.setFieldsValue(record);
    setEditingKey(record.key);
  };

  // Handle cancel edit
  const handleCancel = () => {
    if (isAdding) {
      onChange(features.slice(0, -1));
      setIsAdding(false);
    }
    setEditingKey("");
  };

  // Check if row is being edited
  const isEditing = (record) => record.key === editingKey;

  // Table columns
  const columns = [
    {
      title: "Key",
      dataIndex: "key",
      width: 150,
      render: (text, record) =>
        isEditing(record) ? (
          <Form.Item
            name="key"
            style={{ margin: 0 }}
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g., price" />
          </Form.Item>
        ) : (
          <Text code>{text}</Text>
        ),
    },
    {
      title: "Label",
      dataIndex: "label",
      width: 150,
      render: (text, record) =>
        isEditing(record) ? (
          <Form.Item
            name="label"
            style={{ margin: 0 }}
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g., Price" />
          </Form.Item>
        ) : (
          text
        ),
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 120,
      render: (text, record) =>
        isEditing(record) ? (
          <Form.Item
            name="type"
            style={{ margin: 0 }}
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="continuous">Continuous</Select.Option>
              <Select.Option value="categorical">Categorical</Select.Option>
              <Select.Option value="binary">Binary</Select.Option>
            </Select>
          </Form.Item>
        ) : (
          <Tag
            color={
              text === "continuous"
                ? "blue"
                : text === "categorical"
                  ? "green"
                  : "orange"
            }
          >
            {text}
          </Tag>
        ),
    },
    {
      title: "Details",
      dataIndex: "details",
      render: (_, record) => {
        const currentType = form.getFieldValue("type") || record.type;
        
        if (isEditing(record)) {
          // Show different inputs based on type
          if (currentType === "continuous") {
            return (
              <Space wrap>
                <Form.Item name="unit" style={{ margin: 0, minWidth: 80 }}>
                  <Input placeholder="Unit" />
                </Form.Item>
                <Form.Item name="min" style={{ margin: 0, width: 80 }}>
                  <InputNumber placeholder="Min" />
                </Form.Item>
                <Form.Item name="max" style={{ margin: 0, width: 80 }}>
                  <InputNumber placeholder="Max" />
                </Form.Item>
              </Space>
            );
          }
          if (currentType === "categorical") {
            return (
              <Form.Item 
                name="categories" 
                style={{ margin: 0, minWidth: 200 }}
                getValueFromEvent={(val) => val}
                getValueProps={(val) => ({ value: val || [] })}
              >
                <Select
                  mode="tags"
                  placeholder="Enter categories (press Enter after each)"
                  style={{ width: "100%" }}
                  tokenSeparators={[","]}
                />
              </Form.Item>
            );
          }
          // Binary - no extra details needed
          return <Text type="secondary">Yes/No values</Text>;
        }
        
        // Display mode
        if (record.type === "continuous") {
          return (
            <Text type="secondary">
              {record.unit && `${record.unit} `}
              {record.min !== undefined && record.max !== undefined
                ? `(${record.min} - ${record.max})`
                : ""}
            </Text>
          );
        }
        if (record.type === "categorical" && record.categories) {
          return record.categories.map((cat) => (
            <Tag key={cat}>{cat}</Tag>
          ));
        }
        if (record.type === "binary") {
          return <Text type="secondary">Yes/No</Text>;
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Actions",
      width: 120,
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button
              type="link"
              icon={<SaveOutlined />}
              onClick={() => handleSave(record.key)}
            />
            <Button type="link" onClick={handleCancel}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              disabled={editingKey !== ""}
              onClick={() => handleEdit(record)}
            />
            <Popconfirm
              title="Delete this feature?"
              onConfirm={() => handleDelete(record.key)}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled={editingKey !== ""}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const placeholderText = `Paste your feature schema here. Examples:

Markdown table:
| Key | Label | Type | Details |
|-----|-------|------|---------|
| price | Price | continuous | Min: 100, Max: 1000, Unit: USD |
| color | Color | categorical | "Red", "Blue", "Green" |
| has_warranty | Has Warranty | binary | Yes/No |

Plain text:
- price: numeric, 100-1000 USD
- color: options are Red, Blue, Green
- has_warranty: yes/no`;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* AI Parse Section */}
      <Card size="small">
        <Collapse
          ghost
          defaultActiveKey={features.length === 0 ? ["ai-parse"] : []}
          items={[
            {
              key: "ai-parse",
              label: (
                <Space>
                  <ThunderboltOutlined />
                  <Text strong>Parse with AI</Text>
                  <Text type="secondary">(paste schema definition)</Text>
                </Space>
              ),
              children: (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Alert
                    type="info"
                    showIcon
                    title="Paste your feature schema in any format"
                    description="Supports markdown tables, plain text lists, JSON, or any structured format describing your features."
                  />
                  
                  <TextArea
                    value={rawSchemaInput}
                    onChange={(e) => setRawSchemaInput(e.target.value)}
                    placeholder={placeholderText}
                    rows={8}
                    style={{ fontFamily: "monospace" }}
                  />
                  
                  {parseError && (
                    <Alert type="error" title={parseError} showIcon closable onClose={() => setParseError(null)} />
                  )}
                  
                  <Space>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleAIParse}
                      loading={parsing}
                      disabled={!rawSchemaInput.trim()}
                    >
                      Parse with AI
                    </Button>
                    <Button
                      icon={<ClearOutlined />}
                      onClick={() => setRawSchemaInput("")}
                      disabled={!rawSchemaInput}
                    >
                      Clear
                    </Button>
                  </Space>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Feature Table */}
      <Card
        title="Feature Schema"
        extra={
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={editingKey !== ""}
          >
            Add Feature
          </Button>
        }
      >
        <Form form={form} component={false}>
          <Table
            dataSource={features}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
            locale={{
              emptyText: "No features defined. Use AI parsing above or add features manually.",
            }}
          />
        </Form>
      </Card>
    </Space>
  );
}
