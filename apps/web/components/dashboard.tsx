'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiRequest,
  type Endpoint,
  type Environment,
  type Project,
  type TestRun,
} from '../lib/api';
import { PayloadLab } from './payload-lab';
import { ProjectSetup } from './project-setup';
import { RunPanel } from './run-panel';
import { TargetSetup } from './target-setup';

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
    const interval = window.setInterval(() => void loadProjectData(), 2_000);
    return () => window.clearInterval(interval);
  }, [loadProjectData, selectedProjectId]);

  return (
    <main>
      <header className="hero">
        <div className="brand-mark">PF</div>
        <div>
          <span className="eyebrow">Payload Forge</span>
          <h1>Load testing with signal, not noise.</h1>
          <p>
            Shape realistic payloads, control traffic precisely, inspect every
            Request Attempt.
          </p>
        </div>
        <div className="system-state">
          <span className="pulse" /> Local stack
        </div>
      </header>

      {error !== '' && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid">
        <ProjectSetup
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
          onCreated={loadProjects}
        />
        {selectedProjectId !== '' && (
          <>
            <TargetSetup
              projectId={selectedProjectId}
              onChanged={loadProjectData}
            />
            <RunPanel
              projectId={selectedProjectId}
              environments={environments}
              endpoints={endpoints}
              runs={runs}
              onChanged={loadProjectData}
            />
            <PayloadLab />
          </>
        )}
      </div>
    </main>
  );
}
