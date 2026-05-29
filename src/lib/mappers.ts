import type {
  CategoryRow,
  ExpenseRow,
  ExpenseSplitRow,
  GroupInvitationRow,
  GroupMemberRow,
  GroupRow,
  NotificationRow,
  ProfileRow,
  ReceiptRow,
  SettlementRow,
  TeamMemberRow,
  TeamRow,
} from '../types/database';
import type {
  Category,
  CurrencyCode,
  Expense,
  ExpenseSplit,
  Group,
  GroupInvitation,
  GroupMember,
  GroupStatus,
  GroupType,
  Notification,
  NotificationData,
  NotificationType,
  Profile,
  Receipt,
  Settlement,
  SettlementMode,
  SettlementRecordStatus,
  Team,
  TeamMember,
  User,
} from '../types/models';

function toIso(value: string): string {
  return value.includes('T') ? value : `${value}T00:00:00.000Z`;
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.id,
    displayName: row.display_name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    defaultCurrency: (row.default_currency as CurrencyCode) ?? 'CAD',
    emtEmail: row.emt_email ?? undefined,
    emtPhone: row.emt_phone ?? undefined,
    preferredEmtMethod: row.preferred_emt_method ?? undefined,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Synthetic user view from profile (replaces public.users table). */
export function mapUserFromProfile(row: ProfileRow, email = ''): User {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email ?? email,
    defaultCurrency: (row.default_currency as CurrencyCode) ?? 'CAD',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    type: row.type as GroupType,
    currency: (row.currency as CurrencyCode) ?? 'CAD',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? null,
    settlementMode: row.settlement_mode as SettlementMode,
    status: row.status as GroupStatus,
    ownerId: row.owner_id ?? '',
    coverIcon: row.cover_icon ?? undefined,
    inactiveAt: row.inactive_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGroupMember(row: GroupMemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id ?? undefined,
    email: row.email ?? undefined,
    displayName: row.display_name,
    nickname: row.nickname ?? undefined,
    avatarColor: row.avatar_color ?? undefined,
    emtEmail: row.emt_email ?? undefined,
    emtPhone: row.emt_phone ?? undefined,
    preferredEmtMethod: row.preferred_emt_method ?? undefined,
    role: row.role,
    isActive: row.is_active,
    invitationStatus: row.invitation_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotificationData(value: NotificationRow['data']): NotificationData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const data: NotificationData = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === 'string') {
      data[key] = entry;
    }
  }
  return data;
}

export function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body ?? undefined,
    data: mapNotificationData(row.data),
    isRead: row.is_read,
    readAt: row.read_at ?? undefined,
    clearedAt: row.cleared_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGroupInvitation(row: GroupInvitationRow): GroupInvitation {
  return {
    id: row.id,
    groupId: row.group_id,
    invitedBy: row.invited_by,
    invitedEmail: row.invited_email,
    invitedUserId: row.invited_user_id ?? undefined,
    groupMemberId: row.group_member_id ?? undefined,
    status: row.status,
    token: row.token ?? undefined,
    message: row.message ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    declinedAt: row.declined_at ?? undefined,
    emailSentAt: row.email_sent_at ?? undefined,
    emailError: row.email_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    receiverMemberId: row.receiver_member_id ?? '',
    payerMemberId: row.payer_member_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTeamMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    teamId: row.team_id,
    memberId: row.member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    groupId: row.group_id ?? undefined,
    type: row.type,
    payerMemberId: row.payer_member_id ?? undefined,
    userId: row.user_id,
    amountCents: row.amount_cents,
    currency: (row.currency as CurrencyCode) ?? 'CAD',
    categoryId: row.category_id ?? undefined,
    category: row.category_name ?? 'Other',
    description: row.description ?? '',
    note: row.note ?? undefined,
    receiptId: row.receipt_id ?? undefined,
    expenseDate: toIso(row.expense_date),
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExpenseSplit(row: ExpenseSplitRow): ExpenseSplit {
  return {
    id: row.id,
    expenseId: row.expense_id,
    memberId: row.member_id,
    shareAmountCents: row.share_amount_cents,
    splitType: row.split_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    groupId: row.group_id,
    mode: row.mode as SettlementMode,
    fromMemberId: row.from_member_id ?? undefined,
    toMemberId: row.to_member_id ?? undefined,
    fromTeamId: row.from_team_id ?? undefined,
    toTeamId: row.to_team_id ?? undefined,
    amountCents: row.amount_cents,
    currency: (row.currency as CurrencyCode) ?? 'CAD',
    status: row.status as SettlementRecordStatus,
    paidAt: row.paid_at ?? undefined,
    note: row.note ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    expenseId: row.expense_id ?? undefined,
    userId: row.user_id,
    groupId: row.group_id ?? undefined,
    storagePath: row.storage_path,
    publicUrl: row.public_url ?? undefined,
    fileName: row.file_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    ocrStatus: row.ocr_status,
    ocrText: row.ocr_text ?? undefined,
    originalAmountMinor: row.original_amount_minor ?? undefined,
    originalCurrency: (row.original_currency as CurrencyCode) ?? undefined,
    convertedAmountMinor: row.converted_amount_minor ?? undefined,
    convertedCurrency: (row.converted_currency as CurrencyCode) ?? undefined,
    exchangeRate: row.exchange_rate ?? undefined,
    exchangeRateProvider: row.exchange_rate_provider ?? undefined,
    exchangeRateTimestamp: row.exchange_rate_timestamp ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    type: row.type,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
