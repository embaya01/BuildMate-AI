import { useMemo, useState } from 'react';
import type { FirestoreTimestamp } from '../types';
import { useNavigate } from 'react-router-dom';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { useUserCollection } from '../hooks/useUserCollection';
import { formatCurrency } from '../utils/calculations';
import type { EstimateDocument, ProjectDocument, ProjectStatus } from '../types';

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

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { items: projectDocs, loading: projectsLoading, error: projectsError } = useUserCollection<ProjectDocument>(
    'projects',
    {
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 5,
    }
  );
  const { items: estimateDocs } = useUserCollection<EstimateDocument>('estimates', {
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
  });

  const estimateCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    estimateDocs.forEach((estimate) => {
      if (estimate.projectId) {
        const current = map.get(estimate.projectId) ?? 0;
        map.set(estimate.projectId, current + 1);
      }
    });
    return map;
  }, [estimateDocs]);

  const metrics = useMemo(() => {
    const totalApprovedValue = projectDocs.reduce(
      (sum, project) => sum + Number(project.approvedValue || 0),
      0
    );
    const totalProjects = projectDocs.length;
    const activeEstimates = estimateDocs.filter((estimate) => estimate.status === 'active').length;
    const recentApprovals = estimateDocs.filter((estimate) => {
      if (estimate.status !== 'approved') {
        return false;
      }
      const updatedAt = toDate(estimate.updatedAt);
      if (!updatedAt) {
        return false;
      }
      const deltaDays = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return deltaDays <= 7;
    }).length;

    return {
      totalApprovedValue,
      totalProjects,
      activeEstimates,
      recentApprovals,
    };
  }, [estimateDocs, projectDocs]);

  const handleProjectCreated = (projectId: string) => {
    navigate('/projects?projectId=' + projectId, { state: { projectId } });
  };
  const handleNavigateToProject = (projectId: string) => {
    navigate('/projects?projectId=' + projectId, { state: { projectId } });
  };

  return (
    <section className="dashboard">
      <div className="dashboard__grid">
        <article className="stat-card">
          <header>
            <p>Total Approved Value</p>
            <span className="stat-card__meta">+20.1% from last month</span>
          </header>
          <strong>{formatCurrency(metrics.totalApprovedValue)}</strong>
        </article>
        <article className="stat-card">
          <header>
            <p>Total Projects</p>
            <span className="stat-card__meta">+2 since last month</span>
          </header>
          <strong>{metrics.totalProjects}</strong>
        </article>
        <article className="stat-card">
          <header>
            <p>Active Estimates</p>
            <span className="stat-card__meta">+5 this month</span>
          </header>
          <strong>+{metrics.activeEstimates}</strong>
        </article>
        <article className="stat-card">
          <header>
            <p>Recent Activity</p>
            <span className="stat-card__meta">in the last 7 days</span>
          </header>
          <strong>{metrics.recentApprovals} Estimates Approved</strong>
        </article>
      </div>

      <div className="dashboard__panel">
        <header className="panel__header">
          <div>
            <h2>Projects</h2>
            <p>An overview of your construction portfolio.</p>
          </div>
          <button className="button" type="button" onClick={() => setFormOpen(true)}>
            New Project
          </button>
        </header>

        <div className="panel__body">
          {projectsLoading ? (
            <div className="panel__placeholder">Loading projects...</div>
          ) : projectsError ? (
            <div className="panel__placeholder">
              <p>Unable to load projects right now. Please try again soon.</p>
            </div>
          ) : projectDocs.length === 0 ? (
            <div className="panel__placeholder">
              <p>No Projects Added</p>
            </div>
          ) : (
            <table className="projects-table">
              <thead>
                <tr>
                  <th scope="col">Project Name</th>
                  <th scope="col">Status</th>
                  <th scope="col">Client</th>
                  <th scope="col">Estimates</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectDocs.map((project) => {
                  const estimateCount = estimateCountByProject.get(project.id) ?? project.estimatesCount ?? 0;
                  const statusLabel = STATUS_LABELS[project.status];
                  const statusClass = 'status-pill status-pill--' + project.status;
                  return (
                    <tr key={project.id}>
                      <td data-label="Project Name">{project.name}</td>
                      <td data-label="Status">
                        <span className={statusClass}>{statusLabel}</span>
                      </td>
                      <td data-label="Client">{project.client}</td>
                      <td data-label="Estimates">{estimateCount}</td>
                      <td data-label="Actions">
                        <button
                          className="link-button"
                          type="button"
                          onClick={() => handleNavigateToProject(project.id)}
                        >
                          View Project
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateProjectModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={handleProjectCreated}
      />
    </section>
  );
};







