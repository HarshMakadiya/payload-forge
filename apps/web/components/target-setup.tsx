'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Globe,
  Network,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { apiRequest, type Endpoint, type Environment } from '../lib/api';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Input } from './ui/input';

interface TargetSetupProps {
  readonly projectId: string;
  readonly environments: readonly Environment[];
  readonly endpoints: readonly Endpoint[];
  readonly onChanged: () => Promise<void>;
}

export function TargetSetup({
  projectId,
  environments,
  endpoints,
  onChanged,
}: TargetSetupProps): React.ReactElement {
  const [baseUrl, setBaseUrl] = useState('https://httpbin.org');
  const [environmentName, setEnvironmentName] = useState('Development');
  const [isProduction, setIsProduction] = useState(false);
  const [endpointName, setEndpointName] = useState('Create payload');
  const [method, setMethod] = useState('POST');
  const [path, setPath] = useState('/anything');
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [envError, setEnvError] = useState('');
  const [endpointError, setEndpointError] = useState('');
  const [editingEnvironmentId, setEditingEnvironmentId] = useState('');
  const [editingEndpointId, setEditingEndpointId] = useState('');
  const [editEnvironmentName, setEditEnvironmentName] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editIsProduction, setEditIsProduction] = useState(false);
  const [editEndpointName, setEditEndpointName] = useState('');
  const [editMethod, setEditMethod] = useState('POST');
  const [editPath, setEditPath] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<
    | { readonly kind: 'environment' | 'endpoint'; readonly id: string }
    | undefined
  >();
  const [pendingDelete, setPendingDelete] = useState<
    | {
        readonly kind: 'environment' | 'endpoint';
        readonly id: string;
        readonly name: string;
      }
    | undefined
  >();
  const [manageError, setManageError] = useState('');

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const createEnvironment = async (): Promise<void> => {
    setEnvError('');
    const trimmedName = environmentName.trim();
    const trimmedUrl = baseUrl.trim();

    if (trimmedName === '') {
      setEnvError('Environment name is required');
      return;
    }
    if (!validateUrl(trimmedUrl)) {
      setEnvError(
        'Base URL must be a valid HTTP or HTTPS address (e.g. https://api.example.com)'
      );
      return;
    }

    setIsSavingEnv(true);
    try {
      await apiRequest('/environments', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          name: trimmedName,
          baseUrl: trimmedUrl,
          isProduction,
        }),
      });
      await onChanged();
    } catch (caught: unknown) {
      setEnvError(
        caught instanceof Error ? caught.message : 'Failed to save environment'
      );
    } finally {
      setIsSavingEnv(false);
    }
  };

  const createEndpoint = async (): Promise<void> => {
    setEndpointError('');
    const trimmedName = endpointName.trim();
    let trimmedPath = path.trim();

    if (trimmedName === '') {
      setEndpointError('Endpoint name is required');
      return;
    }
    if (trimmedPath === '') {
      setEndpointError('Endpoint path is required');
      return;
    }
    if (!trimmedPath.startsWith('/')) {
      trimmedPath = `/${trimmedPath}`;
    }

    setIsSavingEndpoint(true);
    try {
      await apiRequest('/endpoints', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          name: trimmedName,
          method,
          path: trimmedPath,
          payloadSample: { name: 'Sample User', email: 'sample@example.test' },
        }),
      });
      await onChanged();
    } catch (caught: unknown) {
      setEndpointError(
        caught instanceof Error ? caught.message : 'Failed to save endpoint'
      );
    } finally {
      setIsSavingEndpoint(false);
    }
  };

  const beginEnvironmentEdit = (environment: Environment): void => {
    setEditingEnvironmentId(environment.id);
    setEditingEndpointId('');
    setPendingDelete(undefined);
    setManageError('');
    setEditEnvironmentName(environment.name);
    setEditBaseUrl(environment.baseUrl);
    setEditIsProduction(environment.kind === 'PRODUCTION');
  };

  const beginEndpointEdit = (endpoint: Endpoint): void => {
    setEditingEndpointId(endpoint.id);
    setEditingEnvironmentId('');
    setPendingDelete(undefined);
    setManageError('');
    setEditEndpointName(endpoint.name);
    setEditMethod(endpoint.method);
    setEditPath(endpoint.path);
  };

  const updateEnvironment = async (environmentId: string): Promise<void> => {
    const trimmedName = editEnvironmentName.trim();
    const trimmedUrl = editBaseUrl.trim();
    if (trimmedName === '' || !validateUrl(trimmedUrl)) {
      setManageError(
        'Enter an environment name and a valid HTTP or HTTPS URL.'
      );
      return;
    }
    setManageError('');
    setIsUpdating(true);
    try {
      await apiRequest<Environment>(`/environments/${environmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          baseUrl: trimmedUrl,
          isProduction: editIsProduction,
        }),
      });
      await onChanged();
      setEditingEnvironmentId('');
    } catch (caught: unknown) {
      setManageError(
        caught instanceof Error
          ? caught.message
          : 'Failed to update environment'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const updateEndpoint = async (endpointId: string): Promise<void> => {
    const trimmedName = editEndpointName.trim();
    let trimmedPath = editPath.trim();
    if (trimmedName === '' || trimmedPath === '') {
      setManageError('Enter an endpoint name and path.');
      return;
    }
    if (!trimmedPath.startsWith('/')) trimmedPath = `/${trimmedPath}`;
    setManageError('');
    setIsUpdating(true);
    try {
      await apiRequest<Endpoint>(`/endpoints/${endpointId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          method: editMethod,
          path: trimmedPath,
        }),
      });
      await onChanged();
      setEditingEndpointId('');
    } catch (caught: unknown) {
      setManageError(
        caught instanceof Error ? caught.message : 'Failed to update endpoint'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTarget = async (): Promise<void> => {
    if (pendingDelete === undefined) return;
    const target = pendingDelete;
    setManageError('');
    setDeletingTarget({ kind: target.kind, id: target.id });
    try {
      await apiRequest(
        `/${target.kind === 'environment' ? 'environments' : 'endpoints'}/${target.id}`,
        { method: 'DELETE' }
      );
      await onChanged();
      setPendingDelete(undefined);
    } catch (caught: unknown) {
      setManageError(
        caught instanceof Error
          ? caught.message
          : `Failed to delete ${target.kind}`
      );
    } finally {
      setDeletingTarget(undefined);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Target Configuration
        </span>
        <CardTitle className="text-xl font-bold flex items-center gap-2 mt-0.5">
          <Network className="h-5 w-5 text-muted-foreground" />
          Environments & Endpoints
        </CardTitle>
        <CardDescription>
          Declare valid destinations, hosts, and HTTP endpoints for this
          project.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Environment Column */}
          <div className="flex flex-col justify-between p-5 rounded-lg bg-surface border border-border space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Add Environment
                </h3>
              </div>

              {envError !== '' && (
                <div className="flex items-center justify-between p-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span>{envError}</span>
                  </div>
                  <button
                    onClick={() => setEnvError('')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Environment Name
                </label>
                <Input
                  value={environmentName}
                  onChange={(event) => {
                    setEnvironmentName(event.target.value);
                    if (envError) setEnvError('');
                  }}
                  placeholder="e.g. Staging VPC"
                  className="bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Base URL
                </label>
                <Input
                  value={baseUrl}
                  onChange={(event) => {
                    setBaseUrl(event.target.value);
                    if (envError) setEnvError('');
                  }}
                  placeholder="https://api.example.com"
                  className="bg-card"
                />
              </div>

              <label className="flex items-center gap-2.5 pt-1 text-xs text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isProduction}
                  onChange={(event) => setIsProduction(event.target.checked)}
                  className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary accent-primary"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-warning" />
                  Guarded Production Target
                </span>
              </label>
            </div>

            <Button
              variant="secondary"
              disabled={
                isSavingEnv ||
                environmentName.trim() === '' ||
                baseUrl.trim() === ''
              }
              onClick={() => void createEnvironment()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {isSavingEnv ? 'Saving…' : 'Save Environment'}
            </Button>
          </div>

          {/* Endpoint Column */}
          <div className="flex flex-col justify-between p-5 rounded-lg bg-surface border border-border space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Network className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Add Endpoint
                </h3>
              </div>

              {endpointError !== '' && (
                <div className="flex items-center justify-between p-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span>{endpointError}</span>
                  </div>
                  <button
                    onClick={() => setEndpointError('')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Endpoint Name
                </label>
                <Input
                  value={endpointName}
                  onChange={(event) => {
                    setEndpointName(event.target.value);
                    if (endpointError) setEndpointError('');
                  }}
                  placeholder="e.g. Create Order"
                  className="bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Method & Path
                </label>
                <div className="flex gap-2">
                  <select
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    className="flex h-9 w-[100px] rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-mono font-bold text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                  <Input
                    value={path}
                    onChange={(event) => {
                      setPath(event.target.value);
                      if (endpointError) setEndpointError('');
                    }}
                    placeholder="/v1/orders"
                    className="font-mono bg-card"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              disabled={
                isSavingEndpoint ||
                endpointName.trim() === '' ||
                path.trim() === ''
              }
              onClick={() => void createEndpoint()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {isSavingEndpoint ? 'Saving…' : 'Save Endpoint'}
            </Button>
          </div>
        </div>

        <section
          aria-labelledby="saved-targets-heading"
          className="mt-6 border-t border-border pt-5"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3
              id="saved-targets-heading"
              className="text-sm font-semibold text-foreground"
            >
              Saved targets
            </h3>
            <p className="text-xs text-muted-foreground">
              Edit a destination before a Test Run; remove only unused targets.
            </p>
          </div>

          {manageError !== '' && (
            <div
              className="mt-4 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground"
              role="alert"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                {manageError}
              </span>
              <button
                type="button"
                aria-label="Dismiss target management error"
                onClick={() => setManageError('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="saved-environments-heading">
              <div className="mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h4
                  id="saved-environments-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Environments ({environments.length})
                </h4>
              </div>

              {environments.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  No environments saved yet.
                </p>
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                  {environments.map((environment) => {
                    const isEditing = editingEnvironmentId === environment.id;
                    const isConfirmingDelete =
                      pendingDelete?.kind === 'environment' &&
                      pendingDelete.id === environment.id;
                    const isDeleting =
                      deletingTarget?.kind === 'environment' &&
                      deletingTarget.id === environment.id;

                    return (
                      <article key={environment.id} className="p-3">
                        {isEditing ? (
                          <form
                            className="space-y-3"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void updateEnvironment(environment.id);
                            }}
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                                Name
                                <Input
                                  value={editEnvironmentName}
                                  onChange={(event) =>
                                    setEditEnvironmentName(event.target.value)
                                  }
                                  className="bg-card text-sm"
                                />
                              </label>
                              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                                Base URL
                                <Input
                                  value={editBaseUrl}
                                  onChange={(event) =>
                                    setEditBaseUrl(event.target.value)
                                  }
                                  className="bg-card text-sm"
                                />
                              </label>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                                <input
                                  type="checkbox"
                                  checked={editIsProduction}
                                  onChange={(event) =>
                                    setEditIsProduction(event.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary accent-primary"
                                />
                                Guarded Production Target
                              </label>
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={isUpdating}
                                >
                                  <Check className="mr-1.5 h-3.5 w-3.5" />
                                  {isUpdating ? 'Saving…' : 'Save'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating}
                                  onClick={() => setEditingEnvironmentId('')}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-sm font-semibold text-foreground">
                                  {environment.name}
                                </h5>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                    environment.kind === 'PRODUCTION'
                                      ? 'border-warning/30 bg-warning/10 text-warning'
                                      : 'border-border bg-card text-muted-foreground'
                                  }`}
                                >
                                  {environment.kind.toLowerCase()}
                                </span>
                              </div>
                              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                {environment.baseUrl}
                              </p>
                            </div>
                            {!isConfirmingDelete && (
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    beginEnvironmentEdit(environment)
                                  }
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setManageError('');
                                    setEditingEnvironmentId('');
                                    setPendingDelete({
                                      kind: 'environment',
                                      id: environment.id,
                                      name: environment.name,
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />{' '}
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {isConfirmingDelete && (
                          <div className="mt-3 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-foreground">
                              Delete <strong>{environment.name}</strong>?
                              Targets used by a Test Run are retained for
                              traceability.
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isDeleting}
                                onClick={() => setPendingDelete(undefined)}
                              >
                                Keep
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isDeleting}
                                onClick={() => void deleteTarget()}
                              >
                                {isDeleting
                                  ? 'Deleting…'
                                  : 'Delete environment'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section aria-labelledby="saved-endpoints-heading">
              <div className="mb-2 flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <h4
                  id="saved-endpoints-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Endpoints ({endpoints.length})
                </h4>
              </div>

              {endpoints.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  No endpoints saved yet.
                </p>
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                  {endpoints.map((endpoint) => {
                    const isEditing = editingEndpointId === endpoint.id;
                    const isConfirmingDelete =
                      pendingDelete?.kind === 'endpoint' &&
                      pendingDelete.id === endpoint.id;
                    const isDeleting =
                      deletingTarget?.kind === 'endpoint' &&
                      deletingTarget.id === endpoint.id;

                    return (
                      <article key={endpoint.id} className="p-3">
                        {isEditing ? (
                          <form
                            className="space-y-3"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void updateEndpoint(endpoint.id);
                            }}
                          >
                            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                              Name
                              <Input
                                value={editEndpointName}
                                onChange={(event) =>
                                  setEditEndpointName(event.target.value)
                                }
                                className="bg-card text-sm"
                              />
                            </label>
                            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                              Method & path
                              <div className="flex gap-2">
                                <select
                                  value={editMethod}
                                  onChange={(event) =>
                                    setEditMethod(event.target.value)
                                  }
                                  className="flex h-9 w-[100px] shrink-0 cursor-pointer rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs font-bold text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option>GET</option>
                                  <option>POST</option>
                                  <option>PUT</option>
                                  <option>PATCH</option>
                                  <option>DELETE</option>
                                </select>
                                <Input
                                  value={editPath}
                                  onChange={(event) =>
                                    setEditPath(event.target.value)
                                  }
                                  className="bg-card font-mono text-sm"
                                />
                              </div>
                            </label>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isUpdating}
                              >
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                {isUpdating ? 'Saving…' : 'Save'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUpdating}
                                onClick={() => setEditingEndpointId('')}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h5 className="text-sm font-semibold text-foreground">
                                {endpoint.name}
                              </h5>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                <span className="font-bold text-primary">
                                  {endpoint.method}
                                </span>{' '}
                                {endpoint.path}
                              </p>
                            </div>
                            {!isConfirmingDelete && (
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => beginEndpointEdit(endpoint)}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setManageError('');
                                    setEditingEndpointId('');
                                    setPendingDelete({
                                      kind: 'endpoint',
                                      id: endpoint.id,
                                      name: endpoint.name,
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />{' '}
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {isConfirmingDelete && (
                          <div className="mt-3 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-foreground">
                              Delete <strong>{endpoint.name}</strong>? Targets
                              used by a Test Run are retained for traceability.
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isDeleting}
                                onClick={() => setPendingDelete(undefined)}
                              >
                                Keep
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isDeleting}
                                onClick={() => void deleteTarget()}
                              >
                                {isDeleting ? 'Deleting…' : 'Delete endpoint'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
