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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { createDefaultFeature } from "@/models/firestore";

const { Text } = Typography;

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
        if (isEditing(record)) {
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

  return (
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
            emptyText: "No features defined. Add features to describe your alternatives.",
          }}
        />
      </Form>
    </Card>
  );
}
