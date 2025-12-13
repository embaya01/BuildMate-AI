import type { AreaUnit } from '../types';
import {
  draftEstimateFromScope,
  type IntakeDraftResult,
} from './nlIntake';

export interface PlanExtractionFileSummary {
  name: string;
  sizeLabel: string;
}

export interface PlanExtractionResult extends IntakeDraftResult {
  detectedFloors: number | null;
  missingScopes: string[];
  analyzedFiles: PlanExtractionFileSummary[];
}

interface ExtractionOptions {
  defaultUnit?: AreaUnit;
}

const formatSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'unknown';
  }
  if (bytes < 1024) {
    return bytes.toFixed(0) + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const readFileSafely = async (file: File) => {
  try {
    return await file.text();
  } catch (error) {
    console.warn('Could not read plan file', file.name, error);
    return '';
  }
};

const extractDimensionsArea = (input: string) => {
  const pattern = /(\d{2,5})\s*[x×]\s*(\d{2,5})/gi;
  let match: RegExpExecArray | null;
  let best = 0;
  while ((match = pattern.exec(input)) !== null) {
    const width = Number(match[1].replace(/,/g, ''));
    const height = Number(match[2].replace(/,/g, ''));
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      continue;
    }
    const area = width * height;
    if (area > best) {
      best = area;
    }
  }
  return best;
};

const extractAreaFromText = (input: string) => {
  const patterns = [
    { regex: /(\d[\d,.]*)\s*(?:sq|square)\s*(?:ft|feet|foot|')/gi, multiplier: 1 },
    { regex: /(\d[\d,.]*)\s*(?:sf)\b/gi, multiplier: 1 },
    { regex: /(\d[\d,.]*)\s*(?:sq|square)\s*(?:m|meters|metres|meter|metre)/gi, multiplier: 10.7639 },
  ];
  let best = 0;
  for (const { regex, multiplier } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      const value = Number(match[1].replace(/,/g, ''));
      if (!Number.isFinite(value)) {
        continue;
      }
      const area = value * multiplier;
      if (area > best) {
        best = area;
      }
    }
  }
  return best;
};

const detectFloors = (input: string) => {
  const match = input.match(/(\d+)\s*(?:story|storey|stories|floor|floors|level|levels)/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const deriveMissingScopes = (input: string, floors: number | null) => {
  const lower = input.toLowerCase();
  const missing: string[] = [];
  if (!lower.match(/permit|plan\s*check|inspection/)) {
    missing.push('Permit & inspection allowances');
  }
  if (!lower.match(/landscape|sitework|grading|parking/)) {
    missing.push('Sitework / landscaping allowances');
  }
  if (floors && floors > 1 && !lower.match(/elevator|lift|stair/)) {
    missing.push('Vertical circulation (stairs/elevator) scope');
  }
  if (!lower.match(/ada|accessible|universal design/)) {
    missing.push('Accessibility / ADA compliance items');
  }
  return missing;
};

export const extractPlanInsights = async (
  files: File[],
  notes: string,
  options?: ExtractionOptions
): Promise<PlanExtractionResult> => {
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const text = await readFileSafely(file);
      return {
        file,
        text,
        summary: `${file.name} (${formatSize(file.size)})`,
      };
    })
  );
  const combinedNames = fileContents.map((entry) => entry.file.name.replace(/[_-]/g, ' ')).join(' ');
  const combinedTexts = fileContents.map((entry) => entry.text.slice(0, 8000)).join(' ');
  const aggregateText = [notes, combinedNames, combinedTexts].filter(Boolean).join(' ');

  const dimensionArea = extractDimensionsArea(aggregateText);
  const textualArea = extractAreaFromText(aggregateText);
  const derivedSqFt = Math.max(dimensionArea, textualArea, 0) || 2500;
  const floors = detectFloors(aggregateText);
  const missingScopes = deriveMissingScopes(aggregateText, floors);

  const syntheticNotes: string[] = [];
  if (dimensionArea > 0) {
    syntheticNotes.push(`Footprint derived from plans roughly ${dimensionArea.toFixed(0)} sq ft.`);
  }
  if (floors) {
    syntheticNotes.push(`Structure spans ${floors} floors in total.`);
  }
  const analysisPayload = [aggregateText, syntheticNotes.join(' ')].filter(Boolean).join(' ');

  const draft = draftEstimateFromScope(analysisPayload, {
    defaultUnit: options?.defaultUnit ?? 'sq ft',
    fallbackSqFt: derivedSqFt,
  });

  return {
    ...draft,
    derivedSqFt,
    detectedFloors: floors,
    missingScopes,
    analyzedFiles: fileContents.map((entry) => ({
      name: entry.file.name,
      sizeLabel: formatSize(entry.file.size),
    })),
  };
};

