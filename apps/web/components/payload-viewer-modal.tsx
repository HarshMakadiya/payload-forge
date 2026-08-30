'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, FileText, Layers, X } from 'lucide-react';
import { apiRequest, type RequestAttempt } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface PayloadViewerModalProps {
  readonly runId: string;
  readonly attempt: RequestAttempt;
  readonly initialKind?: 'request' | 'response';
  readonly onClose: () => void;
}

export function PayloadViewerModal({
  runId,
  attempt,
  initialKind = 'request',
  onClose,
}: PayloadViewerModalProps): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>(
    initialKind
  );
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

  const loadBody = useCallback(
    async (kind: 'request' | 'response'): Promise<void> => {
      const ref =
        kind === 'request' ? attempt.requestBodyRef : attempt.responseBodyRef;
      if (!ref) {
        setContent(null);
        setLoadError('');
        return;
      }

      setIsLoading(true);
      setLoadError('');
      try {
        const result = await apiRequest<{ content: string | null }>(
          `/runs/${runId}/logs/${attempt.id}/${kind}/body`
        );
        setContent(result.content);
      } catch (err: unknown) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load payload body'
        );
        setContent(null);
      } finally {
        setIsLoading(false);
      }
    },
    [attempt.id, attempt.requestBodyRef, attempt.responseBodyRef, runId]
  );

  useEffect(() => {
    void loadBody(activeTab);
  }, [activeTab, loadBody]);

  const copyToClipboard = async (): Promise<void> => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  const formatJson = (raw: string | null): string => {
    if (!raw) return '// No body captured for this ' + activeTab;
    try {
      const parsed: unknown = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  const activeHeaders =
    activeTab === 'request'
      ? attempt.requestHeaders
      : (attempt.responseHeaders ?? {});

  const hasActiveBody =
    activeTab === 'request'
      ? attempt.requestBodyRef !== null
      : attempt.responseBodyRef !== null;

  const lineCount = content ? content.split('\n').length : 0;
  const byteSize = content ? new Blob([content]).size : 0;
  const formattedSize =
    byteSize > 1024 ? `${(byteSize / 1024).toFixed(1)} KB` : `${byteSize} B`;

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payload-modal-title"
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-surface shrink-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px]">
                ATTEMPT #{attempt.logicalRequestSequence}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                TRY #{attempt.attemptNumber}
              </Badge>
              <Badge
                variant={
                  attempt.statusCode && attempt.statusCode < 400
                    ? 'success'
                    : 'destructive'
                }
                className="text-[10px] font-bold"
              >
                {attempt.statusCode
                  ? `${attempt.statusCode}`
                  : (attempt.errorType ?? 'ERR')}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {attempt.latencyMs} ms
              </span>
              {content && (
                <span className="text-xs font-mono text-muted-foreground">
                  · {lineCount} lines ({formattedSize})
                </span>
              )}
            </div>

            <h3
              id="payload-modal-title"
              className="text-sm font-mono font-bold text-foreground"
            >
              <span className="text-primary mr-1">{attempt.requestMethod}</span>
              <span className="text-foreground">{attempt.requestUrl}</span>
            </h3>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close payload modal"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab & Utility Bar */}
        <div className="flex items-center justify-between p-3 px-5 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'request'
                  ? 'bg-card text-foreground border border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('request')}
            >
              Request Body {attempt.requestBodyRef ? '●' : '(none)'}
            </button>
            <button
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'response'
                  ? 'bg-card text-foreground border border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('response')}
            >
              Response Body {attempt.responseBodyRef ? '●' : '(none)'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {Object.keys(activeHeaders).length > 0 && (
              <Button
                variant={showHeaders ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowHeaders(!showHeaders)}
                className="text-xs h-7"
              >
                <Layers className="h-3 w-3 mr-1" />
                {showHeaders ? 'Hide Headers' : 'Inspect Headers'} (
                {Object.keys(activeHeaders).length})
              </Button>
            )}
            {content && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyToClipboard()}
                className="text-xs h-7"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-success" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" /> Copy JSON
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Optional Headers Drawer */}
        {showHeaders && Object.keys(activeHeaders).length > 0 && (
          <div className="p-4 bg-secondary/50 border-b border-border font-mono text-xs space-y-1.5 max-h-40 overflow-auto shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              {activeTab === 'request'
                ? 'HTTP Request Headers'
                : 'HTTP Response Headers'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Object.entries(activeHeaders).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-primary font-semibold">{key}:</span>
                  <span className="text-foreground truncate">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Content Viewport */}
        <div className="flex-1 p-4 overflow-auto min-h-[250px] bg-background">
          {isLoading ? (
            <div className="h-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="pulse-indicator bg-primary" />
              <span>Fetching {activeTab} body from payload storage…</span>
            </div>
          ) : loadError ? (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              ⚠️ {loadError}
            </div>
          ) : !hasActiveBody ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-1">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-1" />
              <p className="text-xs">
                No {activeTab} body was captured for this attempt.
              </p>
            </div>
          ) : (
            <pre className="text-xs font-mono text-foreground leading-relaxed">
              <code>{formatJson(content)}</code>
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {attempt.bodyTruncated && (
              <Badge variant="warning" className="text-[10px]">
                ⚠️ Body truncated to 32KB storage limit
              </Badge>
            )}
            {attempt.error && (
              <Badge variant="destructive" className="text-[10px]">
                {attempt.error}
              </Badge>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Done (Esc)
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
