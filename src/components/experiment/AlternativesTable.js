"use client";

import {
  Card,
  Table,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Popconfirm,
  Empty,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { createDefaultAlternative } from "@/models/firestore";

/**
 * Alternatives Table - display and edit normalized alternatives
 * 
 * Props:
 * - alternatives: Alternative[] - list of alternatives
 * - features: Feature[] - feature schema
 * - onChange: (alternatives: Alternative[]) => void - callback when data changes
 */
export function AlternativesTable({ alternatives = [], features = [], onChange }) {
  // Handle adding a new alternative
  const handleAdd = () => {
    const newAlt = createDefaultAlternative();
    newAlt.name = `Alternative ${alternatives.length + 1}`;
    // Initialize features with default values
    features.forEach((f) => {
      if (f.type === "continuous") {
        newAlt.features[f.key] = f.min || 0;
      } else if (f.type === "categorical") {
        newAlt.features[f.key] = f.categories?.[0] || "";
      } else if (f.type === "binary") {
        newAlt.features[f.key] = false;
      }
    });
    onChange([...alternatives, { ...newAlt, id: `alt_${Date.now()}` }]);
  };

  // Handle deleting an alternative
  const handleDelete = (id) => {
    onChange(alternatives.filter((a) => a.id !== id));
  };

  // Handle updating an alternative
  const handleUpdate = (id, field, value) => {
    onChange(
      alternatives.map((a) =>
        a.id === id
          ? field.startsWith("features.")
            ? {
                ...a,
                features: {
                  ...a.features,
                  [field.replace("features.", "")]: value,
                },
              }
            : { ...a, [field]: value }
          : a
      )
    );
  };

  // Build columns from features
  const featureColumns = features.map((f) => ({
    title: f.label || f.key,
    dataIndex: ["features", f.key],
    key: f.key,
    width: 150,
    render: (value, record) => {
      if (f.type === "continuous") {
        return (
          <InputNumber
            value={value}
            min={f.min}
            max={f.max}
            onChange={(v) => handleUpdate(record.id, `features.${f.key}`, v)}
            style={{ width: "100%" }}
          />
        );
      }
      if (f.type === "categorical") {
        return (
          <Select
            value={value}
            onChange={(v) => handleUpdate(record.id, `features.${f.key}`, v)}
            style={{ width: "100%" }}
          >
            {f.categories?.map((cat) => (
              <Select.Option key={cat} value={cat}>
                {cat}
              </Select.Option>
            ))}
          </Select>
        );
      }
      if (f.type === "binary") {
        return (
          <Switch
            checked={value}
            onChange={(v) => handleUpdate(record.id, `features.${f.key}`, v)}
          />
        );
      }
      return value;
    },
  }));

  // Full columns array
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      fixed: "left",
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => handleUpdate(record.id, "name", e.target.value)}
          placeholder="Alternative name"
        />
      ),
    },
    ...featureColumns,
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Popconfirm
          title="Delete this alternative?"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  if (features.length === 0) {
    return (
      <Card title="Alternatives">
        <Empty
          description="Define features first to add alternatives"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      title="Alternatives"
      extra={
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Alternative
        </Button>
      }
    >
      <Table
        dataSource={alternatives}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: "max-content" }}
        size="small"
        locale={{
          emptyText: (
            <Empty
              description="No alternatives added yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={handleAdd}>
                Add First Alternative
              </Button>
            </Empty>
          ),
        }}
      />
    </Card>
  );
}
