'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Globe,
  Network,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
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
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [envError, setEnvError] = useState('');
  const [endpointError, setEndpointError] = useState('');

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
      </CardContent>
    </Card>
  );
}
