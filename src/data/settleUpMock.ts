export type SettleMode = 'team' | 'individual';

export const SETTLE_UP_MOCK = {
  title: 'Settle Up',
  subtitle: 'Only 1 transfer needed',
  defaultMode: 'team' as SettleMode,

  teams: [
    { id: 'ac', name: 'AC Couple', memberIds: ['A', 'C'] as const, selected: true },
    { id: 'bd', name: 'BD Couple', memberIds: ['B', 'D'] as const, selected: false },
  ],

  summary: {
    direction: 'BD Couple pays AC Couple',
    amount: '$550.00 CAD',
    fromTeamId: 'bd',
    toTeamId: 'ac',
  },

  transfer: {
    receiver: 'A',
    emt: 'a@email.com',
    message: 'Banff Trip Settlement - BD Couple to AC Couple',
  },

  actions: {
    copyLabel: 'Copy EMT Info',
    markPaidLabel: 'Mark as Paid',
  },

  switchMode: {
    title: 'Switch to Individual Mode',
    hint: '3 transfers needed',
  },
} as const;
