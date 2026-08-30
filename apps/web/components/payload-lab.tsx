'use client';

import { useState } from 'react';
import { apiRequest } from '../lib/api';

export function PayloadLab(): React.ReactElement {
  const [sample, setSample] = useState(
    '{\n  "name": "Sample User",\n  "email": "sample@example.test"\n}'
  );
  const [count, setCount] = useState(100);
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await apiRequest<{
        payloads: readonly Record<string, unknown>[];
        seedCount: number;
      }>('/payloads/generate', {
        method: 'POST',
        body: JSON.stringify({
          sample: JSON.parse(sample) as Record<string, unknown>,
          count,
          seedCount: Math.min(25, count),
        }),
      });
      setOutput(JSON.stringify(result.payloads.slice(0, 5), null, 2));
    } finally {
      setIsGenerating(false);
    }
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
            Payload count
            <input
              type="number"
              min={1}
              max={10_000}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>
          <button disabled={isGenerating} onClick={() => void generate()}>
            {isGenerating ? 'Generating…' : 'Generate payloads'}
          </button>
        </div>
        <pre className="payload-preview">
          {output || 'Generated payload preview appears here.'}
        </pre>
      </div>
    </section>
  );
}
