'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FirestoreError } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeToUserCollection,
  type UserCollectionSubscribeOptions,
} from '@/lib/firestoreHelpers';

type SortDirection = 'asc' | 'desc';

interface OrderByOption {
  field: string;
  direction?: SortDirection;
}

interface UseUserCollectionOptions {
  orderBy?: OrderByOption[];
  limit?: number;
}

export interface CollectionState<T> {
  items: T[];
  loading: boolean;
  error: FirestoreError | null;
}

const mapOptions = (options?: UseUserCollectionOptions): UserCollectionSubscribeOptions | undefined => {
  if (!options) {
    return undefined;
  }
  return {
    orderBy: options.orderBy?.map((entry) => ({ field: entry.field, direction: entry.direction })),
    limit: options.limit,
  };
};

export const useUserCollection = <T = unknown>(
  collectionName: string,
  options?: UseUserCollectionOptions
): CollectionState<T & { id: string }> => {
  const { user } = useAuth();
  const [items, setItems] = useState<Array<T & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const normalizedOptions = useMemo(() => mapOptions(options), [options?.limit, JSON.stringify(options?.orderBy ?? [])]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserCollection<T>(
      user.uid,
      collectionName,
      normalizedOptions,
      (nextItems) => {
        setItems(nextItems);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName, normalizedOptions, user?.uid]);

  return { items, loading, error };
};
