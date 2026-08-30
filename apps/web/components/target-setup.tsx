'use client';

import { useState } from 'react';
import { apiRequest } from '../lib/api';

interface TargetSetupProps {
  readonly projectId: string;
  readonly onChanged: () => Promise<void>;
}

export function TargetSetup({
  projectId,
  onChanged,
}: TargetSetupProps): React.ReactElement {
  const [baseUrl, setBaseUrl] = useState('https://httpbin.org');
  const [environmentName, setEnvironmentName] = useState('Development');
  const [isProduction, setIsProduction] = useState(false);
  const [endpointName, setEndpointName] = useState('Create payload');
  const [method, setMethod] = useState('POST');
  const [path, setPath] = useState('/anything');

  const createEnvironment = async (): Promise<void> => {
    await apiRequest('/environments', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        name: environmentName,
        baseUrl,
        isProduction,
      }),
    });
    await onChanged();
  };

  const createEndpoint = async (): Promise<void> => {
    await apiRequest('/endpoints', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        name: endpointName,
        method,
        path,
        payloadSample: { name: 'Sample User', email: 'sample@example.test' },
      }),
    });
    await onChanged();
  };

  return (
    <section className="card target-card">
      <span className="eyebrow">Target setup</span>
      <div className="split-grid">
        <div className="form-stack">
          <h3>Environment</h3>
          <input
            value={environmentName}
            onChange={(event) => setEnvironmentName(event.target.value)}
            placeholder="Environment name"
          />
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.example.com"
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={isProduction}
              onChange={(event) => setIsProduction(event.target.checked)}
            />
            Production target
          </label>
          <button onClick={() => void createEnvironment()}>
            Save environment
          </button>
        </div>
        <div className="form-stack">
          <h3>Endpoint</h3>
          <input
            value={endpointName}
            onChange={(event) => setEndpointName(event.target.value)}
            placeholder="Endpoint name"
          />
          <div className="inline-form method-path">
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/v1/orders"
            />
          </div>
          <button onClick={() => void createEndpoint()}>Save Endpoint</button>
        </div>
      </div>
    </section>
  );
}
