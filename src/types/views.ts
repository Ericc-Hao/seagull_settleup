import type { IconName } from '../components/Icon';
import type { Expense } from './models';
import type { GroupType, SettlementMode } from './models';

export interface PendingInvitationView {
  id: string;
  groupId: string;
  groupName: string;
  groupType?: GroupType;
  invitedEmail: string;
  invitedBy: string;
  inviterName?: string;
  inviterEmail?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
}

export interface InvitationPreviewView {
  invitationId: string;
  token?: string;
  groupId?: string;
  groupName: string;
  inviterName?: string;
  inviterEmail?: string;
  invitedEmail: string;
  status: PendingInvitationView['status'];
  expiresAt?: string | null;
  isValid: boolean;
}

export interface GroupMemberWithProfile {
  id: string;
  groupId: string;
  userId?: string;
  email?: string;
  displayName: string;
  role?: string;
  invitationStatus?: 'active' | 'pending' | 'declined' | 'removed' | 'cancelled';
  isActive?: boolean;
  avatarUrl?: string;
  avatarLabel: string;
  isRegistered: boolean;
  invitationId?: string;
}

export interface GroupSelectorOption {
  id: string;
  name: string;
  type: string;
  memberCount: number;
}

export interface GroupCardView {
  id: string;
  name: string;
  memberCount: number;
  totalSpentCents: number;
  statusLabel: string;
  balanceLabel: string;
  balancePositive: boolean;
  balanceStatus?: 'owes' | 'owed' | 'settled';
  imageKey: 'mountains' | 'bridge';
}

export interface HomeOverviewView {
  monthLabel: string;
  totalSpentCents: number;
  youOwedCents: number;
  youOweCents: number;
}

export interface CategoryRowView {
  id: string;
  label: string;
  amountCents: number;
  icon: IconName;
  tint: string;
  bg: string;
  categoryKey?: string;
  categoryName?: string;
}

export interface SplitGroupCardView {
  id: string;
  name: string;
  balance: string;
  positive: boolean;
}

export interface GroupBalanceSummary {
  groupId: string;
  rawBalanceCents: number;
  adjustedBalanceCents: number;
  status: 'owes' | 'owed' | 'settled';
  label: string;
}

export interface SplitExpenseWithMyShare {
  expenseId: string;
  groupId: string;
  groupName: string;
  categoryName: string;
  description: string;
  totalAmountCents: number;
  myShareAmountCents: number;
  expenseDate: string;
  payerMemberId?: string;
  payerName?: string;
}

export type SplitExpenseSettlementStatus = 'not_split' | 'not_settled' | 'settled';

export interface RecentGroupExpenseView {
  expenseId: string;
  groupId: string;
  title: string;
  categoryName: string;
  categoryKey?: string;
  categoryId?: string;
  totalAmountCents: number;
  myShareAmountCents: number;
  payerName?: string;
  expenseDate: string;
  splitCount: number;
  settlementStatus: SplitExpenseSettlementStatus;
  includedInSplit: boolean;
  groupName?: string;
}

export interface CurrentUserMonthlyExpenseSummary {
  personalTotalCents: number;
  splitShareTotalCents: number;
  totalSpentCents: number;
  personalExpenses: Expense[];
  splitExpenses: SplitExpenseWithMyShare[];
}

export interface ExpenseSplitMemberView {
  memberId: string;
  displayName: string;
  avatarUrl?: string;
  avatarLabel: string;
  shareAmountCents: number;
  shareAmountDisplay: string;
  isCurrentUser: boolean;
}

export interface ExpenseDetailView {
  id: string;
  type: 'personal' | 'split';
  label: string;
  categoryName: string;
  groupId?: string;
  groupName?: string;
  totalAmountCents: number;
  totalAmountDisplay: string;
  myShareAmountCents?: number;
  myShareAmountDisplay?: string;
  payerName?: string;
  expenseDate: string;
  splits: ExpenseSplitMemberView[];
}

export interface ExpenseListItemView {
  id: string;
  label: string;
  subtitle?: string;
  detailText?: string;
  amount: string;
  amountCents: number;
  totalAmountCents?: number;
  myShareAmountCents?: number;
  icon: IconName;
  tint: string;
  bg: string;
  categoryKey?: string;
  categoryName?: string;
  categoryId?: string;
  groupId?: string;
  type: 'personal' | 'split';
}

export interface ExpensesSummaryView {
  monthLabel: string;
  totalSpentCents: number;
  personalTotalCents: number;
  splitShareCents: number;
}

export interface GroupsSummaryView {
  monthLabel: string;
  activeGroupCount: number;
  youOwedCents: number;
  youOweCents: number;
}

export interface ProfileSectionView {
  title: string;
  rows: {
    id: string;
    label: string;
    value: string;
    icon: IconName;
  }[];
}

export interface PendingTransferView {
  id: string;
  groupId: string;
  mode: SettlementMode;
  fromMemberId?: string;
  toMemberId?: string;
  fromMemberIds?: string[];
  toMemberIds?: string[];
  fromLabel: string;
  toLabel: string;
  amountCents: number;
  amountDisplay: string;
  currency: 'CAD';
  receiverName: string;
  receiverEmail?: string;
  receiverTransferEmail?: string;
  receiverEmtPhone?: string;
  receiverAvatarUrl?: string;
  receiverAvatarLabel?: string;
  groupName: string;
  paymentMessage: string;
  status: 'pending' | 'paid' | 'cancelled';
}
export interface SettlementHistoryItemView {
  id: string;
  groupId: string;
  mode: SettlementMode;
  amountCents: number;
  amountDisplay: string;
  paidAt: string;
  paidAtLabel: string;
  fromLabel: string;
  toLabel: string;
  receiverName: string;
  receiverEmail?: string;
  status: 'paid';
  summary: string;
}

/** @deprecated Use PendingTransferView */
export type SettlementTransferView = PendingTransferView;

export interface SettleUpView {
  groupId: string;
  groupName: string;
  subtitle: string;
  mode: SettlementMode;
  outgoingTransfers: PendingTransferView[];
  settlementHistory: SettlementHistoryItemView[];
}
