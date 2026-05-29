/** Shared Supabase select fragments aligned with mappers (avoid select('*') on lists). */

export const GROUP_COLUMNS =
  'id, name, type, currency, start_date, end_date, settlement_mode, status, owner_id, cover_icon, inactive_at, deleted_at, created_at, updated_at';

export const NOTIFICATION_COLUMNS =
  'id, user_id, type, title, body, data, group_id, is_read, read_at, cleared_at, created_at, updated_at';

export const SETTLEMENT_COLUMNS =
  'id, group_id, mode, from_member_id, to_member_id, from_team_id, to_team_id, amount_cents, currency, status, paid_at, note, metadata, created_at, updated_at';

export const GROUP_INVITATION_COLUMNS =
  'id, group_id, invited_by, invited_email, invited_user_id, group_member_id, status, token, message, expires_at, accepted_at, declined_at, email_sent_at, email_error, created_at, updated_at';

export const RECEIPT_COLUMNS =
  'id, expense_id, user_id, group_id, storage_path, public_url, file_name, mime_type, file_size, ocr_status, ocr_text, original_amount_minor, original_currency, converted_amount_minor, converted_currency, exchange_rate, exchange_rate_provider, exchange_rate_timestamp, created_at, updated_at';

export const NOTIFICATION_LIST_LIMIT = 50;
export const SETTLEMENT_LIST_LIMIT = 100;
export const RECEIPT_LIST_LIMIT = 100;
export const PENDING_INVITATION_SYNC_LIMIT = 20;
