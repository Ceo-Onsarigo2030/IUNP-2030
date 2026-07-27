-- ============================================================================
-- Season labeling — lets you reuse this system next year without losing
-- Season 1 data (just filter/create categories under a new season string).
-- ============================================================================
alter table public.gala_categories add column if not exists season text not null default 'Season 1';

-- ============================================================================
-- Phone + SMS one-time-code verification — a much stronger anti-fraud layer
-- than a device cookie alone. The device cookie is kept as a secondary signal;
-- the phone number (hashed, never stored in plain text) is the primary gate.
-- ============================================================================
create table if not exists public.gala_otp_codes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.gala_categories(id) on delete cascade,
  phone_hash text not null,
  code_hash text not null,
  attempts integer not null default 0,
  consumed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists gala_otp_lookup_idx on public.gala_otp_codes(category_id, phone_hash, consumed);

alter table public.gala_votes add column if not exists phone_hash text;

do $$ begin
  alter table public.gala_votes add constraint gala_votes_category_phone_unique unique (category_id, phone_hash);
exception when duplicate_object then null; end $$;

alter table public.gala_otp_codes enable row level security;
-- No public policies at all — every access goes through /api/gala/otp/* using the service-role client.
