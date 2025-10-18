import { useMemo } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import type { EstimateDocument } from '../types';
import { formatCurrency } from '../utils/calculations';

interface LaborSummary {
  name: string;
  hours: number;
  totalCost: number;
}

export const LaborPage = () => {
  const { items: estimates, loading } = useUserCollection<EstimateDocument>('estimates');

  const summaries = useMemo<LaborSummary[]>(() => {
    const map = new Map<string, LaborSummary>();
    estimates.forEach((estimate) => {
      const labor = estimate.state?.categories?.labor ?? [];
      labor.forEach((item) => {
        const name = item.name || 'Crew';
        const hours = Number(item.quantity) || 0;
        const cost = hours * (Number(item.unitCost) || 0);
        const entry = map.get(name) ?? { name, hours: 0, totalCost: 0 };
        entry.hours += hours;
        entry.totalCost += cost;
        map.set(name, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [estimates]);

  const totalLaborCost = useMemo(() => summaries.reduce((sum, summary) => sum + summary.totalCost, 0), [summaries]);
  const totalHours = useMemo(() => summaries.reduce((sum, summary) => sum + summary.hours, 0), [summaries]);

  return (
    <section className="labor">
      <header className="page-header">
        <div>
          <h2>Labor</h2>
          <p>Understand where crew hours and wage costs are concentrated.</p>
        </div>
      </header>

      <div className="labor__metrics">
        <div className="stat-card">
          <header>
            <p>Total labor cost</p>
            <span className="stat-card__meta">Across saved estimates</span>
          </header>
          <strong>{formatCurrency(totalLaborCost)}</strong>
        </div>
        <div className="stat-card">
          <header>
            <p>Total hours</p>
            <span className="stat-card__meta">Aggregate crew hours</span>
          </header>
          <strong>{totalHours.toLocaleString()}</strong>
        </div>
      </div>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>Crew breakdown</h3>
            <p>Track where labor resources are being allocated.</p>
          </div>
        </header>
        <div className="panel__body">
          {loading ? (
            <div className="panel__placeholder">Loading labor data...</div>
          ) : summaries.length === 0 ? (
            <div className="panel__placeholder">
              <p>No labor data yet. Save an estimate to analyze labor usage.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Crew</th>
                  <th scope="col">Total Hours</th>
                  <th scope="col">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.name}>
                    <td>{summary.name}</td>
                    <td>{summary.hours.toLocaleString()}</td>
                    <td>{formatCurrency(summary.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};
