import { useState } from 'react';
import type { CostItem } from '../types';
import { formatCurrency } from '../utils/calculations';

interface LaborSectionProps {
  totalSqFt: number;
  primaryItem: CostItem;
  workers: CostItem[];
  unitLabel: string;
  onPrimaryRateChange: (rate: number) => void;
  onWorkerAdd: (name: string, rate: number) => void;
  onWorkerUpdate: (id: string, updates: { name?: string; rate?: number }) => void;
  onWorkerRemove: (id: string) => void;
}

const rateFromInput = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const LaborSection = ({
  totalSqFt,
  primaryItem,
  workers,
  unitLabel,
  onPrimaryRateChange,
  onWorkerAdd,
  onWorkerUpdate,
  onWorkerRemove,
}: LaborSectionProps) => {
  const [draftName, setDraftName] = useState('');
  const [draftRate, setDraftRate] = useState('');

  const totalForPrimary = totalSqFt * (primaryItem.unitCost || 0);

  const unitLongLabel = unitLabel === 'sq m' ? 'square meter' : 'square foot';
  const handleAddWorker = () => {
    if (!draftName.trim()) {
      return;
    }
    onWorkerAdd(draftName.trim(), rateFromInput(draftRate));
    setDraftName('');
    setDraftRate('');
  };

  return (
    <section className="labor-section">
      <header className="labor-section__header">
        <div>
          <h3>Labor</h3>
          <p>Set your price per {unitLongLabel} and add any additional crew members.</p>
        </div>
      </header>

      <div className="labor-card labor-card--primary">
        <div className="labor-card__info">
          <span className="labor-card__label">{primaryItem.name || 'Primary Constructor'}</span>
            <span className="labor-card__rate">
              <input
                className="input input--compact align-right"
                type="number"
                min={0}
                step={0.25}
                value={primaryItem.unitCost}
                onChange={(event) => onPrimaryRateChange(rateFromInput(event.target.value))}
              />
              <span className="labor-card__unit">per {unitLabel}</span>
            </span>
          </div>
          <div className="labor-card__total">{formatCurrency(totalForPrimary)}</div>
        </div>

      <div className="labor-workers">
        {workers.length === 0 ? (
          <div className="labor-workers__placeholder">No additional workers added yet.</div>
        ) : (
          workers.map((worker) => {
            const workerTotal = totalSqFt * (worker.unitCost || 0);
            return (
              <div key={worker.id} className="labor-card labor-card--worker">
                <div className="labor-card__info labor-card__info--worker">
                  <input
                    className="input labor-card__name"
                    value={worker.name}
                    onChange={(event) => onWorkerUpdate(worker.id, { name: event.target.value })}
                    placeholder="Crew member name"
                  />
                  <div className="labor-card__rate">
                    <input
                      className="input input--compact align-right"
                      type="number"
                      min={0}
                      step={0.25}
                      value={worker.unitCost}
                      onChange={(event) =>
                        onWorkerUpdate(worker.id, { rate: rateFromInput(event.target.value) })
                      }
                    />
                    <span className="labor-card__unit">per {unitLabel}</span>
                  </div>
                </div>
                <div className="labor-card__total">{formatCurrency(workerTotal)}</div>
                <button
                  className="button button--ghost labor-card__remove"
                  type="button"
                  onClick={() => onWorkerRemove(worker.id)}
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="labor-add">
        <div className="labor-add__fields">
          <input
            className="input"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Worker or subcontractor name"
          />
          <input
            className="input input--compact align-right"
            type="number"
            min={0}
            step={0.25}
            value={draftRate}
            onChange={(event) => setDraftRate(event.target.value)}
            placeholder={`Rate per ${unitLabel}`}
          />
        </div>
        <button
          className="button"
          type="button"
          onClick={handleAddWorker}
          disabled={!draftName.trim()}
        >
          Add Worker
        </button>
      </div>

      {totalSqFt === 0 ? (
        <p className="labor-section__footnote">Enter the total area to see labor totals per worker.</p>
      ) : null}
    </section>
  );
};
