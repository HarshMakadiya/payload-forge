'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Pause,
  Play,
  Rocket,
  ShieldCheck,
  StopCircle,
  X,
} from 'lucide-react';
import {
  apiRequest,
  type Endpoint,
  type Environment,
  type PayloadTemplate,
  type TestRun,
} from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Input } from './ui/input';
import { LiveExecutionCockpit } from './live-execution-cockpit';
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
  const [cockpitRunId, setCockpitRunId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [runError, setRunError] = useState('');

  const selectedEnvironment = environments.find(
    (environment) => environment.id === environmentId
  );
  const selectedEndpoint = endpoints.find(
    (endpoint) => endpoint.id === endpointId
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

  const plannedRpm = useMemo(() => {
    return Math.round(total / Math.max(1, durationMinutes));
  }, [durationMinutes, total]);

  const plannedRps = useMemo(() => {
    return (total / (Math.max(1, durationMinutes) * 60)).toFixed(1);
  }, [durationMinutes, total]);

  const isConfigurationReady =
    environmentId !== '' &&
    endpointId !== '' &&
    total >= 1 &&
    durationMinutes >= 1;
  const isWithinConfiguredLimits =
    total <= 1_000_000 &&
    plannedRpm <= 10_000 &&
    maxConcurrency >= 1 &&
    maxConcurrency <= 500;
  const selectedPayloadTemplate = payloadTemplates.find(
    (template) => template.id === payloadTemplateId
  );

  const startRun = async (): Promise<void> => {
    setRunError('');
    setIsSubmitting(true);
    try {
      const newRun = await apiRequest<TestRun>('/runs', {
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
      setCockpitRunId(newRun.id);
      setIsReviewOpen(false);
      await onChanged();
    } catch (caught: unknown) {
      setRunError(
        caught instanceof Error ? caught.message : 'Failed to start test run'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const control = async (
    runId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<void> => {
    setRunError('');
    try {
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
    } catch (caught: unknown) {
      setRunError(
        caught instanceof Error
          ? caught.message
          : `Failed to ${action} test run`
      );
    }
  };

  const isLaunchReady =
    isConfigurationReady &&
    isWithinConfiguredLimits &&
    ownershipAcknowledged &&
    (selectedEnvironment?.kind !== 'PRODUCTION' || productionConfirmed);

  const handleFormKeyDown = (event: React.KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      if (isConfigurationReady) {
        event.preventDefault();
        setIsReviewOpen(true);
      }
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execution Engine
          </span>
          <CardTitle className="text-xl font-bold flex items-center gap-2 mt-0.5">
            <Rocket className="h-5 w-5 text-primary" />
            Launch Test Run
          </CardTitle>
          <CardDescription>
            Configure load profiles, concurrency thresholds, and dispatch test
            runs.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="font-mono text-[11px] text-muted-foreground"
          >
            10k req/min max · ⌘⏎ to review
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Launch Configuration Form */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-lg bg-surface border border-border"
          onKeyDown={handleFormKeyDown}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Environment
            </label>
            <select
              value={environmentId}
              onChange={(event) => setEnvironmentId(event.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Select target environment…</option>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name} · {environment.kind.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Endpoint
            </label>
            <select
              value={endpointId}
              onChange={(event) => setEndpointId(event.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Select endpoint…</option>
              {endpoints.map((endpoint) => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.method} {endpoint.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Payload Template
            </label>
            <select
              value={payloadTemplateId}
              onChange={(event) => setPayloadTemplateId(event.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Endpoint default sample</option>
              {payloadTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · v{template.version}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Logical Requests
              </label>
              <span
                className="text-[10px] text-muted-foreground"
                title="Target operations executed across the duration"
              >
                <HelpCircle className="h-3 w-3 inline" />
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={1_000_000}
              value={total}
              onChange={(event) => setTotal(Number(event.target.value))}
              className="bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Duration (minutes)
            </label>
            <Input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
              className="bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Rate Strategy
              </label>
            </div>
            <select
              value={rateStrategy}
              onChange={(event) =>
                setRateStrategy(event.target.value as 'constant' | 'burst')
              }
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="constant">Constant (Even pacing)</option>
              <option value="burst">Burst (Wave dispatch)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Max Concurrency
              </label>
              <span
                className="text-[10px] text-muted-foreground"
                title="Parallel worker threads"
              >
                <HelpCircle className="h-3 w-3 inline" />
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={500}
              value={maxConcurrency}
              onChange={(event) =>
                setMaxConcurrency(Number(event.target.value))
              }
              className="bg-card"
            />
          </div>
        </div>

        {/* Preflight Summary Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-lg bg-surface border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                ESTIMATED RATE
              </span>
              <div className="text-sm font-bold text-foreground">
                {plannedRpm.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  req/min
                </span>{' '}
                <span className="text-xs text-muted-foreground font-mono">
                  ({plannedRps} req/s)
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                TARGET DISPATCH URL
              </span>
              <div className="text-xs font-mono text-foreground truncate max-w-[280px]">
                {selectedEnvironment && selectedEndpoint
                  ? `${selectedEndpoint.method} ${selectedEnvironment.baseUrl}${selectedEndpoint.path}`
                  : 'Select target & endpoint'}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                TRAFFIC PROFILE
              </span>
              <div className="text-sm font-semibold text-foreground">
                {maxConcurrency} workers ·{' '}
                <span className="text-xs uppercase text-muted-foreground font-mono">
                  {rateStrategy}
                </span>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            disabled={!isConfigurationReady}
            onClick={() => setIsReviewOpen(true)}
            className="w-full lg:w-auto font-bold tracking-wide"
            title={
              !isConfigurationReady
                ? 'Select a target, endpoint, request count, and duration (⌘⏎)'
                : 'Review this controlled load test before starting (⌘⏎)'
            }
          >
            <Rocket className="h-4 w-4 mr-2" />
            Review Run
          </Button>
        </div>

        {isReviewOpen && (
          <section
            aria-labelledby="run-review-heading"
            className="space-y-5 rounded-lg border border-primary/40 bg-primary/5 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3
                  id="run-review-heading"
                  className="flex items-center gap-2 text-base font-bold text-foreground"
                >
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Review this run
                </h3>
                <p className="text-sm text-muted-foreground">
                  Traffic is not sent until you confirm the checks below.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReviewOpen(false)}
                disabled={isSubmitting}
              >
                Back to setup
              </Button>
            </div>

            <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-medium text-muted-foreground">
                  Destination
                </dt>
                <dd className="break-all font-mono text-xs font-semibold text-foreground">
                  {selectedEndpoint?.method} {selectedEnvironment?.baseUrl}
                  {selectedEndpoint?.path}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-medium text-muted-foreground">
                  Load profile
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {total.toLocaleString()} logical requests over{' '}
                  {durationMinutes}{' '}
                  {durationMinutes === 1 ? 'minute' : 'minutes'} ·{' '}
                  {rateStrategy} pacing · {maxConcurrency} workers
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-medium text-muted-foreground">
                  Estimated impact
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {plannedRpm.toLocaleString()} req/min{' '}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    ({plannedRps} req/s)
                  </span>
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-xs font-medium text-muted-foreground">
                  Payload source
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {selectedPayloadTemplate === undefined
                    ? 'Endpoint default sample'
                    : `${selectedPayloadTemplate.name} · v${selectedPayloadTemplate.version}`}
                </dd>
              </div>
            </dl>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Safety checks
              </h4>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                <li className="flex gap-3 px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Target policy
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The server revalidates this target before it dispatches
                      traffic.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 px-4 py-3">
                  {isWithinConfiguredLimits ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {isWithinConfiguredLimits
                        ? 'Configured limits are within range'
                        : 'Configured limits need adjustment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maximum 1,000,000 requests, 10,000 req/min, and 500
                      workers.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 px-4 py-3">
                  {selectedEnvironment?.kind === 'PRODUCTION' ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedEnvironment?.kind === 'PRODUCTION'
                        ? 'Production target selected'
                        : 'Non-production target selected'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEnvironment?.kind === 'PRODUCTION'
                        ? 'A second acknowledgement and stricter server limits are required.'
                        : 'Standard authorization acknowledgement is required.'}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={ownershipAcknowledged}
                  onChange={(event) =>
                    setOwnershipAcknowledged(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary accent-primary"
                />
                <span className="font-medium">
                  I own or am authorized to test this target.
                </span>
              </label>

              {selectedEnvironment?.kind === 'PRODUCTION' && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                  <input
                    type="checkbox"
                    checked={productionConfirmed}
                    onChange={(event) =>
                      setProductionConfirmed(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-warning bg-card text-warning focus:ring-warning accent-warning"
                  />
                  <span className="font-semibold">
                    I confirm this run will send traffic to PRODUCTION.
                  </span>
                </label>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {isLaunchReady
                  ? 'Ready to start. The server will perform final validation.'
                  : 'Complete every acknowledgement and resolve any limit issue to start.'}
              </p>
              <Button
                size="lg"
                disabled={isSubmitting || !isLaunchReady}
                onClick={() => void startRun()}
                className="font-bold tracking-wide"
              >
                <Rocket className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Starting Run…' : 'Start Test Run'}
              </Button>
            </div>
          </section>
        )}

        {runError !== '' && (
          <div
            className="flex items-center justify-between p-3 rounded-md border border-destructive/30 bg-destructive/10 text-xs text-foreground"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <span>{runError}</span>
            </div>
            <button
              onClick={() => setRunError('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Runs History Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Test Runs ({runs.length})
            </h3>
          </div>

          {runs.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
              No Test Runs executed yet. Configure parameters above and launch
              your first run.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-surface overflow-hidden">
              {runs.map((run) => {
                const hasSpike =
                  run.failed > 0 &&
                  run.attemptCount > 0 &&
                  run.failed / run.attemptCount > 0.1;

                const isCompleted = run.status === 'COMPLETED';
                const isRunning = run.status === 'RUNNING';
                const isPaused = run.status === 'PAUSED';
                const isCancelled = run.status === 'CANCELLED';

                return (
                  <article
                    key={run.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-card/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Status Badge with User's semantic colors */}
                      {isCompleted && (
                        <Badge variant="success" className="capitalize">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {isRunning && (
                        <Badge variant="warning" className="capitalize">
                          <span className="pulse-indicator bg-warning mr-1.5" />
                          Running
                        </Badge>
                      )}
                      {isPaused && (
                        <Badge variant="warning" className="capitalize">
                          Paused
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge variant="cancelled" className="capitalize">
                          Cancelled
                        </Badge>
                      )}

                      <span className="text-sm font-bold text-foreground">
                        {run.totalLogicalRequests.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          reqs
                        </span>
                      </span>

                      <span className="text-xs font-mono text-muted-foreground">
                        {run.requestsPerMinute.toLocaleString()}/min
                      </span>

                      {hasSpike && (
                        <Badge variant="destructive">
                          Spike (
                          {((run.failed / run.attemptCount) * 100).toFixed(0)}%
                          err)
                        </Badge>
                      )}

                      {!hasSpike && isCompleted && run.failed === 0 && (
                        <Badge variant="success">✓ 100% Passed</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className="text-success font-semibold">
                        {run.succeeded} passed
                      </span>
                      {run.failed > 0 ? (
                        <span className="text-destructive font-semibold">
                          {run.failed} failed
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0 failed</span>
                      )}
                      <span className="text-muted-foreground">
                        {run.attemptCount} attempts
                      </span>
                      {run.summary !== null && (
                        <span className="p-1 px-2 rounded bg-card border border-border font-mono text-foreground font-semibold">
                          p95: {run.summary.latencyPercentiles.p95.toFixed(0)}ms
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={
                          isRunning || isPaused ? 'default' : 'secondary'
                        }
                        onClick={() => setCockpitRunId(run.id)}
                        className="text-xs"
                      >
                        {(isRunning || isPaused) && (
                          <span className="pulse-indicator bg-primary mr-1.5" />
                        )}
                        <Gauge className="h-3.5 w-3.5 mr-1" />
                        Cockpit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectedRunId(run.id)}
                        className="text-xs"
                      >
                        Logs
                      </Button>

                      {isRunning && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void control(run.id, 'pause')}
                          className="text-xs"
                        >
                          <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                        </Button>
                      )}

                      {isPaused && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void control(run.id, 'resume')}
                          className="text-xs"
                        >
                          <Play className="h-3.5 w-3.5 mr-1" /> Resume
                        </Button>
                      )}

                      {(isRunning || isPaused) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void control(run.id, 'cancel')}
                          className="text-xs"
                        >
                          <StopCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {cockpitRunId !== '' && (
          <LiveExecutionCockpit
            runId={cockpitRunId}
            projectId={projectId}
            environments={environments}
            endpoints={endpoints}
            initialRun={runs.find((r) => r.id === cockpitRunId)}
            onClose={() => setCockpitRunId('')}
            onRunUpdated={onChanged}
          />
        )}

        {inspectedRunId !== '' && (
          <RunLogExplorer
            runId={inspectedRunId}
            onClose={() => setInspectedRunId('')}
          />
        )}
      </CardContent>
    </Card>
  );
}
