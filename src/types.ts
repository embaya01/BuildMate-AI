import type { FieldValue, Timestamp } from 'firebase/firestore';

export type CostCategoryKey = 'materials' | 'labor' | 'equipment' | 'subcontractors' | 'permits';
export type AreaUnit = 'sq ft' | 'sq m';

export interface CostItem {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  quantity: number;
  unitCost: number;
}

export type EquipmentMode = 'single' | 'itemized';
export type PermitsMode = 'single' | 'itemized';
export type SubcontractorSpecialty =
  | 'hvac'
  | 'electrical'
  | 'plumbing'
  | 'framing'
  | 'finish'
  | 'roofing'
  | 'concrete'
  | 'other';

export type FirestoreTimestamp = Timestamp | FieldValue;

export interface CategoryMap {
  materials: CostItem[];
  labor: CostItem[];
  equipment: CostItem[];
  subcontractors: CostItem[];
  permits: CostItem[];
}

export interface LegacyProjectDetails {
  projectName?: string;
  clientName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface CostSettings {
  taxRate: number; // percent applied after markup
  profitMargin: number; // percent applied to subtotal + adjustments
  contingency: number; // percent applied to subtotal
  overhead: number; // percent applied to subtotal
}

export interface EstimatorState {
  selectedProjectId: string | null;
  categories: CategoryMap;
  settings: CostSettings;
  totalSqFt: number;
  areaUnit: AreaUnit;
  selectedMaterialCategoryIds: string[];
  selectedSubcontractorIds: string[];
  equipmentMode: EquipmentMode;
  equipmentSingleTotal: number;
  equipmentItemizedCache: CostItem[];
  permitsMode: PermitsMode;
  permitsSingleRate: number;
  permitsItemizedCache: PermitEntry[];
  legacyProject?: LegacyProjectDetails | null;
}

export interface MaterialCategoryDocument {
  name: string;
  unitCostPerSqFt: number;
  formula?: string | null;
  description?: string | null;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface MaterialItemDocument {
  categoryId: string;
  name: string;
  unit: string;
  unitCost: number;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface SubcontractorDocument {
  name: string;
  specialty: SubcontractorSpecialty;
  pricePerSqFt: number;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface PermitEntry {
  id: string;
  name: string;
  ratePerSqFt: number;
  notes?: string | null;
}

export interface UserProfile {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  defaultPricePerSqFt: number;
  defaultUnit: AreaUnit;
  updatedAt?: FirestoreTimestamp;
}

export type ProjectStatus = 'planning' | 'in-progress' | 'completed' | 'on-hold';

export interface ProjectDocument {
  name: string;
  client: string;
  status: ProjectStatus;
  approvedValue: number;
  estimatesCount?: number;
  activeEstimates?: number;
  lastActivity?: FirestoreTimestamp;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export type EstimateStatus = 'draft' | 'active' | 'approved' | 'archived';

export interface EstimateDocument {
  title: string;
  status: EstimateStatus;
  totalValue: number;
  projectId?: string | null;
  state: EstimatorState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}




