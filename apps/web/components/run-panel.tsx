'use client';

import { useEffect, useState } from 'react';
import {
  apiRequest,
  type Endpoint,
  type Environment,
  type PayloadTemplate,
  type TestRun,
} from '../lib/api';
import { RunLogExplorer } from './run-log-explorer';

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
  const [rateStrategy, setRateStrategy] = useState<'constant' | 'burst'>(
    'constant'
  );
  const [maxConcurrency, setMaxConcurrency] = useState(10);
  const [ownershipAcknowledged, setOwnershipAcknowledged] = useState(false);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [payloadTemplates, setPayloadTemplates] = useState<
    readonly PayloadTemplate[]
  >([]);
  const [payloadTemplateId, setPayloadTemplateId] = useState('');
  const [inspectedRunId, setInspectedRunId] = useState('');
  const selectedEnvironment = environments.find(
    (environment) => environment.id === environmentId
  );

  useEffect(() => {
    setProductionConfirmed(false);
  }, [environmentId]);

  useEffect(() => {
    setPayloadTemplateId('');
    if (endpointId === '') {
      setPayloadTemplates([]);
      return;
    }
    void apiRequest<PayloadTemplate[]>(
      `/endpoints/${endpointId}/payload-templates`
    ).then(setPayloadTemplates);
  }, [endpointId]);

  const startRun = async (): Promise<void> => {
    await apiRequest('/runs', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        environmentId,
        endpointId,
        totalLogicalRequests: total,
        durationMinutes,
        rateStrategy,
        maxConcurrency,
        ownershipAcknowledged,
        productionConfirmed,
        ...(payloadTemplateId === '' ? {} : { payloadTemplateId }),
      }),
    });
    await onChanged();
  };

  const control = async (
    runId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<void> => {
    const status =
      action === 'pause'
        ? 'PAUSED'
        : action === 'resume'
          ? 'RUNNING'
          : 'CANCELLED';
    await apiRequest(`/runs/${runId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
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
          Payload template
          <select
            value={payloadTemplateId}
            onChange={(event) => setPayloadTemplateId(event.target.value)}
          >
            <option value="">Endpoint default</option>
            {payloadTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · v{template.version}
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
          Rate strategy
          <select
            value={rateStrategy}
            onChange={(event) =>
              setRateStrategy(event.target.value as 'constant' | 'burst')
            }
          >
            <option value="constant">Constant</option>
            <option value="burst">Burst</option>
          </select>
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={ownershipAcknowledged}
            onChange={(event) => setOwnershipAcknowledged(event.target.checked)}
          />
          I own or am authorized to test this target.
        </label>
        {selectedEnvironment?.kind === 'PRODUCTION' && (
          <label className="checkbox-label production-confirmation">
            <input
              type="checkbox"
              checked={productionConfirmed}
              onChange={(event) => setProductionConfirmed(event.target.checked)}
            />
            I confirm this run may send traffic to production.
          </label>
        )}
        <button
          className="primary-action"
          disabled={
            environmentId === '' ||
            endpointId === '' ||
            !ownershipAcknowledged ||
            (selectedEnvironment?.kind === 'PRODUCTION' && !productionConfirmed)
          }
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
                <span>{run.queued} queued</span>
                <span>{run.inFlight} in flight</span>
                <span>{run.timedOut} timed out</span>
                {run.summary !== null && (
                  <>
                    <span>
                      p95 {run.summary.latencyPercentiles.p95.toFixed(0)} ms
                    </span>
                    <span>
                      {run.summary.actualRequestsPerSecond.toFixed(2)} req/s
                    </span>
                    {Object.entries(run.summary.errorBreakdown).map(
                      ([error, count]) => (
                        <span className="danger" key={error}>
                          {error}: {count}
                        </span>
                      )
                    )}
                  </>
                )}
              </div>
              <div className="row-actions">
                <button onClick={() => setInspectedRunId(run.id)}>
                  Inspect logs
                </button>
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
      {inspectedRunId !== '' && (
        <RunLogExplorer
          runId={inspectedRunId}
          onClose={() => setInspectedRunId('')}
        />
      )}
    </section>
  );
}
