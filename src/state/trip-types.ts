import { Team } from '../core/settlement';
import type { ExpenseRecord, MemberProfile, SplitMethod } from './settle-context';

export type TripStatus = 'planning' | 'active' | 'ready_to_settle' | 'settled' | 'archived';
export type MemberTripStatus = 'invited' | 'joined' | 'manually_added';
export type MemberRole = 'organizer' | 'participant';
export type SettlementMode = 'individual' | 'team';

export interface TripMember extends MemberProfile {
  nickname?: string;
  role: MemberRole;
  memberStatus: MemberTripStatus;
}

export type TripType = 'Trip' | 'Dinner' | 'Camping' | 'Skiing' | 'Roommate' | 'Other';

export interface Trip {
  id: string;
  name: string;
  tripType?: TripType;
  destination: string;
  startDate: string;
  endDate: string;
  currency: 'CAD';
  status: TripStatus;
  settlementMode: SettlementMode;
  members: TripMember[];
  teams: Team[];
  expenses: ExpenseRecord[];
  paidIndividualKeys: string[];
  paidTeamKeys: string[];
  /** ISO timestamp of last settlement run; expenses changed after this => outdated */
  lastSettlementAt: string | null;
  expensesRevision: number;
}

export interface CreateTripInput {
  name: string;
  tripType?: TripType;
  destination: string;
  startDate: string;
  endDate: string;
  settlementMode?: SettlementMode;
  organizerName: string;
}

export interface AddPersonInput {
  displayName: string;
  nickname?: string;
  role?: MemberRole;
  memberStatus?: MemberTripStatus;
  teamId?: string;
  emtEmail?: string;
  emtPhone?: string;
}

export interface TripListItem {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  memberCount: number;
  expenseCount: number;
  totalSpentCents: number;
  statusHint: string;
  settlementOutdated: boolean;
}

export type { ExpenseRecord, MemberProfile, SplitMethod };
