import type {
  Category,
  Expense,
  ExpenseSplit,
  Group,
  GroupInvitation,
  GroupMember,
  Profile,
  Receipt,
  Settlement,
  Team,
  TeamMember,
  User,
} from '../types/models';

/** Read cache shape hydrated from Supabase. */
export interface DatabaseSnapshot {
  users: User[];
  profiles: Profile[];
  groups: Group[];
  groupMembers: GroupMember[];
  groupInvitations: GroupInvitation[];
  teams: Team[];
  teamMembers: TeamMember[];
  expenses: Expense[];
  expenseSplits: ExpenseSplit[];
  settlements: Settlement[];
  receipts: Receipt[];
  categories: Category[];
}
