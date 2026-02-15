"use client";

import { useState } from "react";
import { Card, Input, Button, Space, Typography, Alert } from "antd";
import { ThunderboltOutlined, ClearOutlined } from "@ant-design/icons";
import { parseAlternatives } from "@/app/experiments/new/actions";

const { TextArea } = Input;
const { Text } = Typography;

/**
 * Alternatives Input - raw text/JSON input for alternatives with AI parsing
 * 
 * Props:
 * - value: string - current raw input
 * - onChange: (value: string) => void - callback when input changes
 * - features: Feature[] - the feature schema to parse against
 * - onAlternativesParsed: (alternatives: Alternative[]) => void - callback when alternatives are parsed
 */
export function AlternativesInput({ value = "", onChange, features = [], onAlternativesParsed }) {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  // Handle AI parsing
  const handleAIParse = async () => {
    if (!value.trim()) return;
    
    setParsing(true);
    setParseError(null);
    
    try {
      const result = await parseAlternatives(value, features);
      
      if (result.error) {
        setParseError(result.error);
      } else if (result.alternatives) {
        onAlternativesParsed(result.alternatives);
        onChange(""); // Clear input after successful parse
      }
    } catch (err) {
      setParseError(err.message || "Failed to parse alternatives");
    } finally {
      setParsing(false);
    }
  };

  const placeholderText = `Paste your alternatives data here in any format.

Example (markdown table):
### MacBook Pro 14"
- **price:** 2499
- **weight:** 1.6
- **repairability:** Impossible
- **flex_factor:** Coffee Shop Cred

### ThinkPad X1 Carbon
- **price:** 1899
- **weight:** 1.12
- **repairability:** Hard
- **flex_factor:** Corporate Stealth

Example (plain text):
Option A: price $499, color Red, has warranty
Option B: price $299, color Blue, no warranty

Example (JSON):
[
  { "name": "Plan A", "price": 499, "color": "Red", "has_warranty": true },
  { "name": "Plan B", "price": 299, "color": "Blue", "has_warranty": false }
]`;

  const hasFeatures = features.length > 0;

  return (
    <Card title="Alternatives Input">
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type="info"
          showIcon
          title="Paste your alternatives data"
          description={
            <Text type="secondary">
              Paste alternatives in any format (markdown, JSON, plain text). 
              AI will map the values to your feature schema.
            </Text>
          }
        />

        {!hasFeatures && (
          <Alert
            type="warning"
            showIcon
            title="Define features first"
            description="You need to define a feature schema before parsing alternatives."
          />
        )}

        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholderText}
          rows={12}
          style={{ fontFamily: "monospace" }}
          disabled={!hasFeatures}
        />

        {parseError && (
          <Alert 
            type="error" 
            title={parseError} 
            showIcon 
            closable 
            onClose={() => setParseError(null)} 
          />
        )}

        <Space>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleAIParse}
            loading={parsing}
            disabled={!value.trim() || !hasFeatures}
          >
            Parse with AI
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={() => onChange("")}
            disabled={!value}
          >
            Clear
          </Button>
        </Space>

        {hasFeatures && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Parsing against {features.length} feature{features.length !== 1 ? "s" : ""}: {features.map(f => f.label || f.key).join(", ")}
          </Text>
        )}
      </Space>
    </Card>
  );
}
