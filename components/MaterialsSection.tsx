'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { FirestoreError } from 'firebase/firestore';
import { formatCurrency } from '@/lib/calculations';
import type { MaterialCategoryDocument } from '@/lib/types';

interface MaterialsSectionProps {
  categories: Array<MaterialCategoryDocument & { id: string }>;
  selectedIds: string[];
  totalSqFt: number;
  unitLabel: string;
  loading: boolean;
  error: FirestoreError | null;
  onSelectionChange: (ids: string[]) => void;
}

export const MaterialsSection = ({ categories, selectedIds, totalSqFt, unitLabel, loading, error, onSelectionChange }: MaterialsSectionProps) => {
  const safeSqFt = Number.isFinite(totalSqFt) ? Math.max(0, totalSqFt) : 0;
  const unitLongLabel = unitLabel === 'sq m' ? 'square meters' : 'square feet';
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) { onSelectionChange(selectedIds.filter((v) => v !== id)); }
    else { onSelectionChange([...selectedIds, id]); }
  };

  let body: ReactNode;
  if (loading) { body = <div className="materials-section__placeholder">Loading materials catalog...</div>; }
  else if (error) { body = <div className="materials-section__placeholder materials-section__placeholder--error">Could not load materials. Refresh the page or try again later.</div>; }
  else if (categories.length === 0) { body = <div className="materials-section__placeholder"><p>No materials categories yet.</p><p>Visit the <Link href="/materials">materials catalog</Link> to import or create categories.</p></div>; }
  else {
    body = (
      <ul className="materials-section__list">
        {categories.map((category) => {
          const checked = selectedIds.includes(category.id);
          const unitCost = Number.isFinite(Number(category.unitCostPerSqFt)) ? Number(category.unitCostPerSqFt) : 0;
          const totalCost = safeSqFt * unitCost;
          return (
            <li key={category.id}>
              <label className="materials-item">
                <span className="materials-item__checkbox"><input type="checkbox" checked={checked} onChange={() => handleToggle(category.id)} /></span>
                <span className="materials-item__info"><span className="materials-item__name">{category.name}</span><span className="materials-item__meta">{formatCurrency(unitCost) + ' per ' + unitLabel}</span>{category.formula ? <span className="materials-item__formula">{category.formula}</span> : null}</span>
                <span className="materials-item__total" aria-label="Estimated material cost">{formatCurrency(totalCost)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="materials-section">
      <header className="materials-section__header"><div><h3>Materials</h3><p>{'Select catalog categories to auto-price materials based on your total ' + unitLongLabel + '.'}</p></div><Link className="materials-section__link" href="/materials">Manage catalog</Link></header>
      <div className="materials-section__body">{body}</div>
      {safeSqFt === 0 ? <p className="materials-section__footnote">Enter the total area above to calculate material totals.</p> : null}
    </section>
  );
};
