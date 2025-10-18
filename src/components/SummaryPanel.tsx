import type { CategoryTotal, FinancialBreakdown } from '../utils/calculations';
import type { CostSettings } from '../types';
import { formatCurrency } from '../utils/calculations';

interface SummaryPanelProps {
  totals: CategoryTotal[];
  breakdown: FinancialBreakdown;
  settings: CostSettings;
  onSettingsChange: (settings: CostSettings) => void;
  onDownload: () => void;
  onCopySummary: () => void;
  lastSavedAt: number | null;
}

const formatTimestamp = (value: number | null) => {
  if (!value) {
    return 'Not saved yet';
  }
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
};

export const SummaryPanel = ({
  totals,
  breakdown,
  settings,
  onSettingsChange,
  onDownload,
  onCopySummary,
  lastSavedAt,
}: SummaryPanelProps) => {
  const handleSetting = (field: keyof CostSettings, value: number) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <aside className="summary" aria-label="Estimator summary">
      <header className="summary__header">
        <h2>Estimate Summary</h2>
        <p className="summary__subtext">
          Adjust your markup, contingency, and tax assumptions to refine the proposal total.
        </p>
      </header>

      <div className="summary__meta">
        <span>Auto-saved</span>
        <time dateTime={lastSavedAt ? new Date(lastSavedAt).toISOString() : undefined}>
          {formatTimestamp(lastSavedAt)}
        </time>
      </div>

      <div className="summary__section">
        <h3>Category Totals</h3>
        <ul className="summary__list">
          {totals.map((entry) => (
            <li key={entry.key}>
              <span>{entry.label}</span>
              <strong>{formatCurrency(entry.total)}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="summary__section">
        <h3>Markup & Risk Inputs</h3>
        <div className="summary__settings">
          <label>
            <span>Overhead %</span>
            <input
              className="input align-right"
              type="number"
              min={0}
              step={0.25}
              value={settings.overhead}
              onChange={(event) => handleSetting('overhead', Number(event.target.value) || 0)}
            />
          </label>
          <label>
            <span>Contingency %</span>
            <input
              className="input align-right"
              type="number"
              min={0}
              step={0.25}
              value={settings.contingency}
              onChange={(event) => handleSetting('contingency', Number(event.target.value) || 0)}
            />
          </label>
          <label>
            <span>Profit Margin %</span>
            <input
              className="input align-right"
              type="number"
              min={0}
              step={0.25}
              value={settings.profitMargin}
              onChange={(event) => handleSetting('profitMargin', Number(event.target.value) || 0)}
            />
          </label>
          <label>
            <span>Sales Tax %</span>
            <input
              className="input align-right"
              type="number"
              min={0}
              step={0.1}
              value={settings.taxRate}
              onChange={(event) => handleSetting('taxRate', Number(event.target.value) || 0)}
            />
          </label>
        </div>
      </div>

      <div className="summary__section">
        <h3>Financial Breakdown</h3>
        <ul className="summary__list">
          <li>
            <span>Direct Cost Subtotal</span>
            <strong>{formatCurrency(breakdown.subtotal)}</strong>
          </li>
          <li>
            <span>Overhead</span>
            <strong>{formatCurrency(breakdown.overheadAmount)}</strong>
          </li>
          <li>
            <span>Contingency</span>
            <strong>{formatCurrency(breakdown.contingencyAmount)}</strong>
          </li>
          <li>
            <span>Markup Base</span>
            <strong>{formatCurrency(breakdown.markupBase)}</strong>
          </li>
          <li>
            <span>Profit</span>
            <strong>{formatCurrency(breakdown.profitAmount)}</strong>
          </li>
          <li>
            <span>Taxable Amount</span>
            <strong>{formatCurrency(breakdown.taxableAmount)}</strong>
          </li>
          <li>
            <span>Sales Tax</span>
            <strong>{formatCurrency(breakdown.taxAmount)}</strong>
          </li>
          <li className="summary__grand">
            <span>Total Proposal Value</span>
            <strong>{formatCurrency(breakdown.grandTotal)}</strong>
          </li>
        </ul>
      </div>

      <div className="summary__section summary__actions">
        <button className="button" type="button" onClick={onDownload}>
          Download Estimate (.json)
        </button>
        <button className="button button--ghost" type="button" onClick={onCopySummary}>
          Copy Summary
        </button>
      </div>
    </aside>
  );
};