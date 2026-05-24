import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { Team, buildEqualSplits } from '../core/settlement';

import type { AddExpenseInput } from './settle-context';
import { buildCustomSplits } from './settle-helpers';
import {
  buildDashboardSummary,
  buildTransfersForTrip,
  buildTripListItem,
  canSettle,
  deriveTripStatus,
} from './trip-selectors';
import type {
  AddPersonInput,
  CreateTripInput,
  SettlementMode,
  Trip,
  TripListItem,
  TripMember,
} from './trip-types';
import type { DashboardSummary, TransferView } from './settle-context';
import { formatCad } from './settle-context';

export { formatCad };

interface TripsContextValue {
  trips: Trip[];
  tripList: TripListItem[];
  activeMemberId: string;
  getTrip: (tripId: string) => Trip | undefined;
  getTripListItem: (tripId: string) => TripListItem | undefined;
  getTripDashboard: (tripId: string) => DashboardSummary | null;
  getIndividualTransfers: (tripId: string) => TransferView[];
  getTeamTransfers: (tripId: string) => TransferView[];
  canSettleTrip: (tripId: string) => ReturnType<typeof canSettle>;
  createTrip: (input: CreateTripInput) => string;
  addPerson: (tripId: string, input: AddPersonInput) => void;
  addExpense: (tripId: string, input: AddExpenseInput) => void;
  toggleTransferPaid: (tripId: string, mode: SettlementMode, key: string) => void;
  runSettlement: (tripId: string) => void;
  updateMemberEmt: (
    tripId: string,
    memberId: string,
    patch: Pick<TripMember, 'emtName' | 'emtEmail' | 'emtPhone'>,
  ) => void;
  updateTrip: (tripId: string, patch: Partial<Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'settlementMode'>>) => void;
  markTripSettled: (tripId: string) => void;
}

const TripsContext = createContext<TripsContextValue | null>(null);

function createSeedTrip(): Trip {
  const members: TripMember[] = [
    {
      id: 'A',
      displayName: 'Eric',
      teamId: 'AC',
      role: 'organizer',
      memberStatus: 'joined',
      emtName: 'Eric Hao',
      emtEmail: 'eric@example.com',
      emtPhone: '647-111-2222',
    },
    {
      id: 'B',
      displayName: 'Ben',
      teamId: 'BD',
      role: 'participant',
      memberStatus: 'manually_added',
      emtName: 'Ben Lam',
      emtEmail: 'ben@example.com',
      emtPhone: '647-222-3333',
    },
    {
      id: 'C',
      displayName: 'Carol',
      teamId: 'AC',
      role: 'participant',
      memberStatus: 'manually_added',
      emtEmail: 'carol@example.com',
    },
    {
      id: 'D',
      displayName: 'Dylan',
      teamId: 'BD',
      role: 'participant',
      memberStatus: 'manually_added',
      emtEmail: 'dylan@example.com',
    },
  ];

  const teams: Team[] = [
    { id: 'AC', name: 'AC Couple', receiverMemberId: 'A' },
    { id: 'BD', name: 'BD Couple', receiverMemberId: 'B' },
  ];

  return {
    id: 'trip-banff',
    name: 'Banff Trip',
    tripType: 'Trip',
    destination: 'Banff, Alberta',
    startDate: '2026-05-20',
    endDate: '2026-05-25',
    currency: 'CAD',
    status: 'ready_to_settle',
    settlementMode: 'team',
    members,
    teams,
    expenses: [
      {
        id: 'expense-1',
        payerMemberId: 'A',
        amountCents: 200000,
        splits: buildEqualSplits(['A', 'B', 'C', 'D'], 200000),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Hotel',
        note: 'Banff Hotel',
        expenseDate: '2026-05-24',
      },
      {
        id: 'expense-2',
        payerMemberId: 'B',
        amountCents: 42050,
        splits: buildEqualSplits(['A', 'B', 'C', 'D'], 42050),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Food',
        note: 'Food & Drinks',
        expenseDate: '2026-05-24',
      },
      {
        id: 'expense-3',
        payerMemberId: 'A',
        amountCents: 18000,
        splits: buildEqualSplits(['A', 'B', 'C', 'D'], 18000),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Gas',
        note: 'Transportation',
        expenseDate: '2026-05-22',
      },
      {
        id: 'expense-4',
        payerMemberId: 'C',
        amountCents: 26000,
        splits: buildEqualSplits(['A', 'B', 'C', 'D'], 26000),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Shopping',
        note: 'Shopping',
        expenseDate: '2026-05-23',
      },
    ],
    paidIndividualKeys: [],
    paidTeamKeys: [],
    lastSettlementAt: null,
    expensesRevision: 0,
  };
}

function createSeedWaterlooTrip(): Trip {
  const members: TripMember[] = [
    { id: 'W1', displayName: 'Alex', role: 'organizer', memberStatus: 'joined', emtEmail: 'alex@example.com' },
    { id: 'W2', displayName: 'Blake', role: 'participant', memberStatus: 'manually_added', emtEmail: 'blake@example.com' },
    { id: 'W3', displayName: 'Casey', role: 'participant', memberStatus: 'manually_added', emtEmail: 'casey@example.com' },
    { id: 'W4', displayName: 'Dana', role: 'participant', memberStatus: 'manually_added', emtEmail: 'dana@example.com' },
  ];

  return {
    id: 'trip-waterloo',
    name: 'Waterloo Dinner',
    tripType: 'Dinner',
    destination: 'Waterloo, ON',
    startDate: '2026-05-18',
    endDate: '2026-05-18',
    currency: 'CAD',
    status: 'active',
    settlementMode: 'individual',
    members,
    teams: [],
    expenses: [
      {
        id: 'expense-w1',
        payerMemberId: 'W2',
        amountCents: 18840,
        splits: buildEqualSplits(['W1', 'W2', 'W3', 'W4'], 18840),
        participantIds: ['W1', 'W2', 'W3', 'W4'],
        splitMethod: 'equal',
        category: 'Food',
        note: 'Dinner tab',
        expenseDate: '2026-05-18',
      },
    ],
    paidIndividualKeys: [],
    paidTeamKeys: [],
    lastSettlementAt: null,
    expensesRevision: 0,
  };
}

function bumpExpensesRevision(trip: Trip): Trip {
  const revision = trip.lastSettlementAt ? trip.expensesRevision + 1 : trip.expensesRevision;
  const next = { ...trip, expensesRevision: revision };
  return { ...next, status: deriveTripStatus(next) };
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([createSeedTrip(), createSeedWaterlooTrip()]);
  const [activeMemberId] = useState('A');

  const tripList = useMemo(() => trips.map(buildTripListItem), [trips]);

  const getTrip = useCallback((tripId: string) => trips.find((t) => t.id === tripId), [trips]);

  const getTripListItem = useCallback(
    (tripId: string) => tripList.find((t) => t.id === tripId),
    [tripList],
  );

  const getIndividualTransfers = useCallback(
    (tripId: string) => {
      const trip = trips.find((t) => t.id === tripId);
      return trip ? buildTransfersForTrip(trip, 'individual') : [];
    },
    [trips],
  );

  const getTeamTransfers = useCallback(
    (tripId: string) => {
      const trip = trips.find((t) => t.id === tripId);
      return trip ? buildTransfersForTrip(trip, 'team') : [];
    },
    [trips],
  );

  const getTripDashboard = useCallback(
    (tripId: string) => {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) return null;
      return buildDashboardSummary(
        trip,
        buildTransfersForTrip(trip, 'individual'),
        buildTransfersForTrip(trip, 'team'),
      );
    },
    [trips],
  );

  const updateTripInState = useCallback((tripId: string, updater: (trip: Trip) => Trip) => {
    setTrips((current) =>
      current.map((trip) => {
        if (trip.id !== tripId) return trip;
        const next = updater(trip);
        return { ...next, status: deriveTripStatus(next) };
      }),
    );
  }, []);

  const createTrip = useCallback((input: CreateTripInput): string => {
    const id = `trip-${Date.now()}`;
    const organizer: TripMember = {
      id: `member-${Date.now()}`,
      displayName: input.organizerName.trim() || 'Organizer',
      role: 'organizer',
      memberStatus: 'joined',
    };

    const newTrip: Trip = {
      id,
      name: input.name.trim(),
      tripType: input.tripType ?? 'Trip',
      destination: input.destination.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      currency: 'CAD',
      status: 'planning',
      settlementMode: input.settlementMode ?? 'individual',
      members: [organizer],
      teams: [],
      expenses: [],
      paidIndividualKeys: [],
      paidTeamKeys: [],
      lastSettlementAt: null,
      expensesRevision: 0,
    };

    setTrips((current) => [newTrip, ...current]);
    return id;
  }, []);

  const addPerson = useCallback((tripId: string, input: AddPersonInput) => {
    updateTripInState(tripId, (trip) => {
      const member: TripMember = {
        id: `member-${Date.now()}`,
        displayName: input.displayName.trim(),
        nickname: input.nickname,
        role: input.role ?? 'participant',
        memberStatus: input.memberStatus ?? 'manually_added',
        teamId: input.teamId,
        emtEmail: input.emtEmail,
        emtPhone: input.emtPhone,
      };
      return { ...trip, members: [...trip.members, member] };
    });
  }, [updateTripInState]);

  const addExpense = useCallback((tripId: string, input: AddExpenseInput) => {
    if (input.amountCents <= 0 || !Number.isInteger(input.amountCents)) {
      throw new Error('Amount must be positive.');
    }

    const participants = input.participantIds.filter(Boolean);
    const splits =
      input.splitMethod === 'equal'
        ? buildEqualSplits(participants, input.amountCents)
        : buildCustomSplits(participants, input.customSharesCents ?? {}, input.amountCents);

    updateTripInState(tripId, (trip) => {
      const next = {
        ...trip,
        expenses: [
          {
            id: `expense-${Date.now()}`,
            payerMemberId: input.payerMemberId,
            amountCents: input.amountCents,
            splits,
            participantIds: participants,
            splitMethod: input.splitMethod,
            category: input.category,
            note: input.note,
            expenseDate: input.expenseDate,
          },
          ...trip.expenses,
        ],
      };
      return bumpExpensesRevision(next);
    });
  }, [updateTripInState]);

  const toggleTransferPaid = useCallback((tripId: string, mode: SettlementMode, key: string) => {
    updateTripInState(tripId, (trip) => {
      if (mode === 'individual') {
        const keys = trip.paidIndividualKeys.includes(key)
          ? trip.paidIndividualKeys.filter((k) => k !== key)
          : [...trip.paidIndividualKeys, key];
        return { ...trip, paidIndividualKeys: keys };
      }
      const keys = trip.paidTeamKeys.includes(key)
        ? trip.paidTeamKeys.filter((k) => k !== key)
        : [...trip.paidTeamKeys, key];
      return { ...trip, paidTeamKeys: keys };
    });
  }, [updateTripInState]);

  const runSettlement = useCallback((tripId: string) => {
    updateTripInState(tripId, (trip) => ({
      ...trip,
      lastSettlementAt: new Date().toISOString(),
      expensesRevision: 0,
      status: 'settled' as const,
    }));
  }, [updateTripInState]);

  const updateMemberEmt = useCallback(
    (tripId: string, memberId: string, patch: Pick<TripMember, 'emtName' | 'emtEmail' | 'emtPhone'>) => {
      updateTripInState(tripId, (trip) => ({
        ...trip,
        members: trip.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
      }));
    },
    [updateTripInState],
  );

  const updateTrip = useCallback(
    (tripId: string, patch: Partial<Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'settlementMode'>>) => {
      updateTripInState(tripId, (trip) => ({ ...trip, ...patch }));
    },
    [updateTripInState],
  );

  const markTripSettled = useCallback((tripId: string) => {
    runSettlement(tripId);
  }, [runSettlement]);

  const value = useMemo<TripsContextValue>(
    () => ({
      trips,
      tripList,
      activeMemberId,
      getTrip,
      getTripListItem,
      getTripDashboard,
      getIndividualTransfers,
      getTeamTransfers,
      canSettleTrip: (tripId) => {
        const trip = trips.find((t) => t.id === tripId);
        return trip ? canSettle(trip) : { ok: false, reason: 'Trip not found.' };
      },
      createTrip,
      addPerson,
      addExpense,
      toggleTransferPaid,
      runSettlement,
      updateMemberEmt,
      updateTrip,
      markTripSettled,
    }),
    [
      trips,
      tripList,
      activeMemberId,
      getTrip,
      getTripListItem,
      getTripDashboard,
      getIndividualTransfers,
      getTeamTransfers,
      createTrip,
      addPerson,
      addExpense,
      toggleTransferPaid,
      runSettlement,
      updateMemberEmt,
      updateTrip,
      markTripSettled,
    ],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used inside TripsProvider.');
  return ctx;
}

export function useTrip(tripId: string) {
  const ctx = useTrips();
  const trip = ctx.getTrip(tripId);
  const listItem = ctx.getTripListItem(tripId);
  const dashboard = ctx.getTripDashboard(tripId);
  const individualTransfers = ctx.getIndividualTransfers(tripId);
  const teamTransfers = ctx.getTeamTransfers(tripId);
  const settleCheck = ctx.canSettleTrip(tripId);

  return {
    ...ctx,
    trip,
    listItem,
    dashboard,
    individualTransfers,
    teamTransfers,
    settleCheck,
  };
}
