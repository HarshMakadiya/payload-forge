'use client';

import { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode2,
  FileUp,
  Loader2,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

const MAX_SPEC_SIZE = 2_000_000;

interface OpenApiOperationPreview {
  readonly operationKey: string;
  readonly name: string;
  readonly method: string;
  readonly path: string;
  readonly duplicate: boolean;
  readonly hasRequestBody: boolean;
}

interface OpenApiPreview {
  readonly title: string;
  readonly version: string;
  readonly ignoredMethodCount: number;
  readonly operations: readonly OpenApiOperationPreview[];
}

interface OpenApiImportResult {
  readonly importedCount: number;
  readonly skippedCount: number;
}

interface OpenApiImportProps {
  readonly projectId: string;
  readonly onChanged: () => Promise<void>;
}

export function OpenApiImport({
  projectId,
  onChanged,
}: OpenApiImportProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [spec, setSpec] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<OpenApiPreview>();
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    new Set()
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetPreview = (): void => {
    setPreview(undefined);
    setSelectedKeys(new Set());
    setSuccess('');
  };

  const updateSource = (nextSpec: string, nextFileName = ''): void => {
    setSpec(nextSpec);
    setFileName(nextFileName);
    setError('');
    resetPreview();
  };

  const loadFile = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return;
    if (file.size > MAX_SPEC_SIZE) {
      setError('Choose an OpenAPI file smaller than 2 MB.');
      return;
    }

    try {
      updateSource(await file.text(), file.name);
    } catch {
      setError('The selected file could not be read. Try another file.');
    } finally {
      if (fileInputRef.current !== null) fileInputRef.current.value = '';
    }
  };

  const previewSpec = async (): Promise<void> => {
    if (spec.trim() === '') {
      setError('Paste an OpenAPI document or choose a JSON/YAML file first.');
      return;
    }

    setError('');
    setSuccess('');
    setIsPreviewing(true);
    try {
      const nextPreview = await apiRequest<OpenApiPreview>(
        `/projects/${projectId}/endpoints/import/preview`,
        {
          method: 'POST',
          body: JSON.stringify({ spec }),
        }
      );
      setPreview(nextPreview);
      setSelectedKeys(
        new Set(
          nextPreview.operations
            .filter((operation) => !operation.duplicate)
            .map((operation) => operation.operationKey)
        )
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The OpenAPI document could not be previewed.'
      );
      setPreview(undefined);
    } finally {
      setIsPreviewing(false);
    }
  };

  const toggleOperation = (operationKey: string): void => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(operationKey)) next.delete(operationKey);
      else next.add(operationKey);
      return next;
    });
  };

  const importSelected = async (): Promise<void> => {
    if (selectedKeys.size === 0) {
      setError('Select at least one new operation to import.');
      return;
    }

    setError('');
    setSuccess('');
    setIsImporting(true);
    try {
      const result = await apiRequest<OpenApiImportResult>(
        `/projects/${projectId}/endpoints/import`,
        {
          method: 'POST',
          body: JSON.stringify({
            spec,
            operationKeys: Array.from(selectedKeys),
          }),
        }
      );
      await onChanged();
      setSuccess(
        `${result.importedCount} Endpoint${result.importedCount === 1 ? '' : 's'} imported.`
      );
      setPreview(undefined);
      setSelectedKeys(new Set());
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The selected Endpoints could not be imported.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const importableOperations =
    preview?.operations.filter((operation) => !operation.duplicate) ?? [];
  const duplicateCount =
    preview?.operations.filter((operation) => operation.duplicate).length ?? 0;

  return (
    <section
      aria-labelledby="openapi-import-heading"
      className="mt-6 border-t border-border pt-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="openapi-import-heading"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
            Import OpenAPI
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Turn OpenAPI 3.x operations into Endpoints. Existing method and path
            pairs are skipped.
          </p>
        </div>
        <Button
          type="button"
          variant={isExpanded ? 'outline' : 'default'}
          size="sm"
          aria-expanded={isExpanded}
          aria-controls="openapi-import-workspace"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? (
            <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isExpanded ? 'Close importer' : 'Import specification'}
        </Button>
      </div>

      {isExpanded && (
        <div
          id="openapi-import-workspace"
          className="mt-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
        >
          <label
            htmlFor="openapi-source"
            className="text-xs font-medium text-muted-foreground"
          >
            OpenAPI JSON or YAML
          </label>
          <Textarea
            id="openapi-source"
            value={spec}
            rows={9}
            spellCheck={false}
            placeholder={
              'openapi: 3.0.3\ninfo:\n  title: My API\npaths:\n  /orders:\n    get: ...'
            }
            className="mt-1.5 resize-y bg-card font-mono text-xs leading-relaxed"
            onChange={(event) => updateSource(event.target.value)}
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                className="sr-only"
                onChange={(event) =>
                  void loadFile(event.currentTarget.files?.[0])
                }
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="mr-1.5 h-3.5 w-3.5" /> Choose file
              </Button>
              <span className="truncate text-xs text-muted-foreground">
                {fileName || 'JSON, YAML, or YML · up to 2 MB'}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPreviewing || spec.trim() === ''}
              onClick={() => void previewSpec()}
            >
              {isPreviewing && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              {isPreviewing ? 'Reading…' : 'Preview operations'}
            </Button>
          </div>

          {error !== '' && (
            <div
              className="mt-4 flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground"
              role="alert"
            >
              <span className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                {error}
              </span>
              <button
                type="button"
                aria-label="Dismiss OpenAPI import error"
                onClick={() => setError('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {success !== '' && (
            <div
              className="mt-4 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-foreground"
              role="status"
            >
              <Check className="h-4 w-4 shrink-0 text-success" />
              {success}
            </div>
          )}

          {preview !== undefined && (
            <div className="mt-5 border-t border-border pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {preview.title}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    OpenAPI {preview.version} · {importableOperations.length}{' '}
                    ready · {duplicateCount} already saved
                    {preview.ignoredMethodCount > 0
                      ? ` · ${preview.ignoredMethodCount} unsupported method${preview.ignoredMethodCount === 1 ? '' : 's'} ignored`
                      : ''}
                  </p>
                </div>
                {importableOperations.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setSelectedKeys(
                          new Set(
                            importableOperations.map(
                              (operation) => operation.operationKey
                            )
                          )
                        )
                      }
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedKeys(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
                {preview.operations.map((operation) => (
                  <label
                    key={operation.operationKey}
                    className={`flex items-start gap-3 px-3 py-3 ${
                      operation.duplicate
                        ? 'cursor-not-allowed opacity-55'
                        : 'cursor-pointer hover:bg-secondary/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(operation.operationKey)}
                      disabled={operation.duplicate}
                      onChange={() => toggleOperation(operation.operationKey)}
                      className="mt-0.5 h-4 w-4 rounded border-border bg-surface accent-primary focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {operation.name}
                      </span>
                      <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                        <strong className="text-primary">
                          {operation.method}
                        </strong>{' '}
                        {operation.path}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                      {operation.duplicate
                        ? 'Already saved'
                        : operation.hasRequestBody
                          ? 'Schema included'
                          : 'No body schema'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {selectedKeys.size} of {importableOperations.length} new
                  operations selected
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isImporting || selectedKeys.size === 0}
                  onClick={() => void importSelected()}
                >
                  {isImporting && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  {isImporting
                    ? 'Importing…'
                    : `Import ${selectedKeys.size} Endpoint${selectedKeys.size === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
