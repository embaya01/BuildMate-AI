import { useMemo, useState } from 'react';
import type { PlanExtractionResult } from '../utils/planExtraction';

interface PlanExtractionPanelProps {
  result: PlanExtractionResult | null;
  onAnalyze: (files: File[], notes: string) => Promise<void> | void;
  onApply: () => void;
  isProcessing?: boolean;
  showHeader?: boolean;
}

export const PlanExtractionPanel = ({
  result,
  onAnalyze,
  onApply,
  isProcessing = false,
  showHeader = true,
}: PlanExtractionPanelProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    } else {
      setFiles([]);
    }
  };

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    const payloadFiles = files;
    if (!payloadFiles.length && notes.trim().length === 0) {
      window.alert('Upload at least one plan file or add quick notes before analyzing.');
      return;
    }
    setBusy(true);
    try {
      await onAnalyze(payloadFiles, notes);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setNotes('');
  };

  const disabled = busy || isProcessing;
  const analyzedSummary = useMemo(() => {
    if (!result) {
      return null;
    }
    return {
      area: result.derivedSqFt,
      floors: result.detectedFloors,
      missingScopes: result.missingScopes,
      files: result.analyzedFiles,
    };
  }, [result]);

  return (
    <div className="plan-extraction-panel">
      {showHeader ? (
        <header className="plan-extraction-panel__header">
          <div>
            <h2>Plan & Photo Extraction</h2>
            <p className="panel__subtext">
              Drop PDF plans, elevations, or site photos. ScopeSmart will scan file names and embedded notes to
              estimate footprint, rooms, and missing allowances.
            </p>
          </div>
          {result ? (
            <div className="plan-extraction-panel__pill">
              <strong>{result.derivedSqFt.toLocaleString()} sq ft</strong>
              <span>Draft footprint</span>
            </div>
          ) : null}
        </header>
      ) : null}

      <form className="plan-extraction-panel__form" onSubmit={handleAnalyze}>
        <label className="plan-extraction-panel__upload">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,image/*"
            multiple
            onChange={handleFileChange}
            disabled={disabled}
          />
          <span>
            {files.length > 0 ? `${files.length} file(s) selected` : 'Attach plan PDFs or photos'}
          </span>
        </label>
        {files.length > 0 ? (
          <ul className="plan-extraction-panel__files">
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        ) : null}
        <textarea
          className="plan-extraction-panel__notes"
          placeholder="Optional notes: ceiling heights, key rooms, structural systems, site constraints..."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={disabled}
        />
        <div className="plan-extraction-panel__actions">
          <button className="button" type="submit" disabled={disabled}>
            {disabled ? 'Analyzing...' : 'Analyze Plans'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleClear}
            disabled={disabled || (notes.length === 0 && files.length === 0)}
          >
            Clear
          </button>
          <div className="plan-extraction-panel__apply">
            <button
              type="button"
              className="button button--ghost"
              onClick={onApply}
              disabled={!result}
            >
              Apply to Estimate
            </button>
          </div>
        </div>
      </form>

      {analyzedSummary ? (
        <div className="plan-extraction-panel__insights">
          <div>
            <strong>Detected footprint</strong>
            <p>{analyzedSummary.area.toLocaleString()} sq ft</p>
          </div>
          {analyzedSummary.floors ? (
            <div>
              <strong>Floors</strong>
              <p>{analyzedSummary.floors}</p>
            </div>
          ) : null}
          {analyzedSummary.missingScopes.length ? (
            <div className="plan-extraction-panel__missing">
              <strong>Potential gaps</strong>
              <ul>
                {analyzedSummary.missingScopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {analyzedSummary.files.length ? (
            <div className="plan-extraction-panel__files-summary">
              <strong>Files scanned</strong>
              <ul>
                {analyzedSummary.files.map((file) => (
                  <li key={file.name}>
                    {file.name} <span>{file.sizeLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="plan-extraction-panel__placeholder">
          Upload level plans, reflected ceiling plans, or annotated photos. ScopeSmart will infer square footage,
          floors, and suggest materials/labor tied to your catalog for a faster kickoff.
        </p>
      )}
    </div>
  );
};
