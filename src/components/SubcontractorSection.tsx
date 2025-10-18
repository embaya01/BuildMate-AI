import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { FirestoreError } from 'firebase/firestore';
import { formatCurrency } from '../utils/calculations';
import type { SubcontractorDocument } from '../types';
import { getSubcontractorSpecialtyLabel } from '../utils/subcontractors';

interface SubcontractorSectionProps {
  options: Array<SubcontractorDocument & { id: string }>;
  selectedIds: string[];
  totalSqFt: number;
  unitLabel: string;
  loading: boolean;
  error: FirestoreError | null;
  onAdd: () => void;
  onSelect: (index: number, subcontractorId: string) => void;
  onRemove: (index: number) => void;
}

const MANAGE_SUBCONTRACTORS_ROUTE = '/subcontractors';

export const SubcontractorSection = ({
  options,
  selectedIds,
  totalSqFt,
  unitLabel,
  loading,
  error,
  onAdd,
  onSelect,
  onRemove,
}: SubcontractorSectionProps) => {
  const safeSqFt = Number.isFinite(totalSqFt) ? Math.max(0, totalSqFt) : 0;

  let content: ReactNode;
  if (loading) {
    content = <div className="subcontractor-section__placeholder">Loading subcontractors...</div>;
  } else if (error) {
    content = (
      <div className="subcontractor-section__placeholder subcontractor-section__placeholder--error">
        Unable to load subcontractors. Refresh the page and try again.
      </div>
    );
  } else if (options.length === 0) {
    content = (
      <div className="subcontractor-section__placeholder">
        <p>No subcontractors cataloged yet.</p>
        <p>
          Visit the <Link to={MANAGE_SUBCONTRACTORS_ROUTE}>Subcontractors</Link> page to add your vendors.
        </p>
      </div>
    );
  } else if (selectedIds.length === 0) {
    content = (
      <div className="subcontractor-section__placeholder">
        <p>No subcontractors applied to this estimate yet.</p>
        <button className="button" type="button" onClick={onAdd}>
          Add Subcontractor
        </button>
      </div>
    );
  } else {
    content = (
      <ul className="subcontractor-section__list">
        {selectedIds.map((id, index) => {
          const subcontractor = options.find((option) => option.id === id) ?? null;
          const rate = subcontractor ? Number(subcontractor.pricePerSqFt) || 0 : 0;
          const total = safeSqFt * rate;
          return (
            <li key={`${id}-${index}`} className="subcontractor-row">
              <div className="subcontractor-row__main">
                <select
                  className="input subcontractor-row__select"
                  value={id}
                  onChange={(event) => onSelect(index, event.target.value)}
                >
                  <option value="">Select a subcontractor</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({getSubcontractorSpecialtyLabel(option.specialty)})
                    </option>
                  ))}
                </select>
                {subcontractor ? (
                  <span className="subcontractor-row__rate">
                    {formatCurrency(rate)} per {unitLabel} -{' '}
                    {getSubcontractorSpecialtyLabel(subcontractor.specialty)}
                  </span>
                ) : (
                  <span className="subcontractor-row__rate subcontractor-row__rate--missing">
                    Subcontractor removed from catalog
                  </span>
                )}
              </div>
              <div className="subcontractor-row__actions">
                <span className="subcontractor-row__total" aria-label="Estimated subcontractor cost">
                  {formatCurrency(total)}
                </span>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => onRemove(index)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="subcontractor-section">
      <header className="subcontractor-section__header">
        <div>
          <h3>Subcontractors</h3>
          <p>Select from your catalog to automatically price subcontracted work.</p>
        </div>
        <Link className="subcontractor-section__link" to={MANAGE_SUBCONTRACTORS_ROUTE}>
          Manage subcontractors
        </Link>
      </header>
      <div className="subcontractor-section__body">{content}</div>
      {options.length > 0 && selectedIds.length > 0 ? (
        <div className="subcontractor-section__footer">
          <button className="button" type="button" onClick={onAdd}>
            Add Another Subcontractor
          </button>
        </div>
      ) : null}
      {safeSqFt === 0 ? (
        <p className="subcontractor-section__footnote">
          Enter the total area above to calculate subcontractor totals.
        </p>
      ) : null}
    </section>
  );
};
