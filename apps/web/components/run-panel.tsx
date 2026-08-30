'use client';

import { useState } from 'react';
import {
  apiRequest,
  type Endpoint,
  type Environment,
  type TestRun,
} from '../lib/api';

interface RunPanelProps {
  readonly projectId: string;
  readonly environments: readonly Environment[];
  readonly endpoints: readonly Endpoint[];
  readonly runs: readonly TestRun[];
  readonly onChanged: () => Promise<void>;
}

export function RunPanel({
  projectId,
  environments,
  endpoints,
  runs,
  onChanged,
}: RunPanelProps): React.ReactElement {
  const [environmentId, setEnvironmentId] = useState('');
  const [endpointId, setEndpointId] = useState('');
  const [total, setTotal] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [maxConcurrency, setMaxConcurrency] = useState(10);
  const selectedEnvironment = environments.find(
    (environment) => environment.id === environmentId
  );

  const startRun = async (): Promise<void> => {
    await apiRequest('/runs', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        environmentId,
        endpointId,
        totalLogicalRequests: total,
        durationMinutes,
        maxConcurrency,
        productionConfirmed: selectedEnvironment?.kind === 'PRODUCTION',
      }),
    });
    await onChanged();
  };

  const control = async (
    runId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<void> => {
    await apiRequest(`/runs/${runId}/${action}`, { method: 'POST' });
    await onChanged();
  };

  return (
    <section className="card run-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Execution</span>
          <h2>Launch Test Run</h2>
        </div>
        <span className="limit-chip">10,000 requests/min max</span>
      </div>
      <div className="run-form">
        <label>
          Environment
          <select
            value={environmentId}
            onChange={(event) => setEnvironmentId(event.target.value)}
          >
            <option value="">Select</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name} · {environment.kind.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Endpoint
          <select
            value={endpointId}
            onChange={(event) => setEndpointId(event.target.value)}
          >
            <option value="">Select</option>
            {endpoints.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.method} {endpoint.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Logical requests
          <input
            type="number"
            min={1}
            max={1_000_000}
            value={total}
            onChange={(event) => setTotal(Number(event.target.value))}
          />
        </label>
        <label>
          Duration (minutes)
          <input
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
          />
        </label>
        <label>
          Max concurrency
          <input
            type="number"
            min={1}
            max={500}
            value={maxConcurrency}
            onChange={(event) => setMaxConcurrency(Number(event.target.value))}
          />
        </label>
        <button
          className="primary-action"
          disabled={environmentId === '' || endpointId === ''}
          onClick={() => void startRun()}
        >
          Start Run
        </button>
      </div>

      <div className="runs-list">
        {runs.length === 0 ? (
          <p className="empty-state">No Test Runs yet.</p>
        ) : (
          runs.map((run) => (
            <article className="run-row" key={run.id}>
              <div>
                <span className={`status status-${run.status.toLowerCase()}`}>
                  {run.status}
                </span>
                <strong>
                  {run.totalLogicalRequests.toLocaleString()} logical
                </strong>
                <small>{run.requestsPerMinute.toLocaleString()}/min</small>
              </div>
              <div className="metrics">
                <span className="success">{run.succeeded} passed</span>
                <span className="danger">{run.failed} failed</span>
                <span>{run.attemptCount} attempts</span>
              </div>
              <div className="row-actions">
                {run.status === 'RUNNING' && (
                  <button onClick={() => void control(run.id, 'pause')}>
                    Pause
                  </button>
                )}
                {run.status === 'PAUSED' && (
                  <button onClick={() => void control(run.id, 'resume')}>
                    Resume
                  </button>
                )}
                {(run.status === 'RUNNING' || run.status === 'PAUSED') && (
                  <button
                    className="danger-button"
                    onClick={() => void control(run.id, 'cancel')}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
