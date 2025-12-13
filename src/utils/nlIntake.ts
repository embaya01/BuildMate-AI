import type { AreaUnit, SubcontractorSpecialty } from '../types';
import { safeUUID } from './calculations';

export interface MaterialRecommendation {
  id: string;
  label: string;
  catalogHints: string[];
  summary: string;
}

export interface LaborDraft {
  id: string;
  name: string;
  rate: number;
  summary: string;
}

export interface SubcontractorRecommendation {
  id: string;
  specialty: SubcontractorSpecialty;
  summary: string;
}

export interface PermitDraft {
  id: string;
  name: string;
  ratePerSqFt: number;
  notes?: string;
}

export interface IntakeDraftResult {
  normalizedText: string;
  detectedSqFt: number | null;
  detectedUnit: AreaUnit;
  derivedSqFt: number;
  materialRecommendations: MaterialRecommendation[];
  laborDraft: LaborDraft[];
  subcontractorRecommendations: SubcontractorRecommendation[];
  permitDraft: PermitDraft[];
  reasoning: string[];
  confidence: number;
}

interface DraftOptions {
  fallbackSqFt?: number;
  defaultUnit?: AreaUnit;
}

const DEFAULT_FALLBACK_SQFT = 1200;
const MATERIAL_RULES = [
  {
    id: 'interior-finish',
    label: 'Interior Finish Package',
    catalogHints: ['drywall', 'finish', 'paint'],
    triggers: ['drywall', 'gypsum', 'paint', 'finish', 'taping', 'wallboard'],
    summary: 'Detected finish keywords (drywall/paint).',
  },
  {
    id: 'flooring',
    label: 'Flooring & Trim',
    catalogHints: ['floor', 'lvt', 'tile'],
    triggers: ['floor', 'lvt', 'tile', 'carpet', 'wood floor'],
    summary: 'Mentioned flooring replacements.',
  },
  {
    id: 'roof',
    label: 'Roof Assembly',
    catalogHints: ['roof'],
    triggers: ['roof', 'roofing', 'membrane', 'torch down'],
    summary: 'Roof scope referenced in the brief.',
  },
  {
    id: 'concrete',
    label: 'Concrete & Structural',
    catalogHints: ['concrete', 'foundation'],
    triggers: ['slab', 'foundation', 'concrete', 'footing', 'structural'],
    summary: 'Structural / concrete keywords detected.',
  },
  {
    id: 'millwork',
    label: 'Millwork & Casework',
    catalogHints: ['millwork', 'casework', 'cabinets'],
    triggers: ['cabinet', 'casework', 'millwork', 'built-in'],
    summary: 'Cabinetry or millwork scope mentioned.',
  },
];

const LABOR_RULES = [
  {
    id: 'general',
    name: 'General Field Crew',
    rate: 14,
    summary: 'Baseline crew applied to overall scope.',
    always: true,
  },
  {
    id: 'finish',
    name: 'Finish Crew',
    rate: 9,
    summary: 'Finish surfaces require a dedicated crew.',
    triggers: ['drywall', 'paint', 'finish', 'trim'],
  },
  {
    id: 'mechanical',
    name: 'Mechanical Crew',
    rate: 11,
    summary: 'Mechanical equipment or HVAC refresh detected.',
    triggers: ['hvac', 'mechanical', 'chiller', 'air handler', 'duct'],
  },
  {
    id: 'electrical',
    name: 'Electrical Crew',
    rate: 10,
    summary: 'Electrical upgrades mentioned.',
    triggers: ['electrical', 'panel', 'lighting', 'switchgear', 'conduit', 'rewire'],
  },
  {
    id: 'plumbing',
    name: 'Plumbing Crew',
    rate: 10.5,
    summary: 'Plumbing fixtures or piping noted.',
    triggers: ['plumb', 'pipe', 'restroom', 'bathroom', 'fixture'],
  },
];

const SUBCONTRACTOR_RULES: Array<{
  id: string;
  specialty: SubcontractorSpecialty;
  summary: string;
  triggers: string[];
}> = [
  {
    id: 'sub-hvac',
    specialty: 'hvac',
    summary: 'Mechanical scope suggests HVAC trade partner.',
    triggers: ['hvac', 'mechanical', 'air handler', 'duct'],
  },
  {
    id: 'sub-electrical',
    specialty: 'electrical',
    summary: 'Electrical keywords detected.',
    triggers: ['electrical', 'panel', 'switchgear', 'lighting', 'rewire'],
  },
  {
    id: 'sub-plumbing',
    specialty: 'plumbing',
    summary: 'Plumbing refresh called out.',
    triggers: ['plumb', 'pipe', 'bathroom', 'fixture', 'restroom'],
  },
  {
    id: 'sub-roof',
    specialty: 'roofing',
    summary: 'Roof replacement signals roofing partner.',
    triggers: ['roof', 'membrane', 'torch down'],
  },
  {
    id: 'sub-finish',
    specialty: 'finish',
    summary: 'Finish carpentry / millwork language detected.',
    triggers: ['millwork', 'casework', 'trim'],
  },
];

const PERMIT_RULES = [
  {
    id: 'interior-renovation',
    name: 'Interior Renovation Permit',
    rate: 1.35,
    notes: 'Assumes typical plan check & inspections.',
    triggers: ['renovation', 'tenant improvement', 'interior build'],
  },
  {
    id: 'structural',
    name: 'Structural Permit Allowance',
    rate: 1.85,
    notes: 'Structural changes increase permit fees.',
    triggers: ['structural', 'addition', 'expansion', 'foundation'],
  },
];

const containsKeyword = (text: string, keyword: string) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
};

export const draftEstimateFromScope = (
  scopeText: string,
  options?: DraftOptions
): IntakeDraftResult => {
  const trimmed = scopeText.trim();
  const normalized = trimmed.replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();
  const defaultUnit: AreaUnit = options?.defaultUnit === 'sq m' ? 'sq m' : 'sq ft';
  const fallbackSqFt = Math.max(options?.fallbackSqFt ?? DEFAULT_FALLBACK_SQFT, 200);

  const areaRegexes: Array<{ regex: RegExp; unit: AreaUnit }> = [
    { regex: /(\d[\d,.]*)\s*(?:sq|square)\s*(?:ft|feet|foot|')/i, unit: 'sq ft' },
    { regex: /(\d[\d,.]*)\s*(?:sf)\b/i, unit: 'sq ft' },
    { regex: /(\d[\d,.]*)\s*(?:sq|square)\s*(?:m|meter|metre|meters|metres)/i, unit: 'sq m' },
  ];

  let detectedSqFt: number | null = null;
  let detectedUnit: AreaUnit = 'sq ft';
  for (const pattern of areaRegexes) {
    const match = lower.match(pattern.regex);
    if (!match) {
      continue;
    }
    const numeric = Number(match[1].replace(/,/g, '').trim());
    if (!Number.isFinite(numeric) || numeric <= 0) {
      continue;
    }
    detectedUnit = pattern.unit;
    detectedSqFt = numeric;
    break;
  }

  const derivedSqFt = (() => {
    if (detectedSqFt === null) {
      return defaultUnit === 'sq m' ? fallbackSqFt * 0.092903 : fallbackSqFt;
    }
    if (detectedUnit === defaultUnit) {
      return detectedSqFt;
    }
    return detectedUnit === 'sq ft'
      ? detectedSqFt * 0.092903
      : detectedSqFt / 0.092903;
  })();

  const materialRecommendations: MaterialRecommendation[] = [];
  const laborDraft: LaborDraft[] = [];
  const subcontractorRecommendations: SubcontractorRecommendation[] = [];
  const permitDraft: PermitDraft[] = [];
  const reasoning: string[] = [];

  const addMaterial = (ruleId: string, label: string, hints: string[], summary: string) => {
    if (materialRecommendations.some((entry) => entry.id === ruleId)) {
      return;
    }
    materialRecommendations.push({
      id: ruleId,
      label,
      catalogHints: hints,
      summary,
    });
    reasoning.push(summary);
  };

  const addLabor = (ruleId: string, name: string, rate: number, summary: string) => {
    if (laborDraft.some((entry) => entry.id === ruleId)) {
      return;
    }
    laborDraft.push({ id: ruleId, name, rate, summary });
    reasoning.push(summary);
  };

  const addSub = (ruleId: string, specialty: SubcontractorSpecialty, summary: string) => {
    if (subcontractorRecommendations.some((entry) => entry.id === ruleId)) {
      return;
    }
    subcontractorRecommendations.push({ id: ruleId, specialty, summary });
    reasoning.push(summary);
  };

  const addPermit = (ruleId: string, name: string, rate: number, notes?: string) => {
    if (permitDraft.some((entry) => entry.id === ruleId)) {
      return;
    }
    permitDraft.push({ id: ruleId, name, ratePerSqFt: rate, notes });
    reasoning.push(name + ' allowance added.');
  };

  for (const rule of MATERIAL_RULES) {
    if (rule.triggers.some((keyword) => containsKeyword(lower, keyword))) {
      addMaterial(rule.id, rule.label, rule.catalogHints, rule.summary);
    }
  }

  for (const rule of LABOR_RULES) {
    if (rule.always) {
      addLabor(rule.id, rule.name, rule.rate, rule.summary);
      continue;
    }
    if (rule.triggers?.some((keyword) => containsKeyword(lower, keyword))) {
      addLabor(rule.id, rule.name, rule.rate, rule.summary);
    }
  }

  for (const rule of SUBCONTRACTOR_RULES) {
    if (rule.triggers.some((keyword) => containsKeyword(lower, keyword))) {
      addSub(rule.id, rule.specialty, rule.summary);
    }
  }

  for (const rule of PERMIT_RULES) {
    if (rule.triggers.some((keyword) => containsKeyword(lower, keyword))) {
      addPermit(rule.id, rule.name, rule.rate, rule.notes);
    }
  }

  if (!permitDraft.length) {
    addPermit('baseline-permit', 'Plan Check & Permits', 0.85, 'Baseline municipal allowances.');
  }

  const kitchenMatches = lower.match(/kitchen/g);
  const bathMatches = lower.match(/bath(room)?/g);
  if (kitchenMatches?.length) {
    addMaterial('kitchen', 'Kitchen Upgrade Package', ['kitchen', 'casework', 'counter'], 'Kitchen scope surfaced.');
    reasoning.push(`Detected ${kitchenMatches.length} kitchen reference(s).`);
  }
  if (bathMatches?.length) {
    addLabor('bath-specialty', 'Plumbing Fixture Crew', 10.2, 'Bathrooms drive plumbing labor assumptions.');
    reasoning.push(`Detected ${bathMatches.length} bath reference(s).`);
  }

  const matchCount = materialRecommendations.length + laborDraft.length + subcontractorRecommendations.length;
  let confidence = 0.35 + Math.min(0.45, matchCount * 0.06);
  if (detectedSqFt) {
    confidence += 0.15;
  }
  if (kitchenMatches || bathMatches) {
    confidence += 0.05;
  }
  confidence = Math.min(0.95, confidence);

  const normalizedPermits = permitDraft.map((entry) => ({
    ...entry,
    id: entry.id || 'permit-' + safeUUID(),
  }));

  return {
    normalizedText: normalized,
    detectedSqFt,
    detectedUnit,
    derivedSqFt,
    materialRecommendations,
    laborDraft,
    subcontractorRecommendations,
    permitDraft: normalizedPermits,
    reasoning,
    confidence,
  };
};

