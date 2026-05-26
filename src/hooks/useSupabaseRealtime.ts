import { useEffect, useRef } from 'react';

import type { InvalidationPayload, InvalidationType } from '../context/appDataTypes';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSupabaseRealtime');

type InvalidateFn = (type: InvalidationType, payload?: InvalidationPayload) => void;

interface RealtimeBinding {
  table: string;
  types: InvalidationType[];
  resolvePayload?: (record: Record<string, unknown>) => InvalidationPayload | undefined;
}

const REALTIME_BINDINGS: RealtimeBinding[] = [
  { table: 'profiles', types: ['profile', 'groups', 'home'] },
  { table: 'groups', types: ['groups', 'home'] },
  {
    table: 'group_members',
    types: ['group_members', 'group_detail', 'groups', 'home'],
    resolvePayload: (record) => ({ groupId: typeof record.group_id === 'string' ? record.group_id : undefined }),
  },
  {
    table: 'group_invitations',
    types: ['invitations', 'notifications', 'groups', 'group_detail'],
    resolvePayload: (record) => ({ groupId: typeof record.group_id === 'string' ? record.group_id : undefined }),
  },
  { table: 'notifications', types: ['notifications'] },
  {
    table: 'expenses',
    types: ['expenses', 'groups', 'settlements', 'home', 'group_detail'],
    resolvePayload: (record) => ({ groupId: typeof record.group_id === 'string' ? record.group_id : undefined }),
  },
  {
    table: 'expense_splits',
    types: ['expenses', 'settlements', 'home'],
  },
  {
    table: 'settlements',
    types: ['settlements', 'groups', 'expenses', 'home', 'group_detail'],
    resolvePayload: (record) => ({ groupId: typeof record.group_id === 'string' ? record.group_id : undefined }),
  },
  {
    table: 'receipts',
    types: ['receipts', 'expenses'],
    resolvePayload: (record) => ({ groupId: typeof record.group_id === 'string' ? record.group_id : undefined }),
  },
];

export function useSupabaseRealtime(invalidate: InvalidateFn): void {
  const { authInitialized, session } = useAuth();
  const userId = session?.user?.id;
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  useEffect(() => {
    if (!authInitialized || !userId) {
      return;
    }

    const channel = supabase.channel(`app-data-${userId}`);

    for (const binding of REALTIME_BINDINGS) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: binding.table },
        (payload) => {
          const record = (payload.new ?? payload.old) as Record<string, unknown> | null;
          const eventPayload = record && binding.resolvePayload ? binding.resolvePayload(record) : undefined;
          logger.info('Realtime event received', {
            table: binding.table,
            eventType: payload.eventType,
            groupId: eventPayload?.groupId,
          });
          for (const type of binding.types) {
            invalidateRef.current(type, eventPayload);
          }
        },
      );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Realtime subscription started', { userId });
      }
      if (status === 'CLOSED') {
        logger.info('Realtime subscription stopped', { userId });
      }
    });

    return () => {
      logger.info('Realtime subscription cleanup', { userId });
      void supabase.removeChannel(channel);
    };
  }, [authInitialized, userId]);
}
