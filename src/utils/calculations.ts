import type { CategoryMap, CostCategoryKey, CostSettings } from '../types';

export const CATEGORY_LABELS: Record<CostCategoryKey, string> = {
  materials: 'Materials',
  labor: 'Labor',
  equipment: 'Equipment',
  subcontractors: 'Subcontractors',
  permits: 'Permits & Fees',
};

export const roundCurrency = (value: number) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const formatCurrency = (value: number, locale = 'en-US', currency = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0);
};

const sumCategory = (items: { quantity: number; unitCost: number }[]) => {
  return items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
};

export interface CategoryTotal {
  key: CostCategoryKey;
  label: string;
  total: number;
}

export const calculateCategoryTotals = (categories: CategoryMap): CategoryTotal[] => {
  return (Object.keys(categories) as CostCategoryKey[]).map((key) => {
    const total = sumCategory(categories[key]);
    return { key, label: CATEGORY_LABELS[key], total: roundCurrency(total) };
  });
};

export interface FinancialBreakdown {
  subtotal: number;
  overheadAmount: number;
  contingencyAmount: number;
  markupBase: number;
  profitAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
}

export const calculateFinancials = (
  categories: CategoryMap,
  settings: CostSettings
): FinancialBreakdown => {
  const subtotal = roundCurrency(
    (Object.values(categories).flat() as { quantity: number; unitCost: number }[]).reduce(
      (acc, item) => acc + item.quantity * item.unitCost,
      0
    )
  );

  const overheadAmount = roundCurrency((settings.overhead / 100) * subtotal);
  const contingencyAmount = roundCurrency((settings.contingency / 100) * subtotal);

  const markupBase = subtotal + overheadAmount + contingencyAmount;
  const profitAmount = roundCurrency((settings.profitMargin / 100) * markupBase);

  const taxableAmount = markupBase + profitAmount;
  const taxAmount = roundCurrency((settings.taxRate / 100) * taxableAmount);

  const grandTotal = roundCurrency(taxableAmount + taxAmount);

  return {
    subtotal,
    overheadAmount,
    contingencyAmount,
    markupBase,
    profitAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
  };
};

export const getDefaultCategoryMap = (): CategoryMap => ({
  materials: [],
  labor: [],
  equipment: [],
  subcontractors: [],
  permits: [],
});

export const safeUUID = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
};
