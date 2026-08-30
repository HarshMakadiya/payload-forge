'use client';

import { useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { apiRequest, type Project } from '../lib/api';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Input } from './ui/input';

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
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </span>
          <CardTitle className="text-xl font-bold flex items-center gap-2 mt-0.5">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            Project Scope
          </CardTitle>
          <CardDescription>
            Select a project or create a new target workload.
          </CardDescription>
        </div>

        {projects.length > 0 && (
          <div className="min-w-[240px]">
            <select
              value={selectedProjectId}
              onChange={(event) => onSelect(event.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="">Choose an active project…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <form
          className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2 border-t border-border"
          onSubmit={(event) => {
            event.preventDefault();
            void createProject();
          }}
        >
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="project-name"
              className="text-xs font-medium text-muted-foreground"
            >
              {projects.length === 0
                ? 'Name the API or workload you are testing'
                : 'Create another project'}
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Checkout Service API"
              className="bg-surface"
            />
          </div>
          <Button
            type="submit"
            disabled={isSaving || name.trim() === ''}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Creating…' : 'Create Project'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
