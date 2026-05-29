import type {
  CurrencyCode,
  ExpenseType,
  Group,
  GroupInvitation,
  GroupMember,
  GroupStatus,
  GroupType,
  PreferredEmtMethod,
  SettlementMode,
  SplitMethod,
} from './models';

export interface CreateGroupInput {
  name: string;
  type: GroupType;
  currency?: CurrencyCode;
  startDate: string;
  endDate: string;
  settlementMode: SettlementMode;
  status?: GroupStatus;
  ownerId: string;
}

export interface CreateGroupWithInvitationsInput {
  name: string;
  type: GroupType;
  startDate: string;
  endDate?: string | null;
  invitedEmails: string[];
  message?: string;
}

export interface CreateGroupWithInvitationsResult {
  group: Group;
  members: GroupMember[];
  invitations: GroupInvitation[];
}

export interface CreateGroupInvitationInput {
  groupId: string;
  invitedBy: string;
  invitedEmail: string;
  message?: string;
}

export interface UpdateGroupInput {
  name?: string;
  type?: GroupType;
  startDate?: string;
  endDate?: string | null;
  settlementMode?: SettlementMode;
  status?: GroupStatus;
}

export interface AddGroupMemberInput {
  groupId: string;
  displayName: string;
  userId?: string;
  email?: string;
  nickname?: string;
  avatarColor?: string;
  emtEmail?: string;
  emtPhone?: string;
  preferredEmtMethod?: PreferredEmtMethod;
  role?: string;
  invitationStatus?: 'active' | 'pending' | 'declined' | 'removed';
  isActive?: boolean;
  teamId?: string;
}

export interface UpdateGroupMemberInput {
  displayName?: string;
  nickname?: string;
  avatarColor?: string;
  emtEmail?: string;
  emtPhone?: string;
  preferredEmtMethod?: PreferredEmtMethod;
  role?: string;
  invitationStatus?: 'active' | 'pending' | 'declined' | 'removed';
  isActive?: boolean;
}

export interface CreateExpenseInput {
  type: ExpenseType;
  userId: string;
  amountCents: number;
  currency?: CurrencyCode;
  categoryId?: string;
  category: string;
  description: string;
  note?: string;
  receiptId?: string;
  expenseDate: string;
  groupId?: string;
  payerMemberId?: string;
  splitMethod?: SplitMethod;
  participantMemberIds?: string[];
  customSplits?: { memberId: string; shareAmountCents: number }[];
  receiptLocalUri?: string;
}

export interface CreatePersonalExpenseInput {
  amountCents: number;
  currency?: CurrencyCode;
  categoryId?: string;
  categoryName: string;
  description: string;
  note?: string;
  expenseDate: string;
  receiptLocalUri?: string;
  receiptConversion?: ReceiptConversionMetadata;
}

export interface CreateSplitExpenseInput {
  groupId: string;
  payerMemberId: string;
  amountCents: number;
  currency?: CurrencyCode;
  categoryId?: string;
  categoryName: string;
  description: string;
  note?: string;
  expenseDate: string;
  splitMethod: SplitMethod;
  splits: { memberId: string; shareAmountCents: number }[];
  receiptLocalUri?: string;
  receiptConversion?: ReceiptConversionMetadata;
}

export interface UpdateExpenseInput {
  amountCents?: number;
  categoryId?: string;
  category?: string;
  description?: string;
  note?: string;
  receiptId?: string;
  expenseDate?: string;
  payerMemberId?: string;
  participantMemberIds?: string[];
  customSplits?: { memberId: string; shareAmountCents: number }[];
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  emtEmail?: string;
  emtPhone?: string;
  preferredEmtMethod?: PreferredEmtMethod;
  defaultCurrency?: CurrencyCode;
}

export interface ReceiptConversionMetadata {
  originalAmountMinor?: number;
  originalCurrency?: CurrencyCode;
  convertedAmountMinor?: number;
  convertedCurrency?: CurrencyCode;
  exchangeRate?: number;
  exchangeRateProvider?: string;
  exchangeRateTimestamp?: string;
}
