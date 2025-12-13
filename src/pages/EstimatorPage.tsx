import { useEffect, useMemo, useState } from 'react';
import '../App.css';
import { useAuth } from '../context/AuthContext';
import { useUserCollection } from '../hooks/useUserCollection';
import { saveEstimate, removeEstimate, getUserProfile } from '../utils/firestoreHelpers';
import { CategorySection } from '../components/CategorySection';
import { MaterialsSection } from '../components/MaterialsSection';
import { LaborSection } from '../components/LaborSection';
import { EquipmentSection } from '../components/EquipmentSection';
import { PermitsSection } from '../components/PermitsSection';
import { SubcontractorSection } from '../components/SubcontractorSection';
import { SummaryPanel } from '../components/SummaryPanel';
import { NLIntakePanel } from '../components/NLIntakePanel';
import { generateEstimatePdf } from '../utils/pdfExport';
import type {
  CostCategoryKey,
  CostItem,
  CostSettings,
  AreaUnit,
  EstimatorState,
  LegacyProjectDetails,
  ProjectDocument,
  EstimateDocument,
  MaterialCategoryDocument,
  EquipmentMode,
  PermitsMode,
  PermitEntry,
  SubcontractorDocument,
} from '../types';
import {
  CATEGORY_LABELS,
  calculateCategoryTotals,
  calculateFinancials,
  formatCurrency,
  getDefaultCategoryMap,
  safeUUID,
} from '../utils/calculations';
import {
  draftEstimateFromScope,
  type IntakeDraftResult,
  type LaborDraft as LaborDraftSuggestion,
  type MaterialRecommendation,
  type PermitDraft as PermitDraftSuggestion,
  type SubcontractorRecommendation,
} from '../utils/nlIntake';
import { PlanExtractionPanel } from '../components/PlanExtractionPanel';
import { extractPlanInsights, type PlanExtractionResult } from '../utils/planExtraction';
import { getSubcontractorSpecialtyLabel } from '../utils/subcontractors';

const STORAGE_KEY = 'scopesmart-estimator-state-v1';
const DEFAULT_AREA_UNIT: AreaUnit = 'sq ft';
const SQ_FT_TO_SQ_M = 0.092903;

const convertAreaValue = (value: number, fromUnit: AreaUnit, toUnit: AreaUnit) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (fromUnit === toUnit) {
    return value;
  }
  return fromUnit === 'sq ft' ? value * SQ_FT_TO_SQ_M : value / SQ_FT_TO_SQ_M;
};

const convertRateValue = (value: number, fromUnit: AreaUnit, toUnit: AreaUnit) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (fromUnit === toUnit) {
    return value;
  }
  return fromUnit === 'sq ft' ? value / SQ_FT_TO_SQ_M : value * SQ_FT_TO_SQ_M;
};

const defaultSettings: CostSettings = {
  taxRate: 8.75,
  profitMargin: 12,
  contingency: 5,
  overhead: 10,
};

const createDefaultState = (): EstimatorState => {
  const categories = getDefaultCategoryMap();
  categories.labor = [
    {
      id: PRIMARY_LABOR_ID,
      name: 'Primary Constructor',
      unit: DEFAULT_AREA_UNIT,
      quantity: 0,
      unitCost: 0,
    },
  ];
  categories.equipment = [];
  return {
    selectedProjectId: null,
    categories,
    settings: { ...defaultSettings },
    legacyProject: null,
    totalSqFt: 0,
    areaUnit: DEFAULT_AREA_UNIT,
    selectedMaterialCategoryIds: [],
    selectedSubcontractorIds: [],
    equipmentMode: 'itemized',
    equipmentSingleTotal: 0,
    equipmentItemizedCache: [],
    permitsMode: 'itemized',
    permitsSingleRate: 0,
    permitsItemizedCache: [],
  };
};

const PRIMARY_LABOR_ID = 'labor-primary';
const EQUIPMENT_SINGLE_ID = 'equipment-single-total';
const PERMITS_SINGLE_ID = 'permits-single-rate';

const allCategoryKeys: CostCategoryKey[] = [
  'materials',
  'labor',
  'equipment',
  'subcontractors',
  'permits',
];

const editableCategoryKeys: CostCategoryKey[] = allCategoryKeys.filter(
  (key) => key !== 'materials' && key !== 'labor' && key !== 'equipment' && key !== 'subcontractors'
);

const sanitizeItem = (item: Partial<CostItem>): CostItem => ({
  id: typeof item.id === 'string' && item.id.length > 0 ? item.id : safeUUID(),
  name: typeof item.name === 'string' ? item.name : '',
  description: typeof item.description === 'string' ? item.description : '',
  unit: typeof item.unit === 'string' ? item.unit : '',
  quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
  unitCost: Number.isFinite(Number(item.unitCost)) ? Number(item.unitCost) : 0,
});

const sanitizeLegacyProject = (input: unknown): LegacyProjectDetails | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const value = input as Partial<LegacyProjectDetails>;
  const legacy: LegacyProjectDetails = {};

  const projectName =
    typeof value.projectName === 'string' && value.projectName.trim().length > 0
      ? value.projectName.trim()
      : undefined;
  const clientName =
    typeof value.clientName === 'string' && value.clientName.trim().length > 0
      ? value.clientName.trim()
      : undefined;
  const location =
    typeof value.location === 'string' && value.location.trim().length > 0
      ? value.location.trim()
      : undefined;
  const startDate =
    typeof value.startDate === 'string' && value.startDate.trim().length > 0
      ? value.startDate.trim()
      : undefined;
  const endDate =
    typeof value.endDate === 'string' && value.endDate.trim().length > 0
      ? value.endDate.trim()
      : undefined;
  const notes =
    typeof value.notes === 'string' && value.notes.trim().length > 0 ? value.notes.trim() : undefined;

  if (projectName) {
    legacy.projectName = projectName;
  }
  if (clientName) {
    legacy.clientName = clientName;
  }
  if (location) {
    legacy.location = location;
  }
  if (startDate) {
    legacy.startDate = startDate;
  }
  if (endDate) {
    legacy.endDate = endDate;
  }
  if (notes) {
    legacy.notes = notes;
  }

  return Object.keys(legacy).length > 0 ? legacy : null;
};

const buildMaterialItems = (
  selectedIds: string[],
  totalSqFt: number,
  categories: Array<MaterialCategoryDocument & { id: string }>,
  unit: AreaUnit
) => {
  const safeSqFt = Number.isFinite(totalSqFt) ? Math.max(0, totalSqFt) : 0;
  if (!selectedIds.length || categories.length === 0) {
    return { validIds: [], items: [] };
  }

  const lookup = new Map<string, MaterialCategoryDocument & { id: string }>();
  for (const category of categories) {
    lookup.set(category.id, category);
  }

  const validIds: string[] = [];
  const items: CostItem[] = [];

  for (const rawId of selectedIds) {
    if (typeof rawId !== 'string' || rawId.trim().length === 0) {
      continue;
    }
    const trimmed = rawId.trim();
    const category = lookup.get(trimmed);
    if (!category) {
      continue;
    }

    const unitCost = Number.isFinite(Number(category.unitCostPerSqFt))
      ? Number(category.unitCostPerSqFt)
      : 0;
    const description = category.formula ?? category.description ?? undefined;

    items.push({
      id: 'material-' + category.id,
      name: category.name,
      description: description,
      unit,
      quantity: safeSqFt,
      unitCost,
    });
    validIds.push(category.id);
  }

  return { validIds, items };
};

const buildSubcontractorItems = (
  selectedIds: string[],
  totalSqFt: number,
  subcontractors: Array<SubcontractorDocument & { id: string }>,
  unit: AreaUnit
) => {
  const safeSqFt = Number.isFinite(totalSqFt) ? Math.max(0, totalSqFt) : 0;
  if (!selectedIds.length || subcontractors.length === 0) {
    return { validIds: [], items: [] };
  }

  const lookup = new Map<string, SubcontractorDocument & { id: string }>();
  for (const subcontractor of subcontractors) {
    lookup.set(subcontractor.id, subcontractor);
  }

  const validIds: string[] = [];
  const items: CostItem[] = [];

  for (const rawId of selectedIds) {
    if (typeof rawId !== 'string' || rawId.trim().length === 0) {
      continue;
    }
    const trimmed = rawId.trim();
    const subcontractor = lookup.get(trimmed);
    if (!subcontractor) {
      continue;
    }

    const rate = Number.isFinite(Number(subcontractor.pricePerSqFt))
      ? Number(subcontractor.pricePerSqFt)
      : 0;
    const specialtyLabel = getSubcontractorSpecialtyLabel(subcontractor.specialty);

    items.push({
      id: 'subcontractor-' + subcontractor.id,
      name: subcontractor.name,
      description: specialtyLabel,
      unit,
      quantity: safeSqFt,
      unitCost: rate,
    });
    validIds.push(subcontractor.id);
  }

  return { validIds, items };
};

const sanitizePermitEntries = (input: unknown): PermitEntry[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  const entries: PermitEntry[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const candidate = raw as Partial<PermitEntry> & { id?: string };
    const id =
      typeof candidate.id === 'string' && candidate.id.trim().length > 0 ? candidate.id.trim() : null;
    const name =
      typeof candidate.name === 'string' && candidate.name.trim().length > 0
        ? candidate.name.trim()
        : null;
    const rate = Number(candidate.ratePerSqFt);
    if (!id || !name || !Number.isFinite(rate) || rate < 0) {
      continue;
    }
    entries.push({
      id,
      name,
      ratePerSqFt: rate,
      notes:
        typeof candidate.notes === 'string' && candidate.notes.trim().length > 0
          ? candidate.notes.trim()
          : null,
    });
  }
  return entries;
};

const derivePermitEntriesFromItems = (items: CostItem[]): PermitEntry[] => {
  return items.map((item) => ({
    id: item.id || 'permit-' + safeUUID(),
    name: item.name || 'Permit',
    ratePerSqFt: Number.isFinite(item.unitCost) && item.unitCost >= 0 ? item.unitCost : 0,
  }));
};

const buildPermitItems = (entries: PermitEntry[], totalSqFt: number, unit: AreaUnit): CostItem[] => {
  const safeSqFt = Number.isFinite(totalSqFt) ? Math.max(0, totalSqFt) : 0;
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.notes ?? '',
    unit,
    quantity: safeSqFt,
    unitCost: Number.isFinite(entry.ratePerSqFt) && entry.ratePerSqFt >= 0 ? entry.ratePerSqFt : 0,
  }));
};

const convertPermitDraftsToEntries = (drafts: PermitDraftSuggestion[]): PermitEntry[] => {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return [];
  }
  return drafts.map((draft) => ({
    id: draft.id || 'permit-' + safeUUID(),
    name: draft.name,
    ratePerSqFt: Number.isFinite(draft.ratePerSqFt) && draft.ratePerSqFt >= 0 ? draft.ratePerSqFt : 0,
    notes: draft.notes ?? null,
  }));
};

const tokenize = (input?: string | null) => {
  if (!input) {
    return [] as string[];
  }
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
};

const matchMaterialRecommendations = (
  recommendations: MaterialRecommendation[],
  catalog: Array<MaterialCategoryDocument & { id: string }>
) => {
  if (!recommendations.length || catalog.length === 0) {
    return [] as string[];
  }
  const catalogIndex = catalog.map((entry) => {
    const tokens = [
      ...tokenize(entry.name),
      ...tokenize(entry.description ?? ''),
      ...tokenize(entry.formula ?? ''),
    ];
    return {
      id: entry.id,
      tokens,
      tokenSet: new Set(tokens),
    };
  });

  const matches: string[] = [];
  for (const recommendation of recommendations) {
    const hintTokens = [
      ...tokenize(recommendation.label),
      ...recommendation.catalogHints.flatMap((hint) => tokenize(hint)),
    ];

    let bestMatch: { id: string; score: number } | null = null;
    for (const entry of catalogIndex) {
      let score = 0;
      for (const token of hintTokens) {
        if (entry.tokenSet.has(token)) {
          score += 2;
          continue;
        }
        if (entry.tokens.some((value) => value.startsWith(token) || token.startsWith(value))) {
          score += 1;
        }
      }
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: entry.id, score };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch.id);
    }
  }

  return Array.from(new Set(matches));
};

const matchSubcontractorRecommendations = (
  recommendations: SubcontractorRecommendation[],
  docs: Array<SubcontractorDocument & { id: string }>
) => {
  if (!recommendations.length || docs.length === 0) {
    return [] as string[];
  }
  const matches: string[] = [];
  for (const recommendation of recommendations) {
    const doc = docs.find((entry) => entry.specialty === recommendation.specialty);
    if (doc) {
      matches.push(doc.id);
    }
  }
  return Array.from(new Set(matches));
};

const buildLaborItemsFromDraft = (
  draftEntries: LaborDraftSuggestion[],
  totalSqFt: number,
  unit: AreaUnit,
  fallbackName: string
) => {
  const baseEntries =
    draftEntries.length > 0
      ? draftEntries
      : [{ id: 'general-fallback', name: fallbackName, rate: 0, summary: 'General labor baseline.' }];
  const safeSqFt = Number.isFinite(totalSqFt) && totalSqFt >= 0 ? totalSqFt : 0;
  return baseEntries.map((entry, index) => ({
    id: index === 0 ? PRIMARY_LABOR_ID : 'labor-' + safeUUID(),
    name: (index === 0 ? entry.name || fallbackName : entry.name || 'Crew Member').trim(),
    description: entry.summary,
    unit,
    quantity: safeSqFt,
    unitCost: Number.isFinite(entry.rate) && entry.rate >= 0 ? entry.rate : 0,
  }));
};

interface DraftRecommendationPayload {
  derivedSqFt: number;
  materialRecommendations: MaterialRecommendation[];
  laborDraft: LaborDraftSuggestion[];
  subcontractorRecommendations: SubcontractorRecommendation[];
  permitDraft: PermitDraftSuggestion[];
}

const applyDraftRecommendations = (
  prev: EstimatorState,
  payload: DraftRecommendationPayload,
  materialCategories: Array<MaterialCategoryDocument & { id: string }>,
  subcontractorDocs: Array<SubcontractorDocument & { id: string }>,
  unit: AreaUnit,
  primaryLaborName: string
): EstimatorState => {
  const nextTotalSqFt = Math.max(0, Math.round(payload.derivedSqFt));
  const matchedMaterialIds = matchMaterialRecommendations(payload.materialRecommendations, materialCategories);
  const materialData = buildMaterialItems(matchedMaterialIds, nextTotalSqFt, materialCategories, unit);
  const matchedSubIds = matchSubcontractorRecommendations(payload.subcontractorRecommendations, subcontractorDocs);
  const subcontractorData = buildSubcontractorItems(matchedSubIds, nextTotalSqFt, subcontractorDocs, unit);
  const permitEntries = convertPermitDraftsToEntries(payload.permitDraft);
  const permits =
    permitEntries.length > 0 ? buildPermitItems(permitEntries, nextTotalSqFt, unit) : prev.categories.permits;
  const laborFromDraft = buildLaborItemsFromDraft(payload.laborDraft, nextTotalSqFt, unit, primaryLaborName);
  const normalizedLabor = normalizeLaborItems(laborFromDraft, nextTotalSqFt, primaryLaborName, unit);

  return {
    ...prev,
    totalSqFt: nextTotalSqFt,
    selectedMaterialCategoryIds:
      materialData.validIds.length > 0 ? materialData.validIds : prev.selectedMaterialCategoryIds,
    selectedSubcontractorIds:
      subcontractorData.validIds.length > 0 ? subcontractorData.validIds : prev.selectedSubcontractorIds,
    permitsMode: 'itemized',
    permitsItemizedCache: permitEntries.length > 0 ? permitEntries : prev.permitsItemizedCache,
    categories: {
      ...prev.categories,
      materials: materialData.validIds.length > 0 ? materialData.items : prev.categories.materials,
      labor: normalizedLabor.items,
      subcontractors:
        subcontractorData.validIds.length > 0 ? subcontractorData.items : prev.categories.subcontractors,
      permits,
    },
  };
};

const makePermitSingleItem = (rate: number, totalSqFt: number, unit: AreaUnit): CostItem => ({
  id: PERMITS_SINGLE_ID,
  name: 'Permits & Fees (Total)',
  description: '',
  unit,
  quantity: Number.isFinite(totalSqFt) && totalSqFt >= 0 ? totalSqFt : 0,
  unitCost: Math.max(0, Number.isFinite(rate) ? rate : 0),
});

const applyPermitsConfiguration = (state: EstimatorState) => {
  if (state.permitsMode === 'single') {
    state.categories.permits = [makePermitSingleItem(state.permitsSingleRate, state.totalSqFt, state.areaUnit)];
  } else {
    state.categories.permits = buildPermitItems(state.permitsItemizedCache, state.totalSqFt, state.areaUnit);
  }
};

const areCostItemsEqual = (a: CostItem[], b: CostItem[]): boolean => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const current = a[index];
    const next = b[index];
    if (!next) {
      return false;
    }
    if (current.id !== next.id) {
      return false;
    }
    if (current.name !== next.name) {
      return false;
    }
    if ((current.description ?? '') !== (next.description ?? '')) {
      return false;
    }
    if ((current.unit ?? '') !== (next.unit ?? '')) {
      return false;
    }
    if (current.quantity !== next.quantity) {
      return false;
    }
    if (current.unitCost !== next.unitCost) {
      return false;
    }
  }
  return true;
};

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
};

const sanitizeEquipmentMode = (input: unknown): EquipmentMode => {
  return input === 'single' ? 'single' : 'itemized';
};

const makeEquipmentSingleItem = (total: number): CostItem => ({
  id: EQUIPMENT_SINGLE_ID,
  name: 'Equipment (Total)',
  description: '',
  unit: 'total',
  quantity: 1,
  unitCost: Math.max(0, Number.isFinite(total) ? total : 0),
});

const cloneItems = (items: CostItem[]): CostItem[] => items.map((item) => ({ ...item }));

const sanitizeEquipmentCache = (input: unknown): CostItem[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.map(sanitizeItem);
};

const applyEquipmentConfiguration = (state: EstimatorState) => {
  if (state.equipmentMode === 'itemized') {
    const baseItems =
      state.equipmentItemizedCache.length > 0
        ? state.equipmentItemizedCache
        : state.categories.equipment.filter((item) => item.id !== EQUIPMENT_SINGLE_ID);
    state.equipmentItemizedCache = baseItems.map((item) => sanitizeItem(item));
    state.categories.equipment = cloneItems(state.equipmentItemizedCache);
  } else {
    const fallbackItems = state.categories.equipment.filter((item) => item.id !== EQUIPMENT_SINGLE_ID);
    if (fallbackItems.length > 0) {
      state.equipmentItemizedCache = cloneItems(fallbackItems);
    } else if (state.equipmentItemizedCache.length > 0) {
      state.equipmentItemizedCache = cloneItems(state.equipmentItemizedCache);
    } else {
      state.equipmentItemizedCache = [];
    }
    state.categories.equipment = [makeEquipmentSingleItem(state.equipmentSingleTotal)];
  }
};

const normalizeLaborItems = (
  laborItems: CostItem[],
  totalSqFt: number,
  primaryName: string,
  unit: AreaUnit,
  defaultRate?: number
): { items: CostItem[]; changed: boolean } => {
  const safeSqFt = Number.isFinite(totalSqFt) && totalSqFt >= 0 ? totalSqFt : 0;
  const updated: CostItem[] = [];
  let primaryItem: CostItem | null = null;

  for (const item of laborItems) {
    const trimmedName = item.name?.trim() ?? '';
    const isPrimary = item.id === PRIMARY_LABOR_ID;
    const nextItem: CostItem = {
      ...item,
      id: item.id || (isPrimary ? PRIMARY_LABOR_ID : 'labor-' + safeUUID()),
      name: isPrimary ? trimmedName || primaryName : trimmedName || 'Crew Member',
      unit,
      quantity: safeSqFt,
      unitCost: Number.isFinite(item.unitCost) && item.unitCost >= 0 ? item.unitCost : 0,
    };
    if (isPrimary) {
      primaryItem = nextItem;
    } else {
      updated.push(nextItem);
    }
  }

  if (!primaryItem) {
    primaryItem = {
      id: PRIMARY_LABOR_ID,
      name: primaryName,
      unit,
      quantity: safeSqFt,
      unitCost: defaultRate !== undefined && defaultRate >= 0 ? defaultRate : 0,
    };
  } else {
    const primaryRate = defaultRate !== undefined && defaultRate >= 0 ? defaultRate : primaryItem.unitCost;
    primaryItem = {
      ...primaryItem,
      name: primaryItem.name?.trim() || primaryName,
      unit,
      unitCost: primaryRate,
    };
  }

  const normalized = [
    primaryItem,
    ...updated.map((item) => ({
      ...item,
      unit,
    })),
  ];
  const changed = !areCostItemsEqual(normalized, laborItems);
  return { items: normalized, changed };
};
const sanitizeState = (payload: Partial<EstimatorState> | null | undefined): EstimatorState => {
  const next = createDefaultState();
  if (!payload) {
    return next;
  }

  if (payload.categories) {
    for (const key of allCategoryKeys) {
      const incoming = payload.categories[key];
      next.categories[key] = Array.isArray(incoming) ? incoming.map(sanitizeItem) : [];
    }
  }

  if (payload.settings) {
    next.settings = {
      taxRate: Number.isFinite(Number(payload.settings.taxRate))
        ? Number(payload.settings.taxRate)
        : defaultSettings.taxRate,
      profitMargin: Number.isFinite(Number(payload.settings.profitMargin))
        ? Number(payload.settings.profitMargin)
        : defaultSettings.profitMargin,
      contingency: Number.isFinite(Number(payload.settings.contingency))
        ? Number(payload.settings.contingency)
        : defaultSettings.contingency,
      overhead: Number.isFinite(Number(payload.settings.overhead))
        ? Number(payload.settings.overhead)
        : defaultSettings.overhead,
    };
  }

  if (typeof payload.selectedProjectId === 'string') {
    const trimmed = payload.selectedProjectId.trim();
    next.selectedProjectId = trimmed.length > 0 ? trimmed : null;
  } else if (payload.selectedProjectId === null) {
    next.selectedProjectId = null;
  }

  const legacySource =
    (payload as { legacyProject?: LegacyProjectDetails | null }).legacyProject ??
    (payload as { project?: unknown }).project;
  const legacy = sanitizeLegacyProject(legacySource);
  if (legacy) {
    next.legacyProject = legacy;
  }

  if (typeof payload.totalSqFt === 'number' && Number.isFinite(payload.totalSqFt)) {
    next.totalSqFt = Math.max(0, Number(payload.totalSqFt));
  } else {
    const fallback = (payload as unknown as { totalSquareFeet?: number }).totalSquareFeet;
    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      next.totalSqFt = Math.max(0, fallback);
    }
  }
  if (!Number.isFinite(next.totalSqFt)) {
    next.totalSqFt = 0;
  }

  const rawAreaUnit = (payload as { areaUnit?: AreaUnit }).areaUnit;
  if (rawAreaUnit === 'sq m' || rawAreaUnit === 'sq ft') {
    next.areaUnit = rawAreaUnit;
  }

  const rawMaterialSelected =
    (payload as unknown as { selectedMaterialCategoryIds?: unknown }).selectedMaterialCategoryIds;
  if (Array.isArray(rawMaterialSelected)) {
    const filtered = rawMaterialSelected
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((value) => value.length > 0);
    next.selectedMaterialCategoryIds = Array.from(new Set(filtered));
  }

  const rawSubcontractorSelected =
    (payload as unknown as { selectedSubcontractorIds?: unknown }).selectedSubcontractorIds;
  if (Array.isArray(rawSubcontractorSelected)) {
    const filtered = rawSubcontractorSelected
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((value) => value.length > 0);
    next.selectedSubcontractorIds = Array.from(new Set(filtered));
  } else if (next.categories.subcontractors.length > 0) {
    const derived = next.categories.subcontractors
      .map((item) => (typeof item.id === 'string' && item.id.startsWith('subcontractor-') ? item.id.replace('subcontractor-', '') : null))
      .filter((value): value is string => Boolean(value));
    if (derived.length > 0) {
      next.selectedSubcontractorIds = Array.from(new Set(derived));
    }
  }

  const rawPermitsMode = (payload as { permitsMode?: PermitsMode }).permitsMode;
  next.permitsMode = rawPermitsMode === 'single' ? 'single' : 'itemized';

  const rawPermitsRate = Number((payload as { permitsSingleRate?: number }).permitsSingleRate);
  next.permitsSingleRate = Number.isFinite(rawPermitsRate) && rawPermitsRate >= 0 ? rawPermitsRate : 0;

  const permitsCacheSource = sanitizePermitEntries(
    (payload as { permitsItemizedCache?: unknown }).permitsItemizedCache
  );
  if (permitsCacheSource.length > 0) {
    next.permitsItemizedCache = permitsCacheSource;
  } else if (next.permitsMode === 'itemized') {
    next.permitsItemizedCache = derivePermitEntriesFromItems(next.categories.permits);
  } else {
    next.permitsItemizedCache = [];
  }

  if (next.permitsMode === 'single' && next.permitsSingleRate === 0 && next.categories.permits.length > 0) {
    const permitItem = next.categories.permits[0];
    const derivedRate = Number(permitItem?.unitCost ?? 0);
    if (Number.isFinite(derivedRate) && derivedRate >= 0) {
      next.permitsSingleRate = derivedRate;
    }
  }

  const rawEquipmentMode = (payload as { equipmentMode?: EquipmentMode }).equipmentMode;
  next.equipmentMode = sanitizeEquipmentMode(rawEquipmentMode);

  const rawEquipmentSingle = Number((payload as { equipmentSingleTotal?: number }).equipmentSingleTotal);
  next.equipmentSingleTotal = Number.isFinite(rawEquipmentSingle) && rawEquipmentSingle >= 0 ? rawEquipmentSingle : 0;

  const equipmentCacheSource = sanitizeEquipmentCache(
    (payload as { equipmentItemizedCache?: unknown }).equipmentItemizedCache
  );

  if (equipmentCacheSource.length > 0) {
    next.equipmentItemizedCache = equipmentCacheSource;
  } else if (next.equipmentMode === 'itemized') {
    next.equipmentItemizedCache = cloneItems(next.categories.equipment);
  } else {
    next.equipmentItemizedCache = [];
  }

  if (next.equipmentMode === 'single' && next.equipmentSingleTotal === 0 && next.categories.equipment.length > 0) {
    const singleItem = next.categories.equipment[0];
    const computed = Number(singleItem?.unitCost ?? 0) * Number(singleItem?.quantity ?? 1);
    next.equipmentSingleTotal = Number.isFinite(computed) && computed >= 0 ? computed : 0;
  }

  applyEquipmentConfiguration(next);
  applyPermitsConfiguration(next);

  const normalizedLabor = normalizeLaborItems(next.categories.labor, next.totalSqFt, 'Primary Constructor', next.areaUnit);
  if (normalizedLabor.changed) {
    next.categories.labor = normalizedLabor.items;
  }

  return next;
};

const formatEstimateLabel = (estimate: EstimateDocument & { id: string }) => {
  const legacyProject = sanitizeLegacyProject(
    (estimate.state as { legacyProject?: LegacyProjectDetails | null }).legacyProject ??
      (estimate.state as unknown as { project?: Partial<LegacyProjectDetails> | null }).project ??
      null
  );
  const projectName = legacyProject?.projectName ?? '';
  const name = estimate.title || projectName || 'Untitled estimate';
  const updated = estimate.updatedAt && 'toDate' in estimate.updatedAt ? estimate.updatedAt.toDate() : null;
  if (!updated) {
    return name;
  }
  return name + ' - ' + updated.toLocaleDateString();
};

export function EstimatorPage() {
  const [state, setState] = useState<EstimatorState>(() => createDefaultState());
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [intakeResult, setIntakeResult] = useState<IntakeDraftResult | null>(null);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [planResult, setPlanResult] = useState<PlanExtractionResult | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const { user } = useAuth();
  const [profileDefaults, setProfileDefaults] = useState<{ unit: AreaUnit; price: number; fullName: string } | null>(null);
  const { items: cloudEstimates, loading: cloudLoading } = useUserCollection<EstimateDocument>('estimates', {
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
  });
  const { items: projectDocs, loading: projectsLoading } = useUserCollection<ProjectDocument>('projects', {
    orderBy: [{ field: 'name', direction: 'asc' }],
  });
  const {
    items: materialCategories,
    loading: materialsLoading,
    error: materialsError,
  } = useUserCollection<MaterialCategoryDocument>('materialCategories', {
    orderBy: [{ field: 'name', direction: 'asc' }],
  });
  const {
    items: subcontractorDocs,
    loading: subcontractorsLoading,
    error: subcontractorsError,
  } = useUserCollection<SubcontractorDocument>('subcontractors', {
    orderBy: [{ field: 'name', direction: 'asc' }],
  });

  useEffect(() => {
    if (!user) {
      setProfileDefaults(null);
      return;
    }
    let active = true;
    getUserProfile(user.uid)
      .then((data) => {
        if (!active) {
          return;
        }
        const unit = data.defaultUnit === 'sq m' ? 'sq m' : DEFAULT_AREA_UNIT;
        const price = Number(data.defaultPricePerSqFt) || 0;
        const fullName = data.fullName?.trim() || '';
        setProfileDefaults({ unit, price, fullName });
      })
      .catch((err) => {
        console.error(err);
      });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !profileDefaults) {
      return;
    }
    setState((prev) => {
      const targetUnit: AreaUnit = profileDefaults.unit === 'sq m' ? 'sq m' : DEFAULT_AREA_UNIT;
      const prevUnit = prev.areaUnit ?? DEFAULT_AREA_UNIT;
      let next = prev;
      let changed = false;

      if (prevUnit !== targetUnit) {
        const convertedArea = convertAreaValue(prev.totalSqFt, prevUnit, targetUnit);
        const convertedPermitsSingle = convertRateValue(prev.permitsSingleRate, prevUnit, targetUnit);
        const convertedPermitsCache = prev.permitsItemizedCache.map((entry) => ({
          ...entry,
          ratePerSqFt: convertRateValue(entry.ratePerSqFt, prevUnit, targetUnit),
        }));
        const convertedLabor = prev.categories.labor.map((item) => ({
          ...item,
          unit: targetUnit,
          quantity: convertAreaValue(item.quantity, prevUnit, targetUnit),
          unitCost: convertRateValue(item.unitCost, prevUnit, targetUnit),
        }));
        next = {
          ...prev,
          areaUnit: targetUnit,
          totalSqFt: convertedArea,
          permitsSingleRate: convertedPermitsSingle,
          permitsItemizedCache: convertedPermitsCache,
          categories: {
            ...prev.categories,
            labor: convertedLabor,
          },
        };
        changed = true;
      } else if (prev.categories.labor.some((item) => item.unit !== targetUnit)) {
        next = {
          ...prev,
          categories: {
            ...prev.categories,
            labor: prev.categories.labor.map((item) => ({
              ...item,
              unit: targetUnit,
            })),
          },
        };
        changed = true;
      }

      const primaryName =
        profileDefaults.fullName ||
        user.displayName?.trim() ||
        next.categories.labor[0]?.name ||
        'Primary Constructor';
      const normalizedLabor = normalizeLaborItems(
        next.categories.labor,
        next.totalSqFt,
        primaryName,
        targetUnit,
        profileDefaults.price
      );

      if (normalizedLabor.changed) {
        next = {
          ...next,
          categories: {
            ...next.categories,
            labor: normalizedLabor.items,
          },
        };
        changed = true;
      }

      if (!changed) {
        return prev;
      }

      const applied = { ...next };
      applyPermitsConfiguration(applied);
      return applied;
    });
  }, [profileDefaults, user?.displayName, user?.uid]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EstimatorState>;
        const safeState = sanitizeState(parsed);
        setState(safeState);
      }
    } catch (error) {
      console.error('Failed to load saved estimate', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const payload = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, payload);
    setLastSavedAt(Date.now());
  }, [hydrated, state]);

  useEffect(() => {
    if (!selectedEstimateId) {
      return;
    }
    const exists = cloudEstimates.some((estimate) => estimate.id === selectedEstimateId);
    if (!exists) {
      setSelectedEstimateId(null);
    }
  }, [cloudEstimates, selectedEstimateId]);

  useEffect(() => {
    if (!state.selectedProjectId) {
      return;
    }
    const match = projectDocs.find((project) => project.id === state.selectedProjectId);
    if (!match) {
      setState((prev) => {
        if (prev.selectedProjectId === null) {
          return prev;
        }
        return {
          ...prev,
          selectedProjectId: null,
        };
      });
    }
  }, [projectDocs, state.selectedProjectId]);

  useEffect(() => {
    if (materialCategories.length === 0) {
      return;
    }
    setState((prev) => {
      const selected = prev.selectedMaterialCategoryIds ?? [];
      if (!selected.length) {
        return prev;
      }
      const { items, validIds } = buildMaterialItems(
        selected,
        prev.totalSqFt,
        materialCategories,
        prev.areaUnit
      );
      const sameIds = areStringArraysEqual(selected, validIds);
      const sameItems = areCostItemsEqual(prev.categories.materials, items);
      if (sameIds && sameItems) {
        return prev;
      }
      return {
        ...prev,
        selectedMaterialCategoryIds: validIds,
        categories: {
          ...prev.categories,
          materials: items,
        },
      };
    });
  }, [materialCategories, state.areaUnit]);

  useEffect(() => {
    setState((prev) => {
      const selected = prev.selectedSubcontractorIds ?? [];
      const { items, validIds } = buildSubcontractorItems(
        selected,
        prev.totalSqFt,
        subcontractorDocs,
        prev.areaUnit
      );
      const sameIds = areStringArraysEqual(selected, validIds);
      const sameItems = areCostItemsEqual(prev.categories.subcontractors, items);
      if (sameIds && sameItems) {
        return prev;
      }
      return {
        ...prev,
        selectedSubcontractorIds: validIds,
        categories: {
          ...prev.categories,
          subcontractors: items,
        },
      };
    });
  }, [subcontractorDocs, state.areaUnit]);

  useEffect(() => {
    if (!cloudMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setCloudMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [cloudMessage]);

  const totals = useMemo(() => calculateCategoryTotals(state.categories), [state.categories]);
  const financials = useMemo(
    () => calculateFinancials(state.categories, state.settings),
    [state.categories, state.settings]
  );
  const selectedProject = useMemo(
    () => projectDocs.find((project) => project.id === state.selectedProjectId) ?? null,
    [projectDocs, state.selectedProjectId]
  );
  const derivedProjectName = selectedProject?.name ?? state.legacyProject?.projectName ?? '';
  const derivedClientName = selectedProject?.client ?? state.legacyProject?.clientName ?? '';
  const derivedLocation = state.legacyProject?.location ?? '';

  const unitLabel = state.areaUnit === 'sq m' ? 'sq m' : 'sq ft';
  const primaryLaborName =
    user?.displayName && user.displayName.trim().length > 0 ? user.displayName.trim() : 'Primary Constructor';

  useEffect(() => {
    setState((prev) => {
      const normalized = normalizeLaborItems(prev.categories.labor, prev.totalSqFt, primaryLaborName, prev.areaUnit);
      if (!normalized.changed) {
        return prev;
      }
      return {
        ...prev,
        categories: {
          ...prev.categories,
          labor: normalized.items,
        },
      };
    });
  }, [primaryLaborName]);

  const laborItems = state.categories.labor ?? [];

  const primaryLaborItem = useMemo(() => {
    const existing = laborItems.find((item) => item.id === PRIMARY_LABOR_ID);
    if (existing) {
      return existing;
    }
    return {
      id: PRIMARY_LABOR_ID,
      name: primaryLaborName,
      unit: DEFAULT_AREA_UNIT,
      quantity: state.totalSqFt,
      unitCost: 0,
    };
  }, [laborItems, primaryLaborName, state.totalSqFt]);

  const laborWorkerItems = useMemo(
    () => laborItems.filter((item) => item.id !== PRIMARY_LABOR_ID),
    [laborItems]
  );

  const handleTotalSqFtChange = (input: string) => {
    const numericValue = Number(input);
    const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
    setState((prev) => {
      const selectedMaterials = prev.selectedMaterialCategoryIds ?? [];
      const { items: materialItems } = buildMaterialItems(
        selectedMaterials,
        safeValue,
        materialCategories,
        prev.areaUnit
      );
      const { items: subcontractorItems, validIds: subcontractorValidIds } = buildSubcontractorItems(
        prev.selectedSubcontractorIds ?? [],
        safeValue,
        subcontractorDocs,
        prev.areaUnit
      );
      const permitsItems =
        prev.permitsMode === 'single'
          ? [makePermitSingleItem(prev.permitsSingleRate, safeValue, prev.areaUnit)]
          : buildPermitItems(prev.permitsItemizedCache, safeValue, prev.areaUnit);
      const normalizedLabor = normalizeLaborItems(prev.categories.labor, safeValue, primaryLaborName, prev.areaUnit);
      const materialsUnchanged = areCostItemsEqual(prev.categories.materials, materialItems);
      const subcontractorsUnchanged = areCostItemsEqual(prev.categories.subcontractors, subcontractorItems);
      const permitsUnchanged = areCostItemsEqual(prev.categories.permits, permitsItems);
      const laborUnchanged = !normalizedLabor.changed;
      if (
        prev.totalSqFt === safeValue &&
        materialsUnchanged &&
        subcontractorsUnchanged &&
        permitsUnchanged &&
        laborUnchanged
      ) {
        return prev;
      }
      return {
        ...prev,
        totalSqFt: safeValue,
        selectedSubcontractorIds: subcontractorValidIds,
        categories: {
          ...prev.categories,
          materials: materialItems,
          subcontractors: subcontractorItems,
          permits: permitsItems,
          labor: normalizedLabor.changed ? normalizedLabor.items : prev.categories.labor,
        },
      };
    });
  };

  const handleProjectSelect = (projectId: string) => {
    setState((prev) => {
      const trimmed = projectId.trim();
      return {
        ...prev,
        selectedProjectId: trimmed.length > 0 ? trimmed : null,
      };
    });
  };

  const handleMaterialsSelectionChange = (ids: string[]) => {
    setState((prev) => {
      const normalized = Array.isArray(ids)
        ? ids
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value) => value.length > 0)
        : [];
      const unique = Array.from(new Set(normalized));
      const { items, validIds } = buildMaterialItems(
        unique,
        prev.totalSqFt,
        materialCategories,
        prev.areaUnit
      );
      const nextIds = validIds.length > 0 || unique.length === validIds.length ? validIds : unique;
      const sameIds = areStringArraysEqual(prev.selectedMaterialCategoryIds ?? [], nextIds);
      const sameItems = areCostItemsEqual(prev.categories.materials, items);
      if (sameIds && sameItems) {
        return prev;
      }
      return {
        ...prev,
        selectedMaterialCategoryIds: nextIds,
        categories: {
          ...prev.categories,
          materials: items,
        },
      };
    });
  };

  const handlePermitsModeChange = (mode: PermitsMode) => {
    setState((prev) => {
      if (prev.permitsMode === mode) {
        return prev;
      }
      if (mode === 'single') {
        const cachedEntries = prev.permitsItemizedCache;
        const aggregateRate = cachedEntries.reduce((sum, entry) => sum + (entry.ratePerSqFt || 0), 0);
        const rate = cachedEntries.length > 0 ? aggregateRate : prev.permitsSingleRate || 0;
        return {
          ...prev,
          permitsMode: 'single',
          permitsSingleRate: rate,
          categories: {
            ...prev.categories,
          permits: [makePermitSingleItem(rate, prev.totalSqFt, prev.areaUnit)],
          },
        };
      }

      const restored =
        prev.permitsItemizedCache.length > 0
          ? prev.permitsItemizedCache
          : derivePermitEntriesFromItems(
              prev.categories.permits.filter((item) => item.id !== PERMITS_SINGLE_ID)
            );

      return {
        ...prev,
        permitsMode: 'itemized',
        permitsItemizedCache: restored,
        categories: {
          ...prev.categories,
          permits: buildPermitItems(restored, prev.totalSqFt, prev.areaUnit),
        },
      };
    });
  };

  const handlePermitsSingleRateChange = (rate: number) => {
    const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
    setState((prev) => {
      if (prev.permitsMode !== 'single') {
        return prev;
      }
      const sameRate = prev.permitsSingleRate === safeRate;
      const sameItem =
        prev.categories.permits.length === 1 && prev.categories.permits[0].unitCost === safeRate;
      if (sameRate && sameItem) {
        return prev;
      }
      return {
        ...prev,
        permitsSingleRate: safeRate,
        categories: {
          ...prev.categories,
          permits: [makePermitSingleItem(safeRate, prev.totalSqFt, prev.areaUnit)],
        },
      };
    });
  };

  const handlePermitAdd = (entry: { name: string; rate: number }) => {
    setState((prev) => {
      if (prev.permitsMode !== 'itemized') {
        return prev;
      }
      const newEntry: PermitEntry = {
        id: 'permit-' + safeUUID(),
        name: entry.name,
        ratePerSqFt: entry.rate,
      };
      const nextEntries = [...prev.permitsItemizedCache, newEntry];
      return {
        ...prev,
        permitsItemizedCache: nextEntries,
        categories: {
          ...prev.categories,
          permits: buildPermitItems(nextEntries, prev.totalSqFt, prev.areaUnit),
        },
      };
    });
  };

  const handlePermitUpdate = (id: string, updates: { name?: string; rate?: number }) => {
    setState((prev) => {
      if (prev.permitsMode !== 'itemized') {
        return prev;
      }
      const nextEntries = prev.permitsItemizedCache.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }
        const nextName =
          updates.name !== undefined && updates.name.trim().length > 0 ? updates.name.trim() : entry.name;
        const nextRate =
          updates.rate !== undefined && Number.isFinite(updates.rate) && updates.rate >= 0
            ? updates.rate
            : entry.ratePerSqFt;
        return {
          ...entry,
          name: nextName,
          ratePerSqFt: nextRate,
        };
      });
      if (
        areCostItemsEqual(
          buildPermitItems(prev.permitsItemizedCache, prev.totalSqFt, prev.areaUnit),
          buildPermitItems(nextEntries, prev.totalSqFt, prev.areaUnit)
        )
      ) {
        return prev;
      }
      return {
        ...prev,
        permitsItemizedCache: nextEntries,
        categories: {
          ...prev.categories,
          permits: buildPermitItems(nextEntries, prev.totalSqFt, prev.areaUnit),
        },
      };
    });
  };

  const handlePermitRemove = (id: string) => {
    setState((prev) => {
      if (prev.permitsMode !== 'itemized') {
        return prev;
      }
      const nextEntries = prev.permitsItemizedCache.filter((entry) => entry.id !== id);
      if (nextEntries.length === prev.permitsItemizedCache.length) {
        return prev;
      }
      return {
        ...prev,
        permitsItemizedCache: nextEntries,
        categories: {
          ...prev.categories,
          permits: buildPermitItems(nextEntries, prev.totalSqFt, prev.areaUnit),
        },
      };
    });
  };

  const handleSubcontractorAdd = () => {
    if (subcontractorDocs.length === 0) {
      window.alert('Add subcontractors in the Subcontractors page before linking them here.');
      return;
    }
    setState((prev) => {
      const existing = prev.selectedSubcontractorIds ?? [];
      const available = subcontractorDocs.find((doc) => !existing.includes(doc.id));
      if (!available) {
        window.alert('All subcontractors are already selected.');
        return prev;
      }
      const nextIds = [...existing, available.id];
      const { items, validIds } = buildSubcontractorItems(
        nextIds,
        prev.totalSqFt,
        subcontractorDocs,
        prev.areaUnit
      );
      if (
        areStringArraysEqual(existing, validIds) &&
        areCostItemsEqual(prev.categories.subcontractors, items)
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedSubcontractorIds: validIds,
        categories: {
          ...prev.categories,
          subcontractors: items,
        },
      };
    });
  };

  const handleSubcontractorChange = (index: number, subcontractorId: string) => {
    setState((prev) => {
      const existing = prev.selectedSubcontractorIds ?? [];
      if (index < 0 || index >= existing.length) {
        return prev;
      }
      const trimmed = subcontractorId.trim();
      const nextIds = [...existing];
      if (!trimmed) {
        nextIds.splice(index, 1);
      } else {
        nextIds[index] = trimmed;
      }
      const { items, validIds } = buildSubcontractorItems(
        nextIds,
        prev.totalSqFt,
        subcontractorDocs,
        prev.areaUnit
      );
      if (
        areStringArraysEqual(existing, validIds) &&
        areCostItemsEqual(prev.categories.subcontractors, items)
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedSubcontractorIds: validIds,
        categories: {
          ...prev.categories,
          subcontractors: items,
        },
      };
    });
  };

  const handleSubcontractorRemove = (index: number) => {
    setState((prev) => {
      const existing = prev.selectedSubcontractorIds ?? [];
      if (index < 0 || index >= existing.length) {
        return prev;
      }
      const nextIds = existing.filter((_, idx) => idx !== index);
      const { items, validIds } = buildSubcontractorItems(
        nextIds,
        prev.totalSqFt,
        subcontractorDocs,
        prev.areaUnit
      );
      if (
        areStringArraysEqual(existing, validIds) &&
        areCostItemsEqual(prev.categories.subcontractors, items)
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedSubcontractorIds: validIds,
        categories: {
          ...prev.categories,
          subcontractors: items,
        },
      };
    });
  };

  const handleEquipmentModeChange = (mode: EquipmentMode) => {
    setState((prev) => {
      if (prev.equipmentMode === mode) {
        return prev;
      }
      if (mode === 'single') {
        const itemizedSource =
          prev.equipmentMode === 'itemized' && prev.categories.equipment.length > 0
            ? prev.categories.equipment
            : prev.equipmentItemizedCache;
        const cachedItems = itemizedSource.map((item) => ({ ...item }));
        const total = cachedItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
        const derivedTotal = cachedItems.length > 0 ? total : prev.equipmentSingleTotal;
        const safeTotal = Math.max(
          0,
          Number.isFinite(derivedTotal) ? Number(derivedTotal) : prev.equipmentSingleTotal
        );
        return {
          ...prev,
          equipmentMode: 'single',
          equipmentSingleTotal: safeTotal,
          equipmentItemizedCache: cachedItems,
          categories: {
            ...prev.categories,
            equipment: [makeEquipmentSingleItem(safeTotal)],
          },
        };
      }

      const restored =
        prev.equipmentItemizedCache.length > 0
          ? prev.equipmentItemizedCache.map((item) => ({ ...item }))
          : prev.categories.equipment
              .filter((item) => item.id !== EQUIPMENT_SINGLE_ID)
              .map((item) => ({ ...item }));

      return {
        ...prev,
        equipmentMode: 'itemized',
        categories: {
          ...prev.categories,
          equipment: restored,
        },
      };
    });
  };

  const handleEquipmentSingleTotalChange = (value: number) => {
    const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
    setState((prev) => {
      if (prev.equipmentMode !== 'single') {
        return prev;
      }
      const current = prev.categories.equipment[0];
      if (prev.equipmentSingleTotal === safeValue && current?.unitCost === safeValue) {
        return prev;
      }
      return {
        ...prev,
        equipmentSingleTotal: safeValue,
        categories: {
          ...prev.categories,
          equipment: [makeEquipmentSingleItem(safeValue)],
        },
      };
    });
  };

  const handleLaborPrimaryRateChange = (rate: number) => {
    setState((prev) => {
      const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
      const nextLabor = prev.categories.labor.map((item) =>
        item.id === PRIMARY_LABOR_ID
        ? { ...item, unitCost: safeRate, unit: DEFAULT_AREA_UNIT, quantity: prev.totalSqFt }
          : item
      );
      if (areCostItemsEqual(nextLabor, prev.categories.labor)) {
        return prev;
      }
      return {
        ...prev,
        categories: {
          ...prev.categories,
          labor: nextLabor,
        },
      };
    });
  };

  const handleLaborWorkerAdd = (name: string, rate: number) => {
    setState((prev) => {
      const safeName = name.trim().length > 0 ? name.trim() : 'Crew Member';
      const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
      const newWorker: CostItem = {
        id: 'labor-' + safeUUID(),
        name: safeName,
      unit: DEFAULT_AREA_UNIT,
        quantity: prev.totalSqFt,
        unitCost: safeRate,
      };
      return {
        ...prev,
        categories: {
          ...prev.categories,
          labor: [...prev.categories.labor, newWorker],
        },
      };
    });
  };

  const handleLaborWorkerUpdate = (workerId: string, updates: { name?: string; rate?: number }) => {
    if (!workerId || workerId === PRIMARY_LABOR_ID) {
      return;
    }
    setState((prev) => {
      const nextLabor = prev.categories.labor.map((item) => {
        if (item.id !== workerId) {
          return item;
        }
        const nextName =
          updates.name !== undefined
            ? updates.name.trim().length > 0
              ? updates.name.trim()
              : item.name
            : item.name;
        const nextRate =
          updates.rate !== undefined && Number.isFinite(updates.rate) && updates.rate >= 0
            ? updates.rate
            : item.unitCost;
        return {
          ...item,
          name: nextName,
          unitCost: nextRate,
          quantity: prev.totalSqFt,
        unit: DEFAULT_AREA_UNIT,
        };
      });
      if (areCostItemsEqual(nextLabor, prev.categories.labor)) {
        return prev;
      }
      return {
        ...prev,
        categories: {
          ...prev.categories,
          labor: nextLabor,
        },
      };
    });
  };

  const handleLaborWorkerRemove = (workerId: string) => {
    if (!workerId || workerId === PRIMARY_LABOR_ID) {
      return;
    }
    setState((prev) => {
      const nextLabor = prev.categories.labor.filter((item) => item.id !== workerId);
      if (nextLabor.length === prev.categories.labor.length) {
        return prev;
      }
      return {
        ...prev,
        categories: {
          ...prev.categories,
          labor: nextLabor,
        },
      };
    });
  };

  const handleSettingsChange = (settings: CostSettings) => {
    setState((prev) => ({ ...prev, settings }));
  };

  const handleAddItem = (category: CostCategoryKey, item: CostItem) => {
    const nextItem: CostItem = {
      ...item,
      id: safeUUID(),
      quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
      unitCost: Number.isFinite(item.unitCost) ? item.unitCost : 0,
    };

    setState((prev) => {
      if (category === 'equipment') {
        if (prev.equipmentMode !== 'itemized') {
          return prev;
        }
        const updated = [...prev.categories.equipment, nextItem];
        return {
          ...prev,
          categories: {
            ...prev.categories,
            equipment: updated,
          },
          equipmentItemizedCache: updated,
        };
      }
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [category]: [...prev.categories[category], nextItem],
        },
      };
    });
  };

  const handleUpdateItem = (
    category: CostCategoryKey,
    itemId: string,
    updates: Partial<CostItem>
  ) => {
    setState((prev) => {
      const updateCategoryItems = (items: CostItem[]) =>
        items.map((entry) =>
          entry.id === itemId
            ? {
                ...entry,
                ...updates,
                quantity:
                  updates.quantity !== undefined ? Math.max(0, updates.quantity) : entry.quantity,
                unitCost:
                  updates.unitCost !== undefined ? Math.max(0, updates.unitCost) : entry.unitCost,
              }
            : entry
        );

      if (category === 'equipment') {
        if (prev.equipmentMode !== 'itemized') {
          return prev;
        }
        const updated = updateCategoryItems(prev.categories.equipment);
        if (areCostItemsEqual(updated, prev.categories.equipment)) {
          return prev;
        }
        return {
          ...prev,
          categories: {
            ...prev.categories,
            equipment: updated,
          },
          equipmentItemizedCache: updated,
        };
      }

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [category]: updateCategoryItems(prev.categories[category]),
        },
      };
    });
  };

  const handleRemoveItem = (category: CostCategoryKey, itemId: string) => {
    setState((prev) => {
      if (category === 'equipment') {
        if (prev.equipmentMode !== 'itemized') {
          return prev;
        }
        const filtered = prev.categories.equipment.filter((entry) => entry.id !== itemId);
        if (filtered.length === prev.categories.equipment.length) {
          return prev;
        }
        return {
          ...prev,
          categories: {
            ...prev.categories,
            equipment: filtered,
          },
          equipmentItemizedCache: filtered,
        };
      }
      const filtered = prev.categories[category].filter((entry) => entry.id !== itemId);
      if (filtered.length === prev.categories[category].length) {
        return prev;
      }
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [category]: filtered,
        },
      };
    });
  };

  const handleReset = () => {
    if (window.confirm('Start a fresh estimate? This will clear all items.')) {
      const freshState = createDefaultState();
      setState(freshState);
      setSelectedEstimateId(null);
      window.localStorage.removeItem(STORAGE_KEY);
      setLastSavedAt(Date.now());
      setIntakeResult(null);
      setPlanResult(null);
      setShowPlanModal(false);
      setShowIntakeModal(false);
    }
  };

  const handleIntakeDraft = async (scopeText: string) => {
    const trimmed = scopeText.trim();
    if (!trimmed) {
      window.alert('Describe the scope before drafting.');
      return;
    }
    setIntakeBusy(true);
    try {
      const fallbackSqFt =
        state.totalSqFt > 0 ? convertAreaValue(state.totalSqFt, state.areaUnit, 'sq ft') : undefined;
      const draft = draftEstimateFromScope(trimmed, {
        fallbackSqFt,
        defaultUnit: state.areaUnit,
      });
      setIntakeResult(draft);
      setState((prev) =>
        applyDraftRecommendations(
          prev,
          {
            derivedSqFt: draft.derivedSqFt,
            materialRecommendations: draft.materialRecommendations,
            laborDraft: draft.laborDraft,
            subcontractorRecommendations: draft.subcontractorRecommendations,
            permitDraft: draft.permitDraft,
          },
          materialCategories,
          subcontractorDocs,
          prev.areaUnit,
          primaryLaborName
        )
      );
      setCloudError(null);
      setCloudMessage('Drafted estimate from description');
    } catch (error) {
      console.error(error);
      window.alert('Could not interpret that description. Try adding more scope detail.');
    } finally {
      setIntakeBusy(false);
    }
  };

  const handlePlanAnalyze = async (files: File[], notes: string) => {
    if (files.length === 0 && notes.trim().length === 0) {
      window.alert('Upload at least one plan file or add notes before analyzing.');
      return;
    }
    setPlanBusy(true);
    try {
      const result = await extractPlanInsights(files, notes, { defaultUnit: state.areaUnit });
      setPlanResult(result);
      setCloudMessage('Plan set analyzed');
    } catch (error) {
      console.error(error);
      window.alert('Plan analysis failed. Try smaller files or add a short description.');
    } finally {
      setPlanBusy(false);
    }
  };

  const handleApplyPlanResult = () => {
    if (!planResult) {
      return;
    }
    setState((prev) =>
      applyDraftRecommendations(
        prev,
        {
          derivedSqFt: planResult.derivedSqFt,
          materialRecommendations: planResult.materialRecommendations,
          laborDraft: planResult.laborDraft,
          subcontractorRecommendations: planResult.subcontractorRecommendations,
          permitDraft: planResult.permitDraft,
        },
        materialCategories,
        subcontractorDocs,
        prev.areaUnit,
        primaryLaborName
      )
    );
    setCloudMessage('Plan insights applied');
  };

  const handleDownload = () => {
    generateEstimatePdf({
      projectName: derivedProjectName,
      clientName: derivedClientName,
      location: derivedLocation,
      preparedBy: user?.displayName || user?.email || null,
      totals,
      financials,
      settings: state.settings,
      categories: state.categories,
      totalSqFt: state.totalSqFt,
      unitLabel,
      notes: state.legacyProject?.notes ?? null,
    });
  };

  const handleCopySummary = async () => {
    const summaryLines = [
      'Project: ' + (derivedProjectName || 'Untitled'),
      'Client: ' + (derivedClientName || 'N/A'),
      'Location: ' + (derivedLocation || 'N/A'),
      'Total Area (' + unitLabel + '): ' + state.totalSqFt.toLocaleString(),
      '',
      ...totals.map((entry) => entry.label + ': ' + formatCurrency(entry.total)),
      '',
      'Total Proposal Value: ' + formatCurrency(financials.grandTotal),
    ];

    const summaryText = summaryLines.join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = summaryText;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      window.alert('Summary copied to clipboard.');
    } catch (error) {
      console.error('Copy failed', error);
      window.alert('Could not copy summary.');
    }
  };

  const handleSelectEstimate = (id: string) => {
    if (!id) {
      if (window.confirm('Start a new estimate? This will clear the current workspace.')) {
        setState(createDefaultState());
        setSelectedEstimateId(null);
        setCloudError(null);
      }
      return;
    }

    const match = cloudEstimates.find((estimate) => estimate.id === id);
    if (!match) {
      return;
    }

    const confirmMessage = 'Load this saved estimate? Any unsaved changes will be overwritten.';
    if (window.confirm(confirmMessage)) {
      const safeState = sanitizeState(match.state);
      setState(safeState);
      setSelectedEstimateId(match.id);
      setCloudError(null);
    }
  };

  const handleSaveToWorkspace = async () => {
    if (!user) {
      window.alert('Sign in to save estimates to your ScopeSmart workspace.');
      return;
    }
    if (!state.selectedProjectId) {
      window.alert('Select a project before saving this estimate.');
      return;
    }
    setCloudSaving(true);
    setCloudError(null);
    try {
      const title = derivedProjectName || 'Untitled estimate';
      const id = await saveEstimate(user.uid, {
        id: selectedEstimateId ?? undefined,
        title,
        status: 'active',
        totalValue: financials.grandTotal,
        projectId: state.selectedProjectId,
        state,
      });
      if (id) {
        setSelectedEstimateId(id);
      }
      setCloudMessage('Estimate saved to workspace');
    } catch (error) {
      console.error(error);
      setCloudError('Could not save estimate. Please try again.');
    } finally {
      setCloudSaving(false);
    }
  };

  const handleDeleteEstimate = async () => {
    if (!user || !selectedEstimateId) {
      return;
    }
    const confirmed = window.confirm('Delete this saved estimate? This cannot be undone.');
    if (!confirmed) {
      return;
    }
    try {
      await removeEstimate(user.uid, selectedEstimateId);
      setSelectedEstimateId(null);
      setCloudMessage('Estimate deleted');
    } catch (error) {
      console.error(error);
      setCloudError('Could not delete the estimate.');
    }
  };

  return (
    <>
      {showPlanModal ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card modal__card--wide">
            <div className="modal__header">
              <div>
                <h3>Plan & Photo Extraction</h3>
                <p>Drop plan PDFs or site photos to auto-detect footprint, floors, and critical scopes.</p>
              </div>
              <div className="modal__header-actions">
                {planResult ? (
                  <div className="plan-extraction-panel__pill">
                    <strong>{planResult.derivedSqFt.toLocaleString()} sq ft</strong>
                    <span>Draft footprint</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="modal__close"
                  aria-label="Close plan extraction"
                  onClick={() => setShowPlanModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="modal__body">
              <PlanExtractionPanel
                result={planResult}
                onAnalyze={handlePlanAnalyze}
                onApply={handleApplyPlanResult}
                isProcessing={planBusy}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showIntakeModal ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card modal__card--wide">
            <div className="modal__header">
              <div>
                <h3>AI Scope Intake</h3>
                <p>Paste narrative notes and let ScopeSmart draft materials, labor, and subcontractor picks.</p>
              </div>
              <div className="modal__header-actions">
                {intakeResult && intakeResult.confidence ? (
                  <div
                    className={`ai-intake-panel__confidence ai-intake-panel__confidence--${
                      intakeResult.confidence >= 0.75 ? 'high' : intakeResult.confidence <= 0.5 ? 'low' : 'med'
                    }`}
                  >
                    <strong>{Math.round(intakeResult.confidence * 100)}% match</strong>
                    <span>Latest draft</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="modal__close"
                  aria-label="Close AI intake"
                  onClick={() => setShowIntakeModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="modal__body">
              <NLIntakePanel
                result={intakeResult}
                onDraft={handleIntakeDraft}
                isProcessing={intakeBusy}
                totalSqFt={state.totalSqFt}
                unitLabel={unitLabel}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="estimator">
        <header className="estimator__header">
          <div className="estimator__intro-line">
            <div className="estimator__intro-text">
              <h1>ScopeSmart Estimator</h1>
              <p>Build clear, defensible project budgets in minutes.</p>
            </div>
            <div className="estimator__inline-form">
              <label className="estimator__select estimator__select--inline">
                <span>Project</span>
                <select
                  value={state.selectedProjectId ?? ''}
                  onChange={(event) => handleProjectSelect(event.target.value)}
                  disabled={projectsLoading || projectDocs.length === 0}
                >
                  <option value="">
                    {projectsLoading ? 'Loading projects...' : 'Select a project'}
                  </option>
                  {projectDocs.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.client ? ` (${project.client})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="estimator__select estimator__select--inline">
                <span>Saved estimates</span>
                <select
                  value={selectedEstimateId ?? ''}
                  onChange={(event) => handleSelectEstimate(event.target.value)}
                  disabled={cloudLoading || cloudSaving}
                >
                  <option value="">New estimate</option>
                  {cloudEstimates.map((estimate) => (
                    <option key={estimate.id} value={estimate.id}>
                      {formatEstimateLabel(estimate)}
                    </option>
                  ))}
                </select>
              </label>

            </div>
            <div className="estimator__actions estimator__actions--inline">
              <button className="button" type="button" onClick={handleSaveToWorkspace} disabled={cloudSaving}>
                {cloudSaving ? 'Saving...' : 'Save to Workspace'}
              </button>
              {selectedEstimateId ? (
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={handleDeleteEstimate}
                  disabled={cloudSaving}
                >
                  Delete Saved Estimate
                </button>
              ) : null}
              <button className="button button--ghost" type="button" onClick={handleReset}>
                Start New Estimate
              </button>
            </div>
          </div>
          <div className="estimator__messages">
            {!projectsLoading && projectDocs.length === 0 ? (
              <span className="badge badge--error">Create a project to start saving estimates.</span>
            ) : null}
            {cloudMessage ? <span className="badge badge--success">{cloudMessage}</span> : null}
            {cloudError ? <span className="badge badge--error">{cloudError}</span> : null}
          </div>
      </header>

      <main className="layout">
        <div className="layout__primary">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Cost Breakdown</h2>
                <p className="panel__subtext">
                  Itemize direct costs by category. Quantities and unit costs update totals instantly.
                </p>
              </div>
            </header>

            <div className="panel__controls panel__controls--ai">
              <div className="panel__controls-ai-buttons">
                <button
                  type="button"
                  className="estimator__ai-button"
                  onClick={() => setShowPlanModal(true)}
                >
                  Plan & Photo Extraction
                </button>
                <button
                  type="button"
                  className="estimator__ai-button"
                  onClick={() => setShowIntakeModal(true)}
                >
                  AI Scope Intake
                </button>
              </div>
              <label className="field field--horizontal">
                <span>Total Area (sq ft)</span>
                <input
                  className="input input--compact align-right"
                  type="number"
                  min={0}
                  step={1}
                  value={state.totalSqFt}
                  onChange={(event) => handleTotalSqFtChange(event.target.value)}
                />
              </label>
            </div>

            <MaterialsSection
              categories={materialCategories}
              loading={materialsLoading}
              error={materialsError}
              totalSqFt={state.totalSqFt}
              unitLabel={unitLabel}
              selectedIds={state.selectedMaterialCategoryIds}
              onSelectionChange={handleMaterialsSelectionChange}
            />

            <EquipmentSection
              mode={state.equipmentMode}
              singleTotal={state.equipmentSingleTotal}
              items={state.categories.equipment}
              onModeChange={handleEquipmentModeChange}
              onSingleTotalChange={handleEquipmentSingleTotalChange}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
            />

            <PermitsSection
              mode={state.permitsMode}
              singleRate={state.permitsSingleRate}
              totalSqFt={state.totalSqFt}
              unitLabel={unitLabel}
              items={state.permitsItemizedCache}
              onModeChange={handlePermitsModeChange}
              onSingleRateChange={handlePermitsSingleRateChange}
              onAdd={handlePermitAdd}
              onUpdate={handlePermitUpdate}
              onRemove={handlePermitRemove}
            />

            <SubcontractorSection
              options={subcontractorDocs}
              selectedIds={state.selectedSubcontractorIds}
              totalSqFt={state.totalSqFt}
              unitLabel={unitLabel}
              loading={subcontractorsLoading}
              error={subcontractorsError}
              onAdd={handleSubcontractorAdd}
              onSelect={handleSubcontractorChange}
              onRemove={handleSubcontractorRemove}
            />

            <LaborSection
              totalSqFt={state.totalSqFt}
              primaryItem={primaryLaborItem}
              workers={laborWorkerItems}
              unitLabel={unitLabel}
              onPrimaryRateChange={handleLaborPrimaryRateChange}
              onWorkerAdd={handleLaborWorkerAdd}
              onWorkerUpdate={handleLaborWorkerUpdate}
              onWorkerRemove={handleLaborWorkerRemove}
            />

            <div className="categories">
              {editableCategoryKeys.map((key) => (
                <CategorySection
                  key={key}
                  categoryKey={key}
                  label={CATEGORY_LABELS[key]}
                  items={state.categories[key]}
                  onAdd={handleAddItem}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          </section>
        </div>

        <SummaryPanel
          totals={totals}
          breakdown={financials}
          settings={state.settings}
          onSettingsChange={handleSettingsChange}
          onDownload={handleDownload}
          onCopySummary={handleCopySummary}
          lastSavedAt={lastSavedAt}
        />
      </main>
    </div>
    </>
  );
}

export default EstimatorPage;



























