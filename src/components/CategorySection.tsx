import { useEffect, useMemo, useState } from 'react';
import type { CostCategoryKey, CostItem } from '../types';
import { formatCurrency } from '../utils/calculations';

interface CategorySectionProps {
  categoryKey: CostCategoryKey;
  label: string;
  items: CostItem[];
  onAdd: (category: CostCategoryKey, item: CostItem) => void;
  onUpdate: (
    category: CostCategoryKey,
    itemId: string,
    updates: Partial<CostItem>
  ) => void;
  onRemove: (category: CostCategoryKey, itemId: string) => void;
}

const makeEmptyItem = (): CostItem => ({
  id: '',
  name: '',
  description: '',
  unit: '',
  quantity: 1,
  unitCost: 0,
});

export const CategorySection = ({
  categoryKey,
  label,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: CategorySectionProps) => {
  const [draft, setDraft] = useState<CostItem>(() => makeEmptyItem());
  const [draftNoteVisible, setDraftNoteVisible] = useState(false);
  const [noteVisibility, setNoteVisibility] = useState<Record<string, boolean>>({});

  const noteDefaults = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    for (const item of items) {
      defaults[item.id] = Boolean(item.description?.trim());
    }
    return defaults;
  }, [items]);

  useEffect(() => {
    setNoteVisibility((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const item of items) {
        const prevValue = prev[item.id];
        const defaultValue = noteDefaults[item.id];
        next[item.id] = prevValue !== undefined ? prevValue : defaultValue;
        if (next[item.id] !== prevValue && !(prevValue === undefined && next[item.id] === defaultValue)) {
          changed = true;
        }
      }
      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      } else if (!changed) {
        for (const key of Object.keys(next)) {
          if (prev[key] !== next[key]) {
            changed = true;
            break;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [items, noteDefaults]);

  const handleAdd = () => {
    if (!draft.name.trim()) {
      return;
    }

    onAdd(categoryKey, {
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim() || '',
      unit: draft.unit?.trim() || '',
    });
    setDraft(makeEmptyItem());
    setDraftNoteVisible(false);
  };

  const handleNoteToggle = (itemId: string, visible: boolean) => {
    setNoteVisibility((prev) => ({ ...prev, [itemId]: visible }));
    if (!visible) {
      // keep description intact; user can re-open later
    }
  };

  const renderNote = (
    description: string | undefined,
    onDescriptionChange: (value: string) => void,
    visible: boolean,
    onToggle: (value: boolean) => void
  ) => {
    if (!visible) {
      return (
        <button
          className="category-note-toggle"
          type="button"
          onClick={() => onToggle(true)}
        >
          {description?.trim() ? 'Show note' : 'Add note'}
        </button>
      );
    }

    return (
      <div className="category-note">
        <textarea
          className="textarea"
          value={description ?? ''}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={2}
          placeholder="Notes (optional)"
        />
        <button
          className="button button--ghost category-note__hide"
          type="button"
          onClick={() => onToggle(false)}
        >
          Hide note
        </button>
      </div>
    );
  };

  return (
    <section className="category">
      <header className="category__header">
        <h3>{label}</h3>
        <span className="category__count">{items.length} items</span>
      </header>

      <div className="category__list">
        {items.map((item) => {
          const noteVisible = noteVisibility[item.id] ?? false;
          const lineTotal = item.quantity * item.unitCost;
          return (
            <div className="category-row" key={item.id}>
              <div className="category-row__grid">
                <label className="category-field category-field--wide">
                  <span>Item</span>
                  <input
                    className="input"
                    value={item.name}
                    onChange={(event) =>
                      onUpdate(categoryKey, item.id, { name: event.target.value })
                    }
                    placeholder="Description"
                  />
                </label>
                <label className="category-field">
                  <span>Unit</span>
                  <input
                    className="input"
                    value={item.unit || ''}
                    onChange={(event) =>
                      onUpdate(categoryKey, item.id, { unit: event.target.value })
                    }
                    placeholder="ea, hr, ft"
                  />
                </label>
                <label className="category-field category-field--compact">
                  <span>Qty</span>
                  <input
                    className="input align-right"
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.quantity}
                    onChange={(event) =>
                      onUpdate(categoryKey, item.id, {
                        quantity: Number(event.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="category-field category-field--compact">
                  <span>Unit Cost</span>
                  <input
                    className="input align-right"
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitCost}
                    onChange={(event) =>
                      onUpdate(categoryKey, item.id, {
                        unitCost: Number(event.target.value) || 0,
                      })
                    }
                  />
                </label>
                <div className="category-field category-field--total">
                  <span>Total</span>
                  <strong>{formatCurrency(lineTotal)}</strong>
                </div>
                <div className="category-row__actions">
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => onRemove(categoryKey, item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {renderNote(
                item.description,
                (value) => onUpdate(categoryKey, item.id, { description: value }),
                noteVisible,
                (visible) => handleNoteToggle(item.id, visible)
              )}
            </div>
          );
        })}

        <div className="category-row category-row--draft">
          <div className="category-row__grid">
            <label className="category-field category-field--wide">
              <span>Item</span>
              <input
                className="input"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={`Add ${label} item`}
              />
            </label>
            <label className="category-field">
              <span>Unit</span>
              <input
                className="input"
                value={draft.unit || ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, unit: event.target.value }))}
                placeholder="ea, hr, ft"
              />
            </label>
            <label className="category-field category-field--compact">
              <span>Qty</span>
              <input
                className="input align-right"
                type="number"
                min={0}
                step={0.01}
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, quantity: Number(event.target.value) || 0 }))
                }
              />
            </label>
            <label className="category-field category-field--compact">
              <span>Unit Cost</span>
              <input
                className="input align-right"
                type="number"
                min={0}
                step={0.01}
                value={draft.unitCost}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, unitCost: Number(event.target.value) || 0 }))
                }
              />
            </label>
            <div className="category-field category-field--total">
              <span>Total</span>
              <strong>{formatCurrency(draft.quantity * draft.unitCost)}</strong>
            </div>
            <div className="category-row__actions">
              <button className="button" type="button" onClick={handleAdd}>
                Add Item
              </button>
            </div>
          </div>
          {draftNoteVisible ? (
            <div className="category-note">
              <textarea
                className="textarea"
                value={draft.description || ''}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={2}
                placeholder="Notes (optional)"
              />
              <button
                className="button button--ghost category-note__hide"
                type="button"
                onClick={() => setDraftNoteVisible(false)}
              >
                Hide note
              </button>
            </div>
          ) : (
            <button
              className="category-note-toggle"
              type="button"
              onClick={() => setDraftNoteVisible(true)}
            >
              {draft.description?.trim() ? 'Show note' : 'Add note'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
