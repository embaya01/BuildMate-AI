import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { FirestoreTimestamp } from '../types';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { useUserCollection } from '../hooks/useUserCollection';
import { removeProject, updateProject } from '../utils/firestoreHelpers';
import { formatCurrency } from '../utils/calculations';
import type { EstimateDocument, ProjectDocument, ProjectStatus } from '../types';

const STATUS_FILTERS: Array<{ value: 'all' | ProjectStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  completed: 'Completed',
  'on-hold': 'On Hold',
};

const toDate = (value: FirestoreTimestamp | Date | undefined) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if ('toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
};

export const ProjectsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    approvedValue: '',
    status: 'planning' as ProjectStatus,
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items: projectDocs, loading, error: projectsError } = useUserCollection<ProjectDocument>('projects', {
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
  });
  const { items: estimateDocs } = useUserCollection<EstimateDocument>('estimates');

  const estimateSummary = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    estimateDocs.forEach((estimate) => {
      if (!estimate.projectId) {
        return;
      }
      const entry = map.get(estimate.projectId) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (estimate.status === 'active') {
        entry.active += 1;
      }
      map.set(estimate.projectId, entry);
    });
    return map;
  }, [estimateDocs]);

  const projects = useMemo(() => {
    const filtered = filter === 'all' ? projectDocs : projectDocs.filter((project) => project.status === filter);
    return filtered.map((project) => {
      const summary = estimateSummary.get(project.id) ?? {
        total: project.estimatesCount ?? 0,
        active: project.activeEstimates ?? 0,
      };
      return {
        ...project,
        totalEstimates: summary.total,
        activeEstimates: summary.active,
      };
    });
  }, [estimateSummary, filter, projectDocs]);

  const selectedProject =
    projects.find((project) => project.id === selectedId) ??
    projectDocs.find((project) => project.id === selectedId) ??
    null;

  useEffect(() => {
    const state = (location.state as { projectId?: string } | null);
    if (state?.projectId) {
      setPendingProjectId(state.projectId);
      navigate(location.pathname + location.search, { replace: true, state: undefined });
    }
  }, [location, navigate]);

  useEffect(() => {
    const queryId = searchParams.get('projectId');
    const targetId = pendingProjectId ?? queryId;
    if (!targetId || projectDocs.length === 0) {
      return;
    }
    const match = projectDocs.find((project) => project.id === targetId);
    if (match) {
      setSelectedId(match.id);
      setFormValues({
        approvedValue: String(match.approvedValue ?? ''),
        status: match.status,
      });
      setPendingProjectId(null);
      if (queryId) {
        const next = new URLSearchParams(searchParams);
        next.delete('projectId');
        setSearchParams(next, { replace: true });
      }
    }
  }, [pendingProjectId, projectDocs, searchParams, setSearchParams]);

  const getFilterClass = (value: 'all' | ProjectStatus) =>
    filter === value ? 'filter-chip filter-chip--active' : 'filter-chip';

  const openEditor = (project: ProjectDocument & { id: string }) => {
    setSelectedId(project.id);
    setFormValues({
      approvedValue: String(project.approvedValue ?? ''),
      status: project.status,
    });
    setError(null);
  };

  const closeEditor = () => {
    if (saving || removing) {
      return;
    }
    setSelectedId(null);
    setError(null);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !selectedId) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProject(user.uid, selectedId, {
        status: formValues.status,
        approvedValue: Number(formValues.approvedValue) || 0,
      });
      setSelectedId(null);
    } catch (updateError) {
      console.error(updateError);
      setError('Could not update the project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !selectedId) {
      return;
    }
    const confirmed = window.confirm('Delete this project? This action cannot be undone.');
    if (!confirmed) {
      return;
    }
    setRemoving(true);
    setError(null);
    try {
      await removeProject(user.uid, selectedId);
      setSelectedId(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError('Could not delete the project. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="projects">
      <header className="page-header">
        <div>
          <h2>Projects</h2>
          <p>Monitor every active build, from planning through close-out.</p>
        </div>
        <button className="button" type="button" onClick={() => setCreateOpen(true)}>
          New Project
        </button>
      </header>

      <div className="projects__filters" role="tablist" aria-label="Project status filter">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={getFilterClass(option.value)}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="projects__table">
        {loading ? (
          <div className="panel__placeholder">Loading projects...</div>
        ) : projectsError ? (
          <div className="panel__placeholder">
            <p>Unable to load projects right now. Please try again soon.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="panel__placeholder">
            <p>No Projects Added</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Client</th>
                <th scope="col">Status</th>
                <th scope="col">Approved Value</th>
                <th scope="col">Estimates</th>
                <th scope="col">Last Activity</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const lastActivity = toDate(project.lastActivity)?.toLocaleDateString() ?? 'N/A';
                const statusClass = 'status-pill status-pill--' + project.status;
                return (
                  <tr key={project.id} className={project.id === selectedId ? 'row--active' : undefined}>
                    <td data-label="Project">{project.name}</td>
                    <td data-label="Client">{project.client}</td>
                    <td data-label="Status">
                      <span className={statusClass}>{STATUS_LABELS[project.status]}</span>
                    </td>
                    <td data-label="Approved Value">{formatCurrency(Number(project.approvedValue ?? 0))}</td>
                    <td data-label="Estimates">
                      {project.totalEstimates} total / {project.activeEstimates} active
                    </td>
                    <td data-label="Last Activity">{lastActivity}</td>
                    <td data-label="Action">
                      <button type="button" className="link-button" onClick={() => openEditor(project)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(projectId) => { setPendingProjectId(projectId); setSelectedId(projectId); }}
      />

      {selectedProject ? (
        <div className="drawer" role="dialog" aria-modal="true">
          <form className="drawer__card" onSubmit={handleUpdate}>
            <header className="drawer__header">
              <div>
                <h3>{selectedProject.name}</h3>
                <p>{selectedProject.client}</p>
              </div>
              <button type="button" className="drawer__close" onClick={closeEditor}>
                Close
              </button>
            </header>
            {error ? <p className="form-error">{error}</p> : null}
            <label>
              <span>Status</span>
              <select
                value={formValues.status}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, status: event.target.value as ProjectStatus }))
                }
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </label>
            <label>
              <span>Approved value</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formValues.approvedValue}
                onChange={(event) => setFormValues((prev) => ({ ...prev, approvedValue: event.target.value }))}
              />
            </label>
            <div className="drawer__actions">
              <button type="button" className="button button--danger" onClick={handleDelete} disabled={saving || removing}>
                {removing ? 'Deleting...' : 'Delete project'}
              </button>
              <div className="drawer__spacer" />
              <button type="button" className="button button--ghost" onClick={closeEditor} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};














