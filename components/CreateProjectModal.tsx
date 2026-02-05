'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createProject } from '@/lib/firestoreHelpers';
import type { ProjectStatus } from '@/lib/types';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

interface ProjectFormState {
  name: string;
  client: string;
  status: ProjectStatus;
  approvedValue: string;
}

const defaultForm: ProjectFormState = { name: '', client: '', status: 'planning', approvedValue: '' };

export const CreateProjectModal = ({ open, onClose, onCreated }: CreateProjectModalProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<ProjectFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => { if (saving) return; setForm(defaultForm); setError(null); onClose(); };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const projectId = await createProject(user.uid, { name: form.name.trim(), client: form.client.trim(), status: form.status, approvedValue: Number(form.approvedValue) || 0 });
      setForm(defaultForm);
      if (onCreated) onCreated(projectId);
      onClose();
    } catch {
      setError('Could not create the project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__card">
        <header className="modal__header"><h3>New Project</h3><button type="button" className="modal__close" onClick={handleClose}>Close</button></header>
        <form className="modal__form" onSubmit={handleSubmit}>
          {error ? <p className="form-error">{error}</p> : null}
          <label><span>Project name</span><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></label>
          <label><span>Client</span><input type="text" value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} required /></label>
          <label><span>Status</span><select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))}><option value="planning">Planning</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="on-hold">On Hold</option></select></label>
          <label><span>Approved value</span><input type="number" min="0" step="0.01" value={form.approvedValue} onChange={(e) => setForm((p) => ({ ...p, approvedValue: e.target.value }))} /></label>
          <div className="modal__actions"><button type="button" className="button button--ghost" onClick={handleClose}>Cancel</button><button type="submit" className="button" disabled={saving}>{saving ? 'Creating...' : 'Create project'}</button></div>
        </form>
      </div>
    </div>
  );
};
