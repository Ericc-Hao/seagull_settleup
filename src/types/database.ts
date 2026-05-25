/**
 * Supabase / Postgres row types (snake_case).
 * Run `db/supabase_app_schema.sql` in the Supabase SQL editor to create tables.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SettlementModeDb = 'individual' | 'team';
export type GroupStatusDb = 'planning' | 'active' | 'inactive' | 'ready_to_settle' | 'settled' | 'archived';
export type ExpenseTypeDb = 'personal' | 'split';
export type SplitMethodDb = 'equal' | 'custom';
export type SplitTypeDb = 'equal' | 'custom_amount';
export type SettlementStatusDb = 'pending' | 'paid' | 'cancelled';
export type EmtMethodDb = 'email' | 'phone';

export interface UserRow {
  id: string;
  email: string | null;
  name: string;
  default_currency: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  default_currency: string;
  emt_email: string | null;
  emt_phone: string | null;
  preferred_emt_method: EmtMethodDb | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupRow {
  id: string;
  owner_id: string | null;
  name: string;
  type: string;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  settlement_mode: SettlementModeDb;
  status: GroupStatusDb;
  cover_icon: string | null;
  inactive_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string;
  nickname: string | null;
  avatar_color: string | null;
  emt_email: string | null;
  emt_phone: string | null;
  preferred_emt_method: EmtMethodDb | null;
  role: string;
  is_active: boolean;
  invitation_status: 'active' | 'pending' | 'declined' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface GroupInvitationRow {
  id: string;
  group_id: string;
  invited_by: string;
  invited_email: string;
  invited_user_id: string | null;
  group_member_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  token: string | null;
  message: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  email_sent_at: string | null;
  email_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  group_id: string;
  name: string;
  receiver_member_id: string | null;
  payer_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  member_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  group_id: string | null;
  type: ExpenseTypeDb;
  payer_member_id: string | null;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  note: string | null;
  expense_date: string;
  receipt_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExpenseSplitRow {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount_cents: number;
  split_type: SplitTypeDb | string;
  created_at: string;
  updated_at: string;
}

export interface SettlementRow {
  id: string;
  group_id: string;
  mode: SettlementModeDb;
  from_member_id: string | null;
  to_member_id: string | null;
  from_team_id: string | null;
  to_team_id: string | null;
  amount_cents: number;
  currency: string;
  status: SettlementStatusDb;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptRow {
  id: string;
  expense_id: string | null;
  user_id: string;
  group_id: string | null;
  storage_path: string;
  public_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  ocr_status: 'none' | 'pending' | 'completed' | 'failed';
  ocr_text: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationTypeDb =
  | 'group_invitation'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'group_update'
  | 'expense_update'
  | 'settlement_update'
  | 'system';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationTypeDb;
  title: string;
  body: string | null;
  data: Json;
  group_id: string | null;
  is_read: boolean;
  read_at: string | null;
  cleared_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'personal' | 'split' | 'both';
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      groups: TableDef<GroupRow>;
      group_members: TableDef<GroupMemberRow>;
      group_invitations: TableDef<GroupInvitationRow>;
      teams: TableDef<TeamRow>;
      team_members: TableDef<TeamMemberRow>;
      expenses: TableDef<ExpenseRow>;
      expense_splits: TableDef<ExpenseSplitRow>;
      settlements: TableDef<SettlementRow>;
      receipts: TableDef<ReceiptRow>;
      categories: TableDef<CategoryRow>;
      notifications: TableDef<NotificationRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
