import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import type { InvalidationType } from '../context/appDataTypes';
import { useAppData } from '../context/AppDataContext';

interface UseStaleFocusRefreshOptions {
  types: InvalidationType[];
  thresholdMs?: number;
}

export function useStaleFocusRefresh({ types, thresholdMs }: UseStaleFocusRefreshOptions): void {
  const { refreshIfStale } = useAppData();

  useFocusEffect(
    useCallback(() => {
      void refreshIfStale(types);
    }, [refreshIfStale, types, thresholdMs]),
  );
}
