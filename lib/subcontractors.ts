import type { SubcontractorSpecialty } from './types';

export const SUBCONTRACTOR_SPECIALTY_OPTIONS: Array<{ value: SubcontractorSpecialty; label: string }> = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'framing', label: 'Framing' },
  { value: 'finish', label: 'Finish Carpentry' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'other', label: 'General' },
];

const specialtyLabelMap: Record<SubcontractorSpecialty, string> = SUBCONTRACTOR_SPECIALTY_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<SubcontractorSpecialty, string>
);

export const getSubcontractorSpecialtyLabel = (specialty: SubcontractorSpecialty): string => {
  return specialtyLabelMap[specialty] ?? 'Subcontractor';
};
