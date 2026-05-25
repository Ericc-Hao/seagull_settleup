/** Domain models — app layer; mapped from Supabase rows in src/lib/mappers.ts */

export type CurrencyCode = 'CAD';
export type GroupType = 'Trip' | 'Dinner' | 'Camping' | 'Skiing' | 'Roommate' | 'Other';
export type GroupStatus = 'planning' | 'active' | 'inactive' | 'ready_to_settle' | 'settled' | 'archived';
export type SettlementMode = 'individual' | 'team';
export type ExpenseType = 'personal' | 'split';
export type SplitMethod = 'equal' | 'custom';
export type SettlementRecordStatus = 'pending' | 'paid' | 'cancelled';
export type PreferredEmtMethod = 'email' | 'phone' | 'none';

export interface User {
  id: string;
  name: string;
  email: string;
  defaultCurrency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  defaultCurrency?: CurrencyCode;
  emtEmail?: string;
  emtPhone?: string;
  preferredEmtMethod?: PreferredEmtMethod;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  currency: CurrencyCode;
  startDate: string;
  endDate?: string | null;
  settlementMode: SettlementMode;
  status: GroupStatus;
  ownerId: string;
  coverIcon?: string;
  inactiveAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId?: string;
  email?: string;
  displayName: string;
  nickname?: string;
  avatarColor?: string;
  emtEmail?: string;
  emtPhone?: string;
  preferredEmtMethod?: PreferredEmtMethod;
  role?: string;
  isActive?: boolean;
  invitationStatus?: 'active' | 'pending' | 'declined' | 'removed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  invitedBy: string;
  invitedEmail: string;
  invitedUserId?: string;
  groupMemberId?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  token?: string;
  message?: string;
  expiresAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  emailSentAt?: string;
  emailError?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'group_invitation'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'group_update'
  | 'expense_update'
  | 'settlement_update'
  | 'system';

export interface NotificationData {
  invitationId?: string;
  groupId?: string;
  groupName?: string;
  invitedBy?: string;
  inviterName?: string;
  inviterEmail?: string;
  invitedEmail?: string;
  createdAt?: string;
  [key: string]: string | undefined;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data: NotificationData;
  isRead: boolean;
  readAt?: string;
  clearedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  groupId: string;
  name: string;
  receiverMemberId: string;
  payerMemberId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  memberId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  groupId?: string;
  type: ExpenseType;
  payerMemberId?: string;
  userId: string;
  amountCents: number;
  currency: CurrencyCode;
  categoryId?: string;
  category: string;
  description: string;
  note?: string;
  receiptId?: string;
  expenseDate: string;
  splitMethod?: SplitMethod;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  shareAmountCents: number;
  splitType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  mode: SettlementMode;
  fromMemberId?: string;
  toMemberId?: string;
  fromTeamId?: string;
  toTeamId?: string;
  amountCents: number;
  currency?: CurrencyCode;
  status: SettlementRecordStatus;
  paidAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  expenseId?: string;
  userId: string;
  groupId?: string;
  storagePath: string;
  publicUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  ocrStatus: 'none' | 'pending' | 'completed' | 'failed';
  ocrText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'personal' | 'split' | 'both';
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
