-- Receipt OCR conversion metadata for multi-currency scan flow.

alter table public.receipts
  add column if not exists original_amount_minor integer,
  add column if not exists original_currency text,
  add column if not exists converted_amount_minor integer,
  add column if not exists converted_currency text,
  add column if not exists exchange_rate numeric,
  add column if not exists exchange_rate_provider text,
  add column if not exists exchange_rate_timestamp timestamptz;

comment on column public.receipts.original_amount_minor is 'Detected receipt total in original currency minor units';
comment on column public.receipts.original_currency is 'ISO 4217 code detected on receipt';
comment on column public.receipts.converted_amount_minor is 'Amount converted to expense currency minor units';
comment on column public.receipts.converted_currency is 'Target currency used when saving expense';
comment on column public.receipts.exchange_rate is 'Applied exchange rate from original to converted currency';
comment on column public.receipts.exchange_rate_provider is 'Exchange rate provider identifier';
comment on column public.receipts.exchange_rate_timestamp is 'Timestamp associated with exchange rate quote';
