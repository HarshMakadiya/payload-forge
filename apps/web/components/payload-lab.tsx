'use client';

import { useState } from 'react';
import { apiRequest, type Endpoint } from '../lib/api';

interface PayloadLabProps {
  readonly projectId: string;
  readonly endpoints: readonly Endpoint[];
}

export function PayloadLab({
  projectId,
  endpoints,
}: PayloadLabProps): React.ReactElement {
  const [sample, setSample] = useState(
    '{\n  "name": "Sample User",\n  "email": "sample@example.test"\n}'
  );
  const [count, setCount] = useState(100);
  const [schema, setSchema] = useState('');
  const [fieldRules, setFieldRules] = useState('');
  const [estimate, setEstimate] = useState<{
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
  } | null>(null);
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPayloads, setGeneratedPayloads] = useState<
    readonly Record<string, unknown>[]
  >([]);
  const [endpointId, setEndpointId] = useState('');
  const [templateName, setTemplateName] = useState('Generated payloads');

  const generate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await apiRequest<{
        payloads: readonly Record<string, unknown>[];
        seedCount: number;
      }>('/payloads/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...(sample.trim() === ''
            ? {}
            : { sample: JSON.parse(sample) as Record<string, unknown> }),
          ...(schema.trim() === ''
            ? {}
            : { schema: JSON.parse(schema) as Record<string, unknown> }),
          ...(fieldRules.trim() === ''
            ? {}
            : {
                fieldRules: JSON.parse(fieldRules) as Record<string, unknown>,
              }),
          count,
          seedCount: Math.min(25, count),
        }),
      });
      setGeneratedPayloads(result.payloads);
      setOutput(JSON.stringify(result.payloads.slice(0, 5), null, 2));
    } finally {
      setIsGenerating(false);
    }
  };

  const estimateTokens = async (): Promise<void> => {
    setEstimate(
      await apiRequest<{
        estimatedInputTokens: number;
        estimatedOutputTokens: number;
      }>('/payloads/estimate', {
        method: 'POST',
        body: JSON.stringify({
          ...(sample.trim() === ''
            ? {}
            : { sample: JSON.parse(sample) as Record<string, unknown> }),
          ...(schema.trim() === ''
            ? {}
            : { schema: JSON.parse(schema) as Record<string, unknown> }),
          count,
          seedCount: Math.min(25, count),
        }),
      })
    );
  };

  const saveTemplate = async (): Promise<void> => {
    await apiRequest('/payload-templates', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        endpointId,
        name: templateName,
        payloads: generatedPayloads,
        source: 'AI',
      }),
    });
  };

  return (
    <section className="card payload-card">
      <span className="eyebrow">AI payload studio</span>
      <h2>Generate realistic test data</h2>
      <div className="split-grid">
        <div className="form-stack">
          <label>
            Sample JSON
            <textarea
              value={sample}
              onChange={(event) => setSample(event.target.value)}
              rows={8}
            />
          </label>
          <label>
            JSON Schema (optional; may be used without a sample)
            <textarea
              value={schema}
              onChange={(event) => setSchema(event.target.value)}
              rows={6}
              placeholder='{"type":"object","properties":{...}}'
            />
          </label>
          <label>
            Field rules (optional JSON)
            <textarea
              value={fieldRules}
              onChange={(event) => setFieldRules(event.target.value)}
              rows={3}
              placeholder='{"age":"18 to 65"}'
            />
          </label>
          <label>
            Payload count
            <input
              type="number"
              min={1}
              max={10_000}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>
          <button onClick={() => void estimateTokens()}>
            Estimate token usage
          </button>
          {estimate !== null && (
            <small>
              Estimated {estimate.estimatedInputTokens.toLocaleString()} input +{' '}
              {estimate.estimatedOutputTokens.toLocaleString()} output tokens
              for the AI seed batch.
            </small>
          )}
          <button disabled={isGenerating} onClick={() => void generate()}>
            {isGenerating ? 'Generating…' : 'Generate payloads'}
          </button>
          <label>
            Save for endpoint
            <select
              value={endpointId}
              onChange={(event) => setEndpointId(event.target.value)}
            >
              <option value="">Select endpoint</option>
              {endpoints.map((endpoint) => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.method} {endpoint.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Template name
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
          </label>
          <button
            disabled={generatedPayloads.length === 0 || endpointId === ''}
            onClick={() => void saveTemplate()}
          >
            Save reusable version
          </button>
        </div>
        <pre className="payload-preview">
          {output || 'Generated payload preview appears here.'}
        </pre>
      </div>
    </section>
  );
}
