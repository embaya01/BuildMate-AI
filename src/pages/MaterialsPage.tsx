import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserCollection } from '../hooks/useUserCollection';
import {
  createMaterialCategory,
  removeMaterialCategory,
  updateMaterialCategory,
} from '../utils/firestoreHelpers';
import type { EstimateDocument, MaterialCategoryDocument } from '../types';
import { formatCurrency } from '../utils/calculations';

interface MaterialSummary {
  name: string;
  totalCost: number;
  occurrences: number;
}

interface MaterialFormState {
  name: string;
  unitCost: string;
  formula: string;
  description: string;
}

const defaultFormState: MaterialFormState = {
  name: '',
  unitCost: '',
  formula: '',
  description: '',
};

export const MaterialsPage = () => {
  const { user } = useAuth();
  const {
    items: categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useUserCollection<MaterialCategoryDocument>('materialCategories', {
    orderBy: [{ field: 'name', direction: 'asc' }],
  });
  const { items: estimates, loading: estimatesLoading } = useUserCollection<EstimateDocument>('estimates');

  const [form, setForm] = useState<MaterialFormState>(defaultFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingId(null);
    setFormError(null);
    setFormMessage(null);
  };

  const handleEdit = (id: string) => {
    const match = categories.find((category) => category.id === id);
    if (!match) {
      return;
    }
    setForm({
      name: match.name ?? '',
      unitCost: match.unitCostPerSqFt != null ? String(match.unitCostPerSqFt) : '',
      formula: match.formula ?? '',
      description: match.description ?? '',
    });
    setEditingId(id);
    setFormError(null);
    setFormMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      return;
    }
    const confirmed = window.confirm('Remove this material category from your catalog?');
    if (!confirmed) {
      return;
    }
    try {
      await removeMaterialCategory(user.uid, id);
    } catch (err) {
      console.error(err);
      window.alert('Could not remove the material category. Please try again.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setFormError('You must be signed in to manage materials.');
      return;
    }
    const rate = Number(form.unitCost);
    if (!form.name.trim()) {
      setFormError('Enter a material category name.');
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setFormError('Enter a valid cost per square unit.');
      return;
    }
    setSaving(true);
    setFormError(null);
    setFormMessage(null);
    try {
      if (editingId) {
        await updateMaterialCategory(user.uid, editingId, {
          name: form.name.trim(),
          unitCostPerSqFt: rate,
          formula: form.formula.trim() ? form.formula.trim() : null,
          description: form.description.trim() ? form.description.trim() : null,
        });
        setFormMessage('Material category updated.');
      } else {
        await createMaterialCategory(user.uid, {
          name: form.name.trim(),
          unitCostPerSqFt: rate,
          formula: form.formula.trim() ? form.formula.trim() : null,
          description: form.description.trim() ? form.description.trim() : null,
        });
        setFormMessage('Material category added.');
      }
      setForm(defaultFormState);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setFormError('Could not save the material category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const summaries = useMemo<MaterialSummary[]>(() => {
    const map = new Map<string, MaterialSummary>();
    estimates.forEach((estimate) => {
      const materials = estimate.state?.categories?.materials ?? [];
      materials.forEach((item) => {
        const name = item.name || 'Unnamed item';
        const totalCost = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        const entry = map.get(name) ?? { name, totalCost: 0, occurrences: 0 };
        entry.totalCost += totalCost;
        entry.occurrences += 1;
        map.set(name, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [estimates]);

  const totalMaterialCost = useMemo(() => summaries.reduce((sum, summary) => sum + summary.totalCost, 0), [summaries]);
  const averageCatalogRate = useMemo(() => {
    if (categories.length === 0) {
      return 0;
    }
    const sum = categories.reduce((acc, category) => acc + (Number(category.unitCostPerSqFt) || 0), 0);
    return sum / categories.length;
  }, [categories]);

  return (
    <section className="materials">
      <header className="page-header">
        <div>
          <h2>Materials Catalog</h2>
          <p>Maintain base material pricing and review how categories perform across saved estimates.</p>
        </div>
      </header>

      <div className="panel">
        <form className="panel__body" onSubmit={handleSubmit}>
          <header className="panel__header">
            <div>
              <h3>{editingId ? 'Edit material category' : 'Add material category'}</h3>
              <p>Set cost per square unit so the estimator can auto-price materials.</p>
            </div>
          </header>
          {formError ? <div className="form-error">{formError}</div> : null}
          {formMessage ? <div className="form-message">{formMessage}</div> : null}
          <label className="field">
            <span>Name</span>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Concrete"
              required
            />
          </label>
          <label className="field">
            <span>Cost per sq unit</span>
            <input
              className="input align-right"
              type="number"
              min={0}
              step={0.01}
              value={form.unitCost}
              onChange={(event) => setForm((prev) => ({ ...prev, unitCost: event.target.value }))}
              placeholder="4.25"
              required
            />
          </label>
          <label className="field">
            <span>Formula (optional)</span>
            <input
              className="input"
              value={form.formula}
              onChange={(event) => setForm((prev) => ({ ...prev, formula: event.target.value }))}
              placeholder="Base + waste factor"
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Notes about sourcing, waste, or vendor guidance."
            />
          </label>
          <div className="panel__actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update category' : 'Add category'}
            </button>
            {editingId ? (
              <button
                className="button button--ghost"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>Catalog</h3>
            <p>Categories available to the estimator pricing engine.</p>
          </div>
        </header>
        <div className="panel__body">
          {categoriesLoading ? (
            <div className="panel__placeholder">Loading material categories…</div>
          ) : categoriesError ? (
            <div className="panel__placeholder panel__placeholder--error">
              Could not load material categories. Please refresh.
            </div>
          ) : categories.length === 0 ? (
            <div className="panel__placeholder">
              <p>No material categories yet. Add your first category above.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Formula</th>
                  <th scope="col">Description</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{formatCurrency(Number(category.unitCostPerSqFt) || 0)} / sq unit</td>
                    <td>{category.formula || '—'}</td>
                    <td>{category.description || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => handleEdit(category.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => handleDelete(category.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="stat-card">
        <header>
          <p>Catalog size</p>
          <span className="stat-card__meta">Total material categories</span>
        </header>
        <strong>{categories.length}</strong>
      </div>

      <div className="stat-card">
        <header>
          <p>Average catalog rate</p>
          <span className="stat-card__meta">Per square unit across categories</span>
        </header>
        <strong>{formatCurrency(averageCatalogRate)}</strong>
      </div>

      <div className="stat-card stat-card--wide">
        <header>
          <p>Total material cost</p>
          <span className="stat-card__meta">Across all saved estimates</span>
        </header>
        <strong>{formatCurrency(totalMaterialCost)}</strong>
      </div>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>Top material items</h3>
            <p>Ranked by cumulative spend within saved estimates.</p>
          </div>
        </header>
        <div className="panel__body">
          {estimatesLoading ? (
            <div className="panel__placeholder">Calculating material insights…</div>
          ) : summaries.length === 0 ? (
            <div className="panel__placeholder">
              <p>No material data yet. Save an estimate to analyze material costs.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Total Cost</th>
                  <th scope="col">Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.name}>
                    <td>{summary.name}</td>
                    <td>{formatCurrency(summary.totalCost)}</td>
                    <td>{summary.occurrences}</td>
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
