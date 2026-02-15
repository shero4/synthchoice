"use client";

import { useState } from "react";
import { Card, Input, Button, Space, Typography, Alert } from "antd";
import { ImportOutlined, ClearOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

/**
 * Alternatives Input - raw text/JSON input for alternatives
 * 
 * Props:
 * - value: string - current raw input
 * - onChange: (value: string) => void - callback when input changes
 * - onNormalize: () => void - callback to trigger normalization
 */
export function AlternativesInput({ value = "", onChange, onNormalize }) {
  const [inputMode, setInputMode] = useState("text"); // text | json

  const placeholderText = `Enter your alternatives here, one per line or as JSON.

Example (text format):
Plan A: $499/month, 12 months warranty, includes API access
Plan B: $299/month, 6 months warranty, no API access
Plan C: $699/month, 24 months warranty, API + premium support

Example (JSON format):
[
  { "name": "Plan A", "price": 499, "warranty": "12m", "hasApi": true },
  { "name": "Plan B", "price": 299, "warranty": "6m", "hasApi": false }
]`;

  return (
    <Card
      title="Alternatives Input"
      extra={
        <Space>
          <Button
            type={inputMode === "text" ? "primary" : "default"}
            size="small"
            onClick={() => setInputMode("text")}
          >
            Text
          </Button>
          <Button
            type={inputMode === "json" ? "primary" : "default"}
            size="small"
            onClick={() => setInputMode("json")}
          >
            JSON
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type="info"
          showIcon
          message="Paste or type your alternatives"
          description={
            <Text type="secondary">
              {inputMode === "text"
                ? "Enter each alternative on a new line. Include feature values in any format."
                : "Enter a JSON array of objects with name and feature properties."}
            </Text>
          }
        />

        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholderText}
          rows={10}
          style={{ fontFamily: "monospace" }}
        />

        <Space>
          <Button
            type="primary"
            icon={<ImportOutlined />}
            onClick={onNormalize}
            disabled={!value.trim()}
          >
            Normalize to Table
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={() => onChange("")}
            disabled={!value}
          >
            Clear
          </Button>
        </Space>

        <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
          {/* TODO: Add LLM normalization option with BYO API key */}
          Normalization will parse your input and map values to the defined feature schema.
        </Paragraph>
      </Space>
    </Card>
  );
}
