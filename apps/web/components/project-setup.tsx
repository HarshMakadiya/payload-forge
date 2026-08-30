'use client';

import { useState } from 'react';
import { apiRequest, type Project } from '../lib/api';

interface ProjectSetupProps {
  readonly projects: readonly Project[];
  readonly selectedProjectId: string;
  readonly onSelect: (projectId: string) => void;
  readonly onCreated: () => Promise<void>;
}

export function ProjectSetup({
  projects,
  selectedProjectId,
  onSelect,
  onCreated,
}: ProjectSetupProps): React.ReactElement {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const createProject = async (): Promise<void> => {
    if (name.trim() === '') return;
    setIsSaving(true);
    try {
      const project = await apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      await onCreated();
      onSelect(project.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card project-card">
      <div>
        <span className="eyebrow">Workspace</span>
        <h2>Project</h2>
      </div>
      <select
        value={selectedProjectId}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">Choose a project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <div className="inline-form">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New project name"
        />
        <button disabled={isSaving} onClick={() => void createProject()}>
          {isSaving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </section>
  );
}
