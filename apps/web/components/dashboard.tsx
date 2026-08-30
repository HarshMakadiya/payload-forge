'use client';

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import {
  apiRequest,
  API_ORIGIN,
  type Endpoint,
  type Environment,
  type Project,
  type TestRun,
} from '../lib/api';
import { FirstRunGuide } from './first-run-guide';
import { PayloadLab } from './payload-lab';
import { ProjectSetup } from './project-setup';
import { RunPanel } from './run-panel';
import { TargetSetup } from './target-setup';
import { Button } from './ui/button';

export function Dashboard(): React.ReactElement {
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [environments, setEnvironments] = useState<readonly Environment[]>([]);
  const [endpoints, setEndpoints] = useState<readonly Endpoint[]>([]);
  const [runs, setRuns] = useState<readonly TestRun[]>([]);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async (): Promise<void> => {
    try {
      setProjects(await apiRequest<Project[]>('/projects'));
      setError('');
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load projects'
      );
    }
  }, []);

  const loadProjectData = useCallback(async (): Promise<void> => {
    if (selectedProjectId === '') {
      setEnvironments([]);
      setEndpoints([]);
      setRuns([]);
      return;
    }
    try {
      const [nextEnvironments, nextEndpoints, nextRuns] = await Promise.all([
        apiRequest<Environment[]>(
          `/projects/${selectedProjectId}/environments`
        ),
        apiRequest<Endpoint[]>(`/projects/${selectedProjectId}/endpoints`),
        apiRequest<TestRun[]>(`/projects/${selectedProjectId}/runs`),
      ]);
      setEnvironments(nextEnvironments);
      setEndpoints(nextEndpoints);
      setRuns(nextRuns);
      setError('');
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load project'
      );
    }
  }, [selectedProjectId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadProjectData();
    if (selectedProjectId === '') return;
    const socket = io(API_ORIGIN, { transports: ['websocket'] });
    socket.on('run-progress', () => void loadProjectData());
    const fallbackInterval = window.setInterval(
      () => void loadProjectData(),
      15_000
    );
    return () => {
      socket.close();
      window.clearInterval(fallbackInterval);
    };
  }, [loadProjectData, selectedProjectId]);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      {/* Hero Header without Local Stack online tag */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-8 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg bg-surface border border-border flex items-center justify-center font-mono font-bold text-primary text-base shadow-sm shrink-0">
            PF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payload Forge
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Load testing with signal, not noise.
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Shape realistic payloads, control traffic precisely, and inspect
              every Request Attempt.
            </p>
          </div>
        </div>
      </header>

      {/* Global Error Banner */}
      {error !== '' && (
        <div
          className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-foreground flex items-center justify-between gap-4 animate-fade-in"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 hover:bg-destructive/20 text-xs"
              onClick={() => {
                if (selectedProjectId !== '') {
                  void loadProjectData();
                } else {
                  void loadProjects();
                }
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry Connection
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="space-y-6">
        {projects.length === 0 && <FirstRunGuide />}

        <ProjectSetup
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
          onChanged={loadProjects}
        />

        {selectedProjectId !== '' && (
          <div className="space-y-6">
            <TargetSetup
              projectId={selectedProjectId}
              environments={environments}
              endpoints={endpoints}
              onChanged={loadProjectData}
            />
            <RunPanel
              projectId={selectedProjectId}
              environments={environments}
              endpoints={endpoints}
              runs={runs}
              onChanged={loadProjectData}
            />
            <PayloadLab projectId={selectedProjectId} endpoints={endpoints} />
          </div>
        )}
      </div>
    </main>
  );
}
