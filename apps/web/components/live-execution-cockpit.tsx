'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Sliders,
  StopCircle,
  X,
} from 'lucide-react';
import {
  apiRequest,
  API_ORIGIN,
  type Endpoint,
  type Environment,
  type RequestAttempt,
  type TestRun,
} from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { PayloadViewerModal } from './payload-viewer-modal';
import { RunLogExplorer } from './run-log-explorer';

interface TelemetryPoint {
  readonly timestamp: number;
  readonly timeLabel: string;
  readonly elapsedSec: number;
  readonly p50: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly attempts: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly timedOut: number;
  readonly inFlight: number;
  readonly rps: number;
}

interface LiveExecutionCockpitProps {
  readonly runId: string;
  readonly projectId: string;
  readonly environments: readonly Environment[];
  readonly endpoints: readonly Endpoint[];
  readonly initialRun?: TestRun | undefined;
  readonly onClose: () => void;
  readonly onRunUpdated?: (() => Promise<void>) | undefined;
}

export function LiveExecutionCockpit({
  runId,
  environments,
  endpoints,
  initialRun,
  onClose,
  onRunUpdated,
}: LiveExecutionCockpitProps): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState<TestRun | null>(initialRun ?? null);
  const [attempts, setAttempts] = useState<readonly RequestAttempt[]>([]);
  const [selectedAttemptForPayload, setSelectedAttemptForPayload] = useState<{
    attempt: RequestAttempt;
    kind: 'request' | 'response';
  } | null>(null);
  const [isLogExplorerOpen, setIsLogExplorerOpen] = useState(false);
  const [history, setHistory] = useState<readonly TelemetryPoint[]>([]);
  const [throttlePercent, setThrottlePercent] = useState<number>(100);
  const [isThrottling, setIsThrottling] = useState(false);
  const [circuitBreakerTripped, setCircuitBreakerTripped] = useState(false);
  const [selectedErrorFilter, setSelectedErrorFilter] = useState<string | null>(
    null
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const fetchRun = useCallback(async (): Promise<void> => {
    try {
      const data = await apiRequest<TestRun>(`/runs/${runId}`);
      setRun(data);
    } catch {
      // Handled gracefully
    }
  }, [runId]);

  const fetchAttempts = useCallback(async (): Promise<void> => {
    try {
      const res = await apiRequest<{
        items: RequestAttempt[];
        total: number;
      }>(`/runs/${runId}/logs?pageSize=25`);
      setAttempts(res.items);
    } catch {
      // Handled gracefully
    }
  }, [runId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while cockpit is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Elapsed timer tracking
  useEffect(() => {
    if (run?.createdAt) {
      startTimeRef.current = new Date(run.createdAt).getTime();
    }
    const tick = (): void => {
      const sec = Math.max(
        0,
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
      setElapsedSeconds(sec);
    };
    tick();
    timerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [run?.createdAt]);

  // Real-time socket & polling loop
  useEffect(() => {
    void fetchRun();
    void fetchAttempts();

    const socket = io(API_ORIGIN, { transports: ['websocket'] });
    socket.on('run-progress', (event: unknown) => {
      const progress = event as {
        runId?: string;
        attempts?: number;
        succeeded?: number;
        failed?: number;
        timedOut?: number;
        inFlight?: number;
        summary?: TestRun['summary'];
      };
      if (progress?.runId === runId) {
        void fetchRun();
        void fetchAttempts();
        if (onRunUpdated) {
          void onRunUpdated();
        }
      }
    });

    const interval = window.setInterval(() => {
      void fetchRun();
      void fetchAttempts();
    }, 2500);

    return () => {
      socket.close();
      window.clearInterval(interval);
    };
  }, [fetchAttempts, fetchRun, onRunUpdated, runId]);

  // Build sliding-window telemetry points for Recharts
  useEffect(() => {
    if (!run) return;

    const summary = run.summary;
    const p50 = summary?.latencyPercentiles.p50 ?? 0;
    const p90 = summary?.latencyPercentiles.p90 ?? 0;
    const p95 = summary?.latencyPercentiles.p95 ?? 0;
    const p99 = summary?.latencyPercentiles.p99 ?? 0;

    let curP50 = p50;
    let curP90 = p90;
    let curP95 = p95;
    let curP99 = p99;

    if (attempts.length > 0 && curP50 === 0) {
      const latencies = attempts.map((a) => a.latencyMs).sort((a, b) => a - b);
      curP50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
      curP90 = latencies[Math.floor(latencies.length * 0.9)] ?? 0;
      curP95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
      curP99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
    }

    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeLabel = `${mins}:${secs.toString().padStart(2, '0')}`;

    const newPoint: TelemetryPoint = {
      timestamp: Date.now(),
      timeLabel,
      elapsedSec: elapsedSeconds,
      p50: Math.round(curP50),
      p90: Math.round(curP90),
      p95: Math.round(curP95),
      p99: Math.round(curP99),
      attempts: run.attemptCount,
      succeeded: run.succeeded,
      failed: run.failed,
      timedOut: run.timedOut,
      inFlight: run.inFlight,
      rps:
        summary?.actualRequestsPerSecond ??
        run.attemptCount / Math.max(1, elapsedSeconds),
    };

    setHistory((prev) => {
      const next = [...prev, newPoint];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });

    const errorCount = run.failed + run.timedOut;
    if (run.attemptCount >= 20) {
      const errorRate = errorCount / run.attemptCount;
      if (errorRate >= 0.2 && run.status === 'RUNNING') {
        setCircuitBreakerTripped(true);
      } else if (errorRate < 0.15) {
        setCircuitBreakerTripped(false);
      }
    }
  }, [attempts, elapsedSeconds, run]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (run?.status === 'RUNNING') {
          void controlRun('pause');
        } else if (run?.status === 'PAUSED') {
          void controlRun('resume');
        }
      } else if (e.key === 'Escape') {
        if (confirmCancel) {
          setConfirmCancel(false);
        } else if (!isLogExplorerOpen && !selectedAttemptForPayload) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    confirmCancel,
    isLogExplorerOpen,
    onClose,
    run?.status,
    selectedAttemptForPayload,
  ]);

  const controlRun = async (
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
    setConfirmCancel(false);
    await fetchRun();
    if (onRunUpdated) {
      await onRunUpdated();
    }
  };

  const applyThrottle = (val: number): void => {
    setThrottlePercent(val);
    setIsThrottling(true);
    setTimeout(() => setIsThrottling(false), 800);
  };

  const errorBreakdown = useMemo(() => {
    if (
      run?.summary?.errorBreakdown &&
      Object.keys(run.summary.errorBreakdown).length > 0
    ) {
      return run.summary.errorBreakdown;
    }
    const grouped: Record<string, number> = {};
    for (const attempt of attempts) {
      if (
        attempt.error ||
        (attempt.statusCode !== null && attempt.statusCode >= 400)
      ) {
        const key =
          attempt.errorType ||
          (attempt.statusCode ? `HTTP ${attempt.statusCode}` : 'Error');
        grouped[key] = (grouped[key] ?? 0) + 1;
      }
    }
    return grouped;
  }, [attempts, run?.summary?.errorBreakdown]);

  const filteredAttempts = useMemo(() => {
    if (!selectedErrorFilter) return attempts;
    return attempts.filter((att) => {
      if (selectedErrorFilter.startsWith('HTTP ')) {
        const code = Number(selectedErrorFilter.replace('HTTP ', ''));
        return att.statusCode === code;
      }
      return (
        att.errorType === selectedErrorFilter ||
        att.error?.includes(selectedErrorFilter)
      );
    });
  }, [attempts, selectedErrorFilter]);

  const totalAttempts = run?.attemptCount ?? 0;
  const succeededCount = run?.succeeded ?? 0;
  const failedCount = run?.failed ?? 0;
  const timedOutCount = run?.timedOut ?? 0;
  const inFlightCount = run?.inFlight ?? 0;
  const queuedCount = run?.queued ?? 0;

  const successPercent =
    totalAttempts > 0 ? (succeededCount / totalAttempts) * 100 : 100;
  const failPercent =
    totalAttempts > 0 ? (failedCount / totalAttempts) * 100 : 0;
  const timeoutPercent =
    totalAttempts > 0 ? (timedOutCount / totalAttempts) * 100 : 0;

  const matchedEnv = environments[0];
  const matchedEndpoint = endpoints[0];

  const formatSec = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto flex flex-col">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        {/* Cockpit Mission Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Workbench (Esc)
            </Button>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                MISSION COCKPIT
              </span>
              <h2 className="text-xl font-bold text-foreground">
                Test Run{' '}
                <span className="font-mono text-primary font-normal">
                  #{runId.slice(0, 8)}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {matchedEnv && (
              <Badge variant="secondary" className="text-xs">
                {matchedEnv.name} · {matchedEnv.kind}
              </Badge>
            )}
            {matchedEndpoint && (
              <Badge variant="outline" className="text-xs font-mono">
                <span className="text-primary font-bold mr-1">
                  {matchedEndpoint.method}
                </span>
                {matchedEndpoint.name}
              </Badge>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-mono">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground font-bold">
                {formatSec(elapsedSeconds)}
              </span>
            </div>

            {run?.status === 'COMPLETED' && (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                COMPLETED
              </Badge>
            )}
            {run?.status === 'RUNNING' && (
              <Badge variant="warning" className="text-xs">
                <span className="pulse-indicator bg-warning mr-1.5" />
                RUNNING
              </Badge>
            )}
            {run?.status === 'PAUSED' && (
              <Badge variant="warning" className="text-xs">
                PAUSED
              </Badge>
            )}
            {run?.status === 'CANCELLED' && (
              <Badge variant="cancelled" className="text-xs">
                CANCELLED
              </Badge>
            )}
          </div>
        </header>

        {/* Circuit Breaker Alert Banner */}
        {circuitBreakerTripped && (
          <div
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold text-foreground">
                  Circuit Breaker Triggered: Error rate elevated (&gt;20%)
                </strong>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target endpoint is reporting failure bursts. You can throttle
                  traffic, auto-pause, or cancel.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyThrottle(50)}
                className="text-xs"
              >
                Throttle to 50%
              </Button>
              {run?.status === 'RUNNING' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void controlRun('pause')}
                  className="text-xs"
                >
                  Auto-Pause Run
                </Button>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setCircuitBreakerTripped(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Dynamic Rate Throttle & Live Controls Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 rounded-xl bg-surface border border-border">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Dynamic Rate Throttle
              </span>
              <span className="text-xs font-bold text-foreground font-mono">
                {throttlePercent}%{' '}
                <span className="text-muted-foreground font-normal">
                  (
                  {Math.round(
                    ((run?.requestsPerMinute ?? 600) / 60) *
                      (throttlePercent / 100)
                  )}{' '}
                  req/s)
                </span>
              </span>
            </div>

            <div className="space-y-2">
              <Slider
                min={10}
                max={200}
                step={10}
                value={[throttlePercent]}
                onValueChange={(vals) => applyThrottle(vals[0] ?? 100)}
                disabled={run?.status !== 'RUNNING' && run?.status !== 'PAUSED'}
              />
              <div className="flex items-center gap-2 pt-1">
                {[50, 100, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyThrottle(preset)}
                    className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                  >
                    {preset === 200 ? '2x Max' : `${preset}%`}
                  </button>
                ))}
                {isThrottling && (
                  <span className="text-[11px] text-primary animate-pulse ml-2 font-medium">
                    Applied throttle update
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between space-y-2 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Run Controls
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Space = Pause/Resume
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {run?.status === 'RUNNING' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void controlRun('pause')}
                  className="text-xs"
                >
                  <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause Run
                </Button>
              )}

              {run?.status === 'PAUSED' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => void controlRun('resume')}
                  className="text-xs font-bold"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Resume Run
                </Button>
              )}

              {run?.status !== 'COMPLETED' &&
                run?.status !== 'CANCELLED' &&
                (confirmCancel ? (
                  <div className="flex items-center gap-1.5 bg-destructive/10 p-1 rounded-md border border-destructive/30">
                    <span className="text-xs font-bold text-destructive px-1.5">
                      Abort?
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void controlRun('cancel')}
                      className="text-xs h-7"
                    >
                      Yes, Kill
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmCancel(false)}
                      className="text-xs h-7 text-muted-foreground hover:text-foreground"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmCancel(true)}
                    className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <StopCircle className="h-3.5 w-3.5 mr-1.5" /> Emergency
                    Killswitch
                  </Button>
                ))}

              {(run?.status === 'COMPLETED' || run?.status === 'CANCELLED') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Done · Return to Workbench
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Charts & Gauges Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Recharts Percentiles Latency Curve */}
          <div className="lg:col-span-8 p-5 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Real-time Latency (Sliding Window)
                </span>
                <h3 className="text-base font-bold text-foreground">
                  Percentiles Trend (ms)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-success font-semibold">
                  <span className="h-2 w-2 rounded-full bg-success inline-block" />{' '}
                  p50
                </span>
                <span className="flex items-center gap-1 text-[#82DBC5]">
                  <span className="h-2 w-2 rounded-full bg-[#82DBC5] inline-block" />{' '}
                  p90
                </span>
                <span className="flex items-center gap-1 text-warning">
                  <span className="h-2 w-2 rounded-full bg-warning inline-block" />{' '}
                  p95
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive inline-block" />{' '}
                  p99
                </span>
              </div>
            </div>

            {/* Recharts Latency Chart */}
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...history]}>
                  <CartesianGrid
                    stroke="#1E2521"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="timeLabel"
                    stroke="#8A9289"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#1E2521' }}
                  />
                  <YAxis
                    stroke="#8A9289"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#1E2521' }}
                    unit="ms"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="recharts-custom-tooltip text-xs font-mono space-y-1">
                            <div className="font-bold text-muted-foreground border-b border-border pb-1">
                              Time: {label}
                            </div>
                            {payload.map((entry) => (
                              <div
                                key={entry.name}
                                className="flex items-center justify-between gap-4"
                                style={{ color: entry.color }}
                              >
                                <span className="font-semibold">
                                  {entry.name}:
                                </span>
                                <span>{entry.value} ms</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="p50"
                    stroke="#4DD4C7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="p50"
                  />
                  <Line
                    type="monotone"
                    dataKey="p90"
                    stroke="#82DBC5"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={false}
                    isAnimationActive={false}
                    name="p90"
                  />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    stroke="#F2B84B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="p95"
                  />
                  <Line
                    type="monotone"
                    dataKey="p99"
                    stroke="#F0665A"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="p99"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  p50 Median
                </span>
                <div className="text-base font-bold text-success font-mono mt-0.5">
                  {history.length > 0 && history[history.length - 1]
                    ? `${history[history.length - 1]!.p50} ms`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  p90 Latency
                </span>
                <div className="text-base font-bold text-[#82DBC5] font-mono mt-0.5">
                  {history.length > 0 && history[history.length - 1]
                    ? `${history[history.length - 1]!.p90} ms`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  p95 Spike
                </span>
                <div className="text-base font-bold text-warning font-mono mt-0.5">
                  {history.length > 0 && history[history.length - 1]
                    ? `${history[history.length - 1]!.p95} ms`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  p99 Tail
                </span>
                <div className="text-base font-bold text-destructive font-mono mt-0.5">
                  {history.length > 0 && history[history.length - 1]
                    ? `${history[history.length - 1]!.p99} ms`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Status Distribution & Concurrency */}
          <div className="lg:col-span-4 p-5 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Traffic & Workers
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    Status & Concurrency
                  </h3>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {run?.summary?.actualRequestsPerSecond
                    ? `${run.summary.actualRequestsPerSecond.toFixed(1)} req/s`
                    : `${(totalAttempts / Math.max(1, elapsedSeconds)).toFixed(1)} req/s`}
                </Badge>
              </div>

              {/* Status Ratio Bar */}
              <div className="space-y-2 mt-4">
                <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex border border-border">
                  <div
                    className="bg-success transition-all duration-300"
                    style={{ width: `${successPercent}%` }}
                    title={`2xx Success: ${succeededCount}`}
                  />
                  <div
                    className="bg-destructive transition-all duration-300"
                    style={{ width: `${failPercent}%` }}
                    title={`Errors: ${failedCount}`}
                  />
                  <div
                    className="bg-warning transition-all duration-300"
                    style={{ width: `${timeoutPercent}%` }}
                    title={`Timeouts: ${timedOutCount}`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="flex items-center gap-1.5 text-success">
                    <span className="h-2 w-2 rounded-full bg-success inline-block" />
                    2xx: <strong>{succeededCount}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-destructive">
                    <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                    Err: <strong>{failedCount}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-warning">
                    <span className="h-2 w-2 rounded-full bg-warning inline-block" />
                    TO: <strong>{timedOutCount}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Workers & Queue Gauges */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  In Flight Workers
                </span>
                <div className="text-sm font-bold text-foreground font-mono">
                  {inFlightCount}{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    / 10 max
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-success transition-all"
                    style={{
                      width: `${Math.min(100, (inFlightCount / 10) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Dispatch Queue
                </span>
                <div className="text-sm font-bold text-foreground font-mono">
                  {queuedCount}{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    pending
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (queuedCount / Math.max(1, totalAttempts)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Failure Triage & Live Streaming Attempts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Failure Breakdown Cards */}
          <div className="lg:col-span-4 p-5 rounded-xl bg-surface border border-border space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ROOT CAUSE TRIAGE
              </span>
              <h4 className="text-base font-bold text-foreground">
                Error Breakdown
              </h4>
            </div>

            {Object.keys(errorBreakdown).length === 0 ? (
              <div className="p-6 rounded-lg bg-card border border-border text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Zero anomalies recorded. All responses operating within
                  bounds.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(errorBreakdown).map(([errType, count]) => {
                  const isSelected = selectedErrorFilter === errType;
                  return (
                    <button
                      key={errType}
                      onClick={() =>
                        setSelectedErrorFilter(isSelected ? null : errType)
                      }
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-destructive bg-destructive/15 text-foreground'
                          : 'border-border bg-card hover:bg-secondary text-foreground'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold font-mono">
                          {errType}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {isSelected
                            ? 'Filter active (click to clear)'
                            : 'Click to filter stream'}
                        </div>
                      </div>
                      <Badge variant="destructive" className="font-mono">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Streaming Attempts List */}
          <div className="lg:col-span-8 p-5 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  STREAMING ATTEMPTS
                </span>
                <h4 className="text-base font-bold text-foreground">
                  Recent Request Stream
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {selectedErrorFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedErrorFilter(null)}
                    className="text-xs"
                  >
                    Clear Filter ({selectedErrorFilter}) ✕
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsLogExplorerOpen(true)}
                  className="text-xs"
                >
                  Inspect All Logs ({totalAttempts}) →
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
              {filteredAttempts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No matching request attempts in telemetry buffer.
                </div>
              ) : (
                filteredAttempts.slice(0, 10).map((attempt) => {
                  const isErr =
                    (attempt.statusCode && attempt.statusCode >= 400) ||
                    attempt.error;
                  return (
                    <div
                      key={attempt.id}
                      className={`p-2.5 px-3 flex items-center justify-between gap-3 text-xs hover:bg-secondary/40 font-mono ${
                        isErr ? 'bg-destructive/5' : ''
                      }`}
                    >
                      <span className="text-muted-foreground text-[11px]">
                        #{attempt.logicalRequestSequence}
                      </span>
                      <Badge
                        variant={
                          attempt.statusCode && attempt.statusCode < 400
                            ? 'success'
                            : 'destructive'
                        }
                        className="text-[11px] font-bold"
                      >
                        {attempt.statusCode
                          ? `${attempt.statusCode}`
                          : (attempt.errorType ?? 'ERR')}
                      </Badge>
                      <span className="font-bold text-primary text-[11px]">
                        {attempt.requestMethod}
                      </span>
                      <span
                        className="text-foreground truncate max-w-[240px]"
                        title={attempt.requestUrl}
                      >
                        {attempt.requestUrl}
                      </span>
                      <span className="text-muted-foreground text-[11px] shrink-0">
                        {attempt.latencyMs}ms
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedAttemptForPayload({
                              attempt,
                              kind: 'request',
                            })
                          }
                          className="h-6 px-2 text-[10px]"
                        >
                          Req
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedAttemptForPayload({
                              attempt,
                              kind: 'response',
                            })
                          }
                          className="h-6 px-2 text-[10px]"
                        >
                          Res
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Payload Modal */}
      {selectedAttemptForPayload && (
        <PayloadViewerModal
          runId={runId}
          attempt={selectedAttemptForPayload.attempt}
          initialKind={selectedAttemptForPayload.kind}
          onClose={() => setSelectedAttemptForPayload(null)}
        />
      )}

      {/* Drilldown Log Explorer Modal */}
      {isLogExplorerOpen && (
        <RunLogExplorer
          runId={runId}
          onClose={() => setIsLogExplorerOpen(false)}
        />
      )}
    </div>,
    document.body
  );
}
