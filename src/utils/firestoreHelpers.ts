import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit as limitConstraint,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type FirestoreError,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  EstimateDocument,
  EstimateStatus,
  MaterialCategoryDocument,
  ProjectDocument,
  ProjectStatus,
  SubcontractorDocument,
  SubcontractorSpecialty,
  UserProfile,
} from '../types';

const userCollection = (uid: string, collectionName: string) => collection(db, 'users', uid, collectionName);
const userDocument = (uid: string, collectionName: string, id: string) => doc(db, 'users', uid, collectionName, id);
const userProfileDocument = (uid: string) => doc(db, 'users', uid, 'settings', 'profile');

export interface UserCollectionSubscribeOptions {
  orderBy?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  limit?: number;
}

export type Unsubscribe = () => void;

export const subscribeToUserCollection = <T = unknown>(
  uid: string,
  collectionName: string,
  options: UserCollectionSubscribeOptions | undefined,
  onData: (items: Array<T & { id: string }>) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe => {
  const constraints: QueryConstraint[] = [];
  if (options?.orderBy) {
    for (const entry of options.orderBy) {
      constraints.push(orderBy(entry.field, entry.direction ?? 'asc'));
    }
  }
  if (options?.limit && options.limit > 0) {
    constraints.push(limitConstraint(options.limit));
  }

  const ref = userCollection(uid, collectionName);
  const queryRef = constraints.length ? query(ref, ...constraints) : ref;

  return onSnapshot(
    queryRef,
    (snapshot) => {
      const docs = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as T),
      }));
      onData(docs);
    },
    (error) => {
      onError(error);
    }
  );
};

export interface ProjectInput {
  name: string;
  client: string;
  status: ProjectStatus;
  approvedValue: number;
  estimatesCount?: number;
  activeEstimates?: number;
}

export const createProject = async (uid: string, input: ProjectInput) => {
  const now = serverTimestamp();
  const payload: ProjectDocument = {
    name: input.name,
    client: input.client,
    status: input.status,
    approvedValue: input.approvedValue,
    estimatesCount: input.estimatesCount ?? 0,
    activeEstimates: input.activeEstimates ?? 0,
    lastActivity: now,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(userCollection(uid, 'projects'), payload);
  return ref.id;
};

export const updateProject = async (uid: string, id: string, updates: Partial<ProjectInput>) => {
  await updateDoc(userDocument(uid, 'projects', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const removeProject = async (uid: string, id: string) => {
  await deleteDoc(userDocument(uid, 'projects', id));
};

const defaultProfile: UserProfile = {
  fullName: '',
  companyName: '',
  email: '',
  phone: '',
  address: '',
  photoUrl: '',
  defaultPricePerSqFt: 0,
  defaultUnit: 'sq ft',
};

export const getUserProfile = async (uid: string): Promise<UserProfile> => {
  const snapshot = await getDoc(userProfileDocument(uid));
  if (!snapshot.exists()) {
    return { ...defaultProfile };
  }
  const data = snapshot.data() as Partial<UserProfile>;
  return {
    ...defaultProfile,
    ...data,
    defaultPricePerSqFt: Number(data.defaultPricePerSqFt) || 0,
    defaultUnit: data.defaultUnit === 'sq m' ? 'sq m' : 'sq ft',
  };
};

export const saveUserProfile = async (uid: string, input: UserProfile) => {
  await setDoc(
    userProfileDocument(uid),
    {
      ...input,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export interface SubcontractorInput {
  name: string;
  specialty: SubcontractorSpecialty;
  pricePerSqFt: number;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export const createSubcontractor = async (uid: string, input: SubcontractorInput) => {
  const now = serverTimestamp();
  const payload: SubcontractorDocument = {
    name: input.name,
    specialty: input.specialty,
    pricePerSqFt: input.pricePerSqFt,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(userCollection(uid, 'subcontractors'), payload);
  return ref.id;
};

export const updateSubcontractor = async (uid: string, id: string, updates: Partial<SubcontractorInput>) => {
  await updateDoc(userDocument(uid, 'subcontractors', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const removeSubcontractor = async (uid: string, id: string) => {
  await deleteDoc(userDocument(uid, 'subcontractors', id));
};

export interface MaterialCategoryInput {
  name: string;
  unitCostPerSqFt: number;
  formula?: string | null;
  description?: string | null;
}

export const createMaterialCategory = async (uid: string, input: MaterialCategoryInput) => {
  const now = serverTimestamp();
  const payload: MaterialCategoryDocument = {
    name: input.name,
    unitCostPerSqFt: input.unitCostPerSqFt,
    formula: input.formula ?? null,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(userCollection(uid, 'materialCategories'), payload);
  return ref.id;
};

export const updateMaterialCategory = async (
  uid: string,
  id: string,
  updates: Partial<MaterialCategoryInput>
) => {
  await updateDoc(userDocument(uid, 'materialCategories', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const removeMaterialCategory = async (uid: string, id: string) => {
  await deleteDoc(userDocument(uid, 'materialCategories', id));
};

export interface SaveEstimateInput {
  id?: string;
  title: string;
  status: EstimateStatus;
  totalValue: number;
  projectId?: string | null;
  state: EstimateDocument['state'];
}

export const saveEstimate = async (uid: string, input: SaveEstimateInput) => {
  const { id, ...rest } = input;
  const basePayload: EstimateDocument = {
    title: rest.title,
    status: rest.status,
    totalValue: rest.totalValue,
    projectId: rest.projectId ?? null,
    state: rest.state,
    updatedAt: serverTimestamp(),
  };

  let estimateId = id ?? null;

  if (id) {
    await setDoc(userDocument(uid, 'estimates', id), basePayload, { merge: true });
  } else {
    const ref = await addDoc(userCollection(uid, 'estimates'), {
      ...basePayload,
      createdAt: serverTimestamp(),
    });
    estimateId = ref.id;
  }

  if (rest.projectId) {
    await touchProjectActivity(uid, rest.projectId);
  }

  return estimateId;
};

export const removeEstimate = async (uid: string, id: string) => {
  await deleteDoc(userDocument(uid, 'estimates', id));
};

export const touchProjectActivity = async (uid: string, projectId: string) => {
  await updateDoc(userDocument(uid, 'projects', projectId), {
    lastActivity: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
