import { useState } from 'react';
import type { PermitEntry, PermitsMode } from '../types';
import { formatCurrency } from '../utils/calculations';

interface PermitsSectionProps {
  mode: PermitsMode;
  singleRate: number;
  totalSqFt: number;
  unitLabel: string;
  items: PermitEntry[];
  onModeChange: (mode: PermitsMode) => void;
  onSingleRateChange: (rate: number) => void;
  onAdd: (entry: { name: string; rate: number }) => void;
  onUpdate: (id: string, updates: { name?: string; rate?: number }) => void;
  onRemove: (id: string) => void;
}

const modeOptions: Array<{ value: PermitsMode; label: string }> = [
  { value: 'single', label: 'Single Per-Sq-Ft Rate' },
  { value: 'itemized', label: 'Itemized' },
];

export const PermitsSection = ({
  mode,
  singleRate,
  totalSqFt,
  unitLabel,
  items,
  onModeChange,
  onSingleRateChange,
  onAdd,
  onUpdate,
  onRemove,
}: PermitsSectionProps) => {
  const [draftName, setDraftName] = useState('');
  const [draftRate, setDraftRate] = useState('');

  const safeSqFt = Number.isFinite(totalSqFt) ? Math.max(0, totalSqFt) : 0;

  const handleAdd = () => {
    if (!draftName.trim()) {
      return;
    }
    const rateValue = Number(draftRate);
    const safeRate = Number.isFinite(rateValue) && rateValue >= 0 ? rateValue : 0;
    onAdd({ name: draftName.trim(), rate: safeRate });
    setDraftName('');
    setDraftRate('');
  };

  return (
    <section className="permits-section">
      <header className="permits-section__header">
        <div>
          <h3>Permits & Fees</h3>
          <p>Track authority fees as a single per {unitLabel} rate or itemize each permit.</p>
        </div>
        <div className="permits-toggle" role="radiogroup" aria-label="Permits mode toggle">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              className={mode === option.value ? 'permits-toggle__button is-active' : 'permits-toggle__button'}
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {mode === 'single' ? (
        <div className="permits-single">
          <label className="field field--horizontal">
            <span>Rate per {unitLabel}</span>
            <input
              className="input input--compact align-right"
              type="number"
              min={0}
              step={0.1}
              value={singleRate}
              onChange={(event) => onSingleRateChange(Number(event.target.value) || 0)}
            />
          </label>
          <div className="permits-single__total">
            <span>Total</span>
            <strong>{formatCurrency(singleRate * safeSqFt)}</strong>
          </div>
        </div>
      ) : (
        <div className="permits-itemized">
          {items.length === 0 ? (
            <div className="permits-itemized__placeholder">
              <p>No permits added yet.</p>
              <p>Use the form below to add per {unitLabel} rates for each permit or fee.</p>
            </div>
          ) : (
            <ul className="permits-itemized__list">
              {items.map((item) => {
                const total = safeSqFt * item.ratePerSqFt;
                return (
                  <li key={item.id} className="permits-item">
                    <div className="permits-item__fields">
                      <input
                        className="input"
                        value={item.name}
                        onChange={(event) => onUpdate(item.id, { name: event.target.value })}
                        placeholder="Permit name"
                      />
                      <div className="permits-item__rate">
                        <input
                          className="input input--compact align-right"
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.ratePerSqFt}
                      onChange={(event) =>
                        onUpdate(item.id, { rate: Number(event.target.value) || 0 })
                      }
                    />
                    <span className="permits-item__unit">per {unitLabel}</span>
                  </div>
                </div>
                    <div className="permits-item__summary">
                      <span>{formatCurrency(total)}</span>
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={() => onRemove(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="permits-add">
            <input
              className="input"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Permit name"
            />
            <input
              className="input input--compact align-right"
              type="number"
              min={0}
              step={0.1}
              value={draftRate}
              onChange={(event) => setDraftRate(event.target.value)}
              placeholder={`Rate per ${unitLabel}`}
            />
            <button
              className="button"
              type="button"
              onClick={handleAdd}
              disabled={!draftName.trim()}
            >
              Add Permit
            </button>
          </div>
        </div>
      )}

      {safeSqFt === 0 ? (
        <p className="permits-section__footnote">
          Enter the total area above to calculate permit and fee totals.
        </p>
      ) : null}
    </section>
  );
};
