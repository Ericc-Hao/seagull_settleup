import { useMemo } from 'react';

import { useAppData } from '../context/AppDataContext';
import {
  getGlobalPendingTransfersForCurrentUser,
  getGlobalSettlementHistoryForCurrentUser,
} from '../services/settlementService';
import { createLogger } from '../utils/logger';

const logger = createLogger('useGlobalSettleUpData');

export function useGlobalSettleUpData() {
  const { version, ready } = useAppData();

  const { outgoingTransfers, settlementHistory } = useMemo(() => {
    if (!ready) {
      return { outgoingTransfers: [], settlementHistory: [] };
    }

    try {
      const transfers = getGlobalPendingTransfersForCurrentUser();
      const history = getGlobalSettlementHistoryForCurrentUser();
      return { outgoingTransfers: transfers, settlementHistory: history };
    } catch (error) {
      logger.error('Global pending transfers fetch failed', error);
      return { outgoingTransfers: [], settlementHistory: [] };
    }
  }, [ready, version]);

  return {
    ready,
    outgoingTransfers,
    settlementHistory,
  };
}
