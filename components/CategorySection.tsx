'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CostCategoryKey, CostItem } from '@/lib/types';
import { formatCurrency } from '@/lib/calculations';

interface CategorySectionProps {
  categoryKey: CostCategoryKey;
  label: string;
  items: CostItem[];
  onAdd: (category: CostCategoryKey, item: CostItem) => void;
  onUpdate: (category: CostCategoryKey, itemId: string, updates: Partial<CostItem>) => void;
  onRemove: (category: CostCategoryKey, itemId: string) => void;
}

const makeEmptyItem = (): CostItem => ({ id: '', name: '', description: '', unit: '', quantity: 1, unitCost: 0 });

export const CategorySection = ({ categoryKey, label, items, onAdd, onUpdate, onRemove }: CategorySectionProps) => {
  const [draft, setDraft] = useState<CostItem>(() => makeEmptyItem());
  const [draftNoteVisible, setDraftNoteVisible] = useState(false);
  const [noteVisibility, setNoteVisibility] = useState<Record<string, boolean>>({});

  const noteDefaults = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const item of items) { defaults[item.id] = Boolean(item.description?.trim()); }
    return defaults;
  }, [items]);

  useEffect(() => {
    setNoteVisibility((prev) => {
      const next: Record<string, boolean> = {};
      for (const item of items) { next[item.id] = prev[item.id] !== undefined ? prev[item.id] : noteDefaults[item.id]; }
      return next;
    });
  }, [items, noteDefaults]);

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    onAdd(categoryKey, { ...draft, name: draft.name.trim(), description: draft.description?.trim() || '', unit: draft.unit?.trim() || '' });
    setDraft(makeEmptyItem());
    setDraftNoteVisible(false);
  };

  return (
    <section className="category">
      <header className="category__header"><h3>{label}</h3><span className="category__count">{items.length + ' items'}</span></header>
      <div className="category__list">
        {items.map((item) => {
          const noteVisible = noteVisibility[item.id] ?? false;
          const lineTotal = item.quantity * item.unitCost;
          return (
            <div className="category-row" key={item.id}>
              <div className="category-row__grid">
                <label className="category-field category-field--wide"><span>Item</span><input className="input" value={item.name} onChange={(e) => onUpdate(categoryKey, item.id, { name: e.target.value })} placeholder="Description" /></label>
                <label className="category-field"><span>Unit</span><input className="input" value={item.unit || ''} onChange={(e) => onUpdate(categoryKey, item.id, { unit: e.target.value })} placeholder="ea, hr, ft" /></label>
                <label className="category-field category-field--compact"><span>Qty</span><input className="input align-right" type="number" min={0} step={0.01} value={item.quantity} onChange={(e) => onUpdate(categoryKey, item.id, { quantity: Number(e.target.value) || 0 })} /></label>
                <label className="category-field category-field--compact"><span>Unit Cost</span><input className="input align-right" type="number" min={0} step={0.01} value={item.unitCost} onChange={(e) => onUpdate(categoryKey, item.id, { unitCost: Number(e.target.value) || 0 })} /></label>
                <div className="category-field category-field--total"><span>Total</span><strong>{formatCurrency(lineTotal)}</strong></div>
                <div className="category-row__actions"><button className="button button--ghost" type="button" onClick={() => onRemove(categoryKey, item.id)}>Remove</button></div>
              </div>
              {noteVisible ? (
                <div className="category-note">
                  <textarea className="textarea" value={item.description ?? ''} onChange={(e) => onUpdate(categoryKey, item.id, { description: e.target.value })} rows={2} placeholder="Notes (optional)" />
                  <button className="button button--ghost category-note__hide" type="button" onClick={() => setNoteVisibility((p) => ({ ...p, [item.id]: false }))}>Hide note</button>
                </div>
              ) : (
                <button className="category-note-toggle" type="button" onClick={() => setNoteVisibility((p) => ({ ...p, [item.id]: true }))}>{item.description?.trim() ? 'Show note' : 'Add note'}</button>
              )}
            </div>
          );
        })}
        <div className="category-row category-row--draft">
          <div className="category-row__grid">
            <label className="category-field category-field--wide"><span>Item</span><input className="input" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder={'Add ' + label + ' item'} /></label>
            <label className="category-field"><span>Unit</span><input className="input" value={draft.unit || ''} onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))} placeholder="ea, hr, ft" /></label>
            <label className="category-field category-field--compact"><span>Qty</span><input className="input align-right" type="number" min={0} step={0.01} value={draft.quantity} onChange={(e) => setDraft((p) => ({ ...p, quantity: Number(e.target.value) || 0 }))} /></label>
            <label className="category-field category-field--compact"><span>Unit Cost</span><input className="input align-right" type="number" min={0} step={0.01} value={draft.unitCost} onChange={(e) => setDraft((p) => ({ ...p, unitCost: Number(e.target.value) || 0 }))} /></label>
            <div className="category-field category-field--total"><span>Total</span><strong>{formatCurrency(draft.quantity * draft.unitCost)}</strong></div>
            <div className="category-row__actions"><button className="button" type="button" onClick={handleAdd}>Add Item</button></div>
          </div>
          {draftNoteVisible ? (
            <div className="category-note"><textarea className="textarea" value={draft.description || ''} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="Notes (optional)" /><button className="button button--ghost category-note__hide" type="button" onClick={() => setDraftNoteVisible(false)}>Hide note</button></div>
          ) : (
            <button className="category-note-toggle" type="button" onClick={() => setDraftNoteVisible(true)}>{draft.description?.trim() ? 'Show note' : 'Add note'}</button>
          )}
        </div>
      </div>
    </section>
  );
};
