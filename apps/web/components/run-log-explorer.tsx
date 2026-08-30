'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { apiRequest, type RequestAttempt } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PayloadViewerModal } from './payload-viewer-modal';

interface RunLogExplorerProps {
  readonly runId: string;
  readonly initialAttemptId?: string | null;
  readonly onClose: () => void;
}

export function RunLogExplorer({
  runId,
  onClose,
}: RunLogExplorerProps): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<readonly RequestAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusCode, setStatusCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [minLatencyMs, setMinLatencyMs] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<
    'all' | '2xx' | 'errors' | 'timeouts'
  >('all');
  const [isLoading, setIsLoading] = useState(false);
  const [viewingPayload, setViewingPayload] = useState<{
    attempt: RequestAttempt;
    kind: 'request' | 'response';
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scroll while log inspector is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard shortcut: Escape to close log modal (if no payload modal is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !viewingPayload) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewingPayload]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '50' });
      if (statusCode !== '') query.set('statusCode', statusCode);
      if (keyword.trim() !== '') query.set('keyword', keyword.trim());
      if (minLatencyMs !== '') query.set('minLatencyMs', minLatencyMs);
      const result = await apiRequest<{
        items: RequestAttempt[];
        total: number;
      }>(`/runs/${runId}/logs?${query.toString()}`);
      setItems(result.items);
      setTotal(result.total);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  }, [keyword, minLatencyMs, page, runId, statusCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const handleFilterChip = (
    filter: 'all' | '2xx' | 'errors' | 'timeouts'
  ): void => {
    setActiveFilterTab(filter);
    setPage(1);
    if (filter === 'all') {
      setStatusCode('');
    } else if (filter === '2xx') {
      setStatusCode('200');
    } else if (filter === 'errors') {
      setStatusCode('500');
    } else if (filter === 'timeouts') {
      setStatusCode('408');
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-explorer-heading"
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-surface shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              PERSISTED TELEMETRY INSPECTOR
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <h2
                id="log-explorer-heading"
                className="text-lg font-bold text-foreground"
              >
                Request Attempts{' '}
                <span className="text-sm font-normal text-muted-foreground font-mono">
                  ({total.toLocaleString()} total)
                </span>
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                Run #{runId.slice(0, 8)}
              </Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close log explorer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-border bg-surface/50 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  activeFilterTab === 'all' && statusCode === ''
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
                onClick={() => handleFilterChip('all')}
              >
                All Attempts
              </button>
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  activeFilterTab === '2xx'
                    ? 'bg-success/20 text-success border-success/40'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
                onClick={() => handleFilterChip('2xx')}
              >
                2xx Success
              </button>
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  activeFilterTab === 'errors'
                    ? 'bg-destructive/20 text-destructive border-destructive/40'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
                onClick={() => handleFilterChip('errors')}
              >
                4xx / 5xx Errors
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Status code (e.g. 500)"
                value={statusCode}
                className="w-36 h-8 text-xs bg-card font-mono"
                onChange={(event) => {
                  setPage(1);
                  setActiveFilterTab('all');
                  setStatusCode(event.target.value);
                }}
              />
              <Input
                placeholder="Min latency ms"
                type="number"
                value={minLatencyMs}
                className="w-32 h-8 text-xs bg-card font-mono"
                onChange={(event) => {
                  setPage(1);
                  setMinLatencyMs(event.target.value);
                }}
              />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search request path, query, or error keyword…"
              value={keyword}
              className="pl-8 h-8 text-xs bg-card"
              onChange={(event) => {
                setPage(1);
                setKeyword(event.target.value);
              }}
            />
          </div>
        </div>

        {/* Log Table Container */}
        <div className="flex-1 overflow-auto min-h-[300px]">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead className="sticky top-0 bg-surface border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-3 w-16">Seq</th>
                <th className="py-2.5 px-3 w-14">Try</th>
                <th className="py-2.5 px-3 w-20">Status</th>
                <th className="py-2.5 px-3 font-sans font-medium">
                  Request URL
                </th>
                <th className="py-2.5 px-3 w-24">Latency</th>
                <th className="py-2.5 px-3 w-36">Error Type</th>
                <th className="py-2.5 px-3 w-28 text-center">Bodies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="pulse-indicator bg-primary" />
                        <span>Loading request telemetry…</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>No request attempts match the filter criteria.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStatusCode('');
                            setKeyword('');
                            setMinLatencyMs('');
                            setActiveFilterTab('all');
                          }}
                          className="text-xs"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((attempt) => {
                  const hasReq = attempt.requestBodyRef !== null;
                  const hasRes = attempt.responseBodyRef !== null;
                  const isErr =
                    (attempt.statusCode && attempt.statusCode >= 400) ||
                    attempt.error;

                  return (
                    <tr
                      key={attempt.id}
                      className={`hover:bg-secondary/40 transition-colors ${
                        isErr ? 'bg-destructive/5' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-muted-foreground">
                        #{attempt.logicalRequestSequence}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        #{attempt.attemptNumber}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            attempt.statusCode && attempt.statusCode < 400
                              ? 'success'
                              : 'destructive'
                          }
                          className="text-[10px] font-bold"
                        >
                          {attempt.statusCode ? `${attempt.statusCode}` : 'ERR'}
                        </Badge>
                      </td>
                      <td
                        className="py-2 px-3 max-w-[320px] truncate"
                        title={attempt.requestUrl}
                      >
                        <span className="font-bold text-primary mr-1">
                          {attempt.requestMethod}
                        </span>
                        <span className="text-foreground">
                          {attempt.requestUrl}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-foreground">
                        {attempt.latencyMs} ms
                      </td>
                      <td className="py-2 px-3 text-destructive truncate max-w-[140px]">
                        {attempt.errorType ?? attempt.error ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant={hasReq ? 'secondary' : 'outline'}
                            size="sm"
                            disabled={!hasReq}
                            onClick={() =>
                              setViewingPayload({ attempt, kind: 'request' })
                            }
                            className="h-6 px-1.5 text-[10px]"
                            title={
                              hasReq
                                ? 'Inspect Request Payload'
                                : 'No request payload'
                            }
                          >
                            Req
                          </Button>
                          <Button
                            variant={hasRes ? 'secondary' : 'outline'}
                            size="sm"
                            disabled={!hasRes}
                            onClick={() =>
                              setViewingPayload({ attempt, kind: 'response' })
                            }
                            className="h-6 px-1.5 text-[10px]"
                            title={
                              hasRes
                                ? 'Inspect Response Body'
                                : 'No response body'
                            }
                          >
                            Res
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-border bg-surface shrink-0">
          <div className="text-xs text-muted-foreground font-mono">
            Showing{' '}
            <strong className="text-foreground">
              {items.length > 0 ? (page - 1) * 50 + 1 : 0}
            </strong>{' '}
            –{' '}
            <strong className="text-foreground">
              {Math.min(page * 50, total)}
            </strong>{' '}
            of{' '}
            <strong className="text-foreground">
              {total.toLocaleString()}
            </strong>{' '}
            logs
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(page - 1)}
              className="text-xs h-8"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground font-mono px-1">
              Page {page} of {Math.max(1, Math.ceil(total / 50))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 50 >= total || isLoading}
              onClick={() => setPage(page + 1)}
              className="text-xs h-8"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Close Inspector
          </Button>
        </div>
      </div>

      {/* Dedicated Payload Request/Response Modal */}
      {viewingPayload !== null && (
        <PayloadViewerModal
          runId={runId}
          attempt={viewingPayload.attempt}
          initialKind={viewingPayload.kind}
          onClose={() => setViewingPayload(null)}
        />
      )}
    </div>,
    document.body
  );
}
