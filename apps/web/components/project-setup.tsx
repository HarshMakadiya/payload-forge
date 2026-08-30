'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Check,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
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
  readonly onChanged: () => Promise<void>;
}

export function ProjectSetup({
  projects,
  selectedProjectId,
  onSelect,
  onChanged,
}: ProjectSetupProps): React.ReactElement {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [manageError, setManageError] = useState('');

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  );

  const createProject = async (): Promise<void> => {
    if (name.trim() === '') return;
    setIsSaving(true);
    try {
      const project = await apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      await onChanged();
      onSelect(project.id);
    } finally {
      setIsSaving(false);
    }
  };

  const beginEdit = (): void => {
    if (selectedProject === undefined) return;
    setEditName(selectedProject.name);
    setEditDescription(selectedProject.description ?? '');
    setManageError('');
    setConfirmDelete(false);
    setIsEditing(true);
  };

  const updateProject = async (): Promise<void> => {
    if (selectedProject === undefined || editName.trim() === '') return;
    setManageError('');
    setIsUpdating(true);
    try {
      await apiRequest<Project>(`/projects/${selectedProject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          description:
            editDescription.trim() === '' ? null : editDescription.trim(),
        }),
      });
      await onChanged();
      setIsEditing(false);
    } catch (caught: unknown) {
      setManageError(
        caught instanceof Error ? caught.message : 'Failed to update project'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteProject = async (): Promise<void> => {
    if (selectedProject === undefined) return;
    setManageError('');
    setIsDeleting(true);
    try {
      await apiRequest<Project>(`/projects/${selectedProject.id}`, {
        method: 'DELETE',
      });
      await onChanged();
      onSelect('');
      setConfirmDelete(false);
      setIsEditing(false);
    } catch (caught: unknown) {
      setManageError(
        caught instanceof Error ? caught.message : 'Failed to delete project'
      );
    } finally {
      setIsDeleting(false);
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
              aria-label="Active project"
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

        {selectedProject !== undefined && (
          <section
            aria-labelledby="selected-project-heading"
            className="mt-5 border-t border-border pt-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3
                  id="selected-project-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Selected project
                </h3>
                {!isEditing && (
                  <>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedProject.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedProject.description ??
                        'No project description recorded.'}
                    </p>
                  </>
                )}
              </div>

              {!isEditing && !confirmDelete && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={beginEdit}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setManageError('');
                      setConfirmDelete(true);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              )}
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
                  aria-label="Dismiss project error"
                  onClick={() => setManageError('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {isEditing && (
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
                <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                  Project name
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="bg-surface text-sm"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                  Description
                  <Input
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    placeholder="Optional project context"
                    className="bg-surface text-sm"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isUpdating || editName.trim() === ''}
                    onClick={() => void updateProject()}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    {isUpdating ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {confirmDelete && (
              <div className="mt-4 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground">
                  Remove <strong>{selectedProject.name}</strong> from the active
                  workspace? Active Test Runs must be cancelled first.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDeleting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep project
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => void deleteProject()}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {isDeleting ? 'Deleting…' : 'Delete project'}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
