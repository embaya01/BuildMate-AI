"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserCollection } from "@/hooks/useUserCollection";
import {
  createSubcontractor,
  removeSubcontractor,
  updateSubcontractor,
} from "@/lib/firestoreHelpers";
import { formatCurrency } from "@/lib/calculations";
import {
  SUBCONTRACTOR_SPECIALTY_OPTIONS,
  getSubcontractorSpecialtyLabel,
} from "@/lib/subcontractors";
import type { SubcontractorDocument, SubcontractorSpecialty } from "@/lib/types";

interface FormState {
  name: string;
  specialty: SubcontractorSpecialty;
  price: string;
  phone: string;
  email: string;
  notes: string;
}

const makeEmptyForm = (): FormState => ({
  name: "",
  specialty: "hvac",
  price: "",
  phone: "",
  email: "",
  notes: "",
});

export default function SubcontractorsPage() {
  const { user } = useAuth();
  const {
    items: subcontractors,
    loading,
    error,
  } = useUserCollection<SubcontractorDocument>("subcontractors", {
    orderBy: [
      { field: "specialty", direction: "asc" },
      { field: "name", direction: "asc" },
    ],
  });

  const [form, setForm] = useState<FormState>(() => makeEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const totalVendors = subcontractors.length;
  const averageRate = useMemo(() => {
    if (subcontractors.length === 0) return 0;
    const sum = subcontractors.reduce((acc, sub) => acc + (Number(sub.pricePerSqFt) || 0), 0);
    return sum / subcontractors.length;
  }, [subcontractors]);

  const handleReset = () => {
    setForm(makeEmptyForm());
    setEditingId(null);
    setFormError(null);
    setFormMessage(null);
  };

  const handleEdit = (id: string) => {
    const match = subcontractors.find((sub) => sub.id === id);
    if (!match) return;
    setForm({
      name: match.name ?? "",
      specialty: match.specialty ?? "other",
      price: String(match.pricePerSqFt ?? ""),
      phone: match.phone ?? "",
      email: match.email ?? "",
      notes: match.notes ?? "",
    });
    setEditingId(id);
    setFormError(null);
    setFormMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const confirmed = window.confirm("Remove this subcontractor from your catalog?");
    if (!confirmed) return;
    try {
      await removeSubcontractor(user.uid, id);
    } catch (err) {
      console.error(err);
      window.alert("Could not remove subcontractor. Please try again.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setFormError("You must be signed in to manage subcontractors.");
      return;
    }
    const price = Number(form.price);
    if (!form.name.trim()) {
      setFormError("Enter a subcontractor name.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price per square foot.");
      return;
    }
    setSaving(true);
    setFormError(null);
    setFormMessage(null);
    try {
      if (editingId) {
        await updateSubcontractor(user.uid, editingId, {
          name: form.name.trim(),
          specialty: form.specialty,
          pricePerSqFt: price,
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          notes: form.notes?.trim() || null,
        });
        setFormMessage("Subcontractor updated.");
      } else {
        await createSubcontractor(user.uid, {
          name: form.name.trim(),
          specialty: form.specialty,
          pricePerSqFt: price,
          phone: form.phone?.trim() || null,
          email: form.email?.trim() || null,
          notes: form.notes?.trim() || null,
        });
        setFormMessage("Subcontractor added.");
      }
      handleReset();
    } catch (err) {
      console.error(err);
      setFormError("Could not save subcontractor. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="subcontractors">
      <header className="page-header">
        <div>
          <h2>Subcontractors</h2>
          <p>Maintain your trusted partners and their pricing for quick estimate sourcing.</p>
        </div>
      </header>

      <div className="subcontractors__stats">
        <div className="stat-card">
          <header>
            <p>Active subcontractors</p>
            <span className="stat-card__meta">Available in estimator</span>
          </header>
          <strong>{totalVendors}</strong>
        </div>
        <div className="stat-card">
          <header>
            <p>Average rate</p>
            <span className="stat-card__meta">Weighted evenly across catalog</span>
          </header>
          <strong>{formatCurrency(averageRate)}</strong>
        </div>
      </div>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>{editingId ? "Edit subcontractor" : "Add subcontractor"}</h3>
            <p>Provide a price per square foot so estimates can automatically calculate costs.</p>
          </div>
        </header>
        <form className="panel__body panel__form" onSubmit={handleSubmit}>
          {formError ? <div className="form-error">{formError}</div> : null}
          {formMessage ? <div className="form-message">{formMessage}</div> : null}
          <div className="panel__grid">
            <label className="field">
              <span>Name</span>
              <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="North Shore HVAC" required />
            </label>
            <label className="field">
              <span>Specialty</span>
              <select className="input" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value as SubcontractorSpecialty }))}>
                {SUBCONTRACTOR_SPECIALTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Price per sq ft</span>
              <input className="input align-right" type="number" min={0} step={0.25} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="2.50" required />
            </label>
            <label className="field">
              <span>Email (optional)</span>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="contact@vendor.com" />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input className="input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea className="textarea" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Scheduling preferences, coverage areas, or reference notes." />
          </label>
          <div className="panel__actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update subcontractor" : "Add subcontractor"}
            </button>
            {editingId ? (
              <button className="button button--ghost" type="button" onClick={handleReset} disabled={saving}>Cancel edit</button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>Catalog</h3>
            <p>All subcontractors currently available in the estimator.</p>
          </div>
        </header>
        <div className="panel__body">
          {loading ? (
            <div className="panel__placeholder">Loading subcontractors...</div>
          ) : error ? (
            <div className="panel__placeholder panel__placeholder--error">Could not load subcontractors. Please refresh.</div>
          ) : subcontractors.length === 0 ? (
            <div className="panel__placeholder"><p>No subcontractors saved yet. Add your first subcontractor above.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Specialty</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.name}</td>
                    <td>{getSubcontractorSpecialtyLabel(sub.specialty)}</td>
                    <td>{formatCurrency(Number(sub.pricePerSqFt) || 0)} / sq ft</td>
                    <td>
                      <div className="table-contact">
                        {sub.email ? <span>{sub.email}</span> : null}
                        {sub.phone ? <span>{sub.phone}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="button button--ghost" type="button" onClick={() => handleEdit(sub.id)}>Edit</button>
                        <button className="button button--ghost" type="button" onClick={() => handleDelete(sub.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
