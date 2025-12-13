import { useMemo, useState } from 'react';
import type { IntakeDraftResult } from '../utils/nlIntake';

interface NLIntakePanelProps {
  result: IntakeDraftResult | null;
  onDraft: (scopeText: string) => Promise<void> | void;
  isProcessing?: boolean;
  totalSqFt: number;
  unitLabel: string;
  showHeader?: boolean;
}

export const NLIntakePanel = ({
  result,
  onDraft,
  isProcessing = false,
  totalSqFt,
  unitLabel,
  showHeader = true,
}: NLIntakePanelProps) => {
  const [text, setText] = useState('');
  const [localBusy, setLocalBusy] = useState(false);

  const insights = useMemo(() => {
    if (!result) {
      return [];
    }
    const unique = Array.from(new Set(result.reasoning ?? []));
    if (result.detectedSqFt) {
      unique.unshift(
        `Detected roughly ${result.detectedSqFt.toLocaleString()} ${result.detectedUnit} from the narrative.`
      );
    }
    return unique.slice(0, 6);
  }, [result]);

  const confidenceMeta = useMemo(() => {
    if (!result) {
      return null;
    }
    const percent = Math.round(result.confidence * 100);
    let tone: 'low' | 'med' | 'high' = 'med';
    let label = 'Review suggested line items';
    if (percent >= 75) {
      tone = 'high';
      label = 'High fidelity draft';
    } else if (percent <= 50) {
      tone = 'low';
      label = 'Needs manual review';
    }
    return { percent, tone, label };
  }, [result]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      window.alert('Paste a scope description or meeting notes first.');
      return;
    }
    setLocalBusy(true);
    try {
      await onDraft(trimmed);
    } finally {
      setLocalBusy(false);
    }
  };

  const disabled = isProcessing || localBusy;

  return (
    <div className="ai-intake-panel">
      {showHeader ? (
        <header className="ai-intake-panel__header">
          <div>
            <h2>AI Scope Intake</h2>
            <p className="panel__subtext">
              Paste a scope narrative and let ScopeSmart draft materials, labor, subs, and permit allowances
              automatically.
            </p>
          </div>
          {confidenceMeta ? (
            <div className={`ai-intake-panel__confidence ai-intake-panel__confidence--${confidenceMeta.tone}`}>
              <strong>{confidenceMeta.percent}% match</strong>
              <span>{confidenceMeta.label}</span>
            </div>
          ) : null}
        </header>
      ) : null}

      <form className="ai-intake-panel__form" onSubmit={handleSubmit}>
        <textarea
          className="ai-intake-panel__textarea"
          placeholder="Example: Renovate the 4,200 sf 2-story office. Replace HVAC, rewire lighting, new kitchens and two bathrooms..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="ai-intake-panel__footer">
          <span className="ai-intake-panel__hint">
            Current total: {totalSqFt.toLocaleString(undefined, { maximumFractionDigits: 0 })} {unitLabel}
          </span>
          <div className="ai-intake-panel__actions">
            <button className="button" type="submit" disabled={disabled}>
              {disabled ? 'Drafting...' : 'Draft From Text'}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setText('')}
              disabled={text.length === 0 || disabled}
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {result ? (
        <div className="ai-intake-panel__insights">
          <strong>Draft insights</strong>
          <ul>
            {insights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ai-intake-panel__placeholder">
          Include square footage, number of rooms, scope keywords (demo, HVAC, millwork, etc.), and any known
          site constraints. The estimator will translate that narrative into editable line items.
        </p>
      )}
    </div>
  );
};
