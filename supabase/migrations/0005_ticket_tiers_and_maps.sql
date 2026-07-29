-- ============================================================================
-- Ticket tiers — an event can now offer multiple priced tiers (e.g. Regular,
-- VIP, VVIP) instead of a single flat price. Existing `events.ticket_price` /
-- `ticket_currency` columns are left in place (harmless) for backward
-- compatibility, but the tier table is what the ticket-buying flow uses now.
-- ============================================================================
create table if not exists public.event_ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  currency text not null default 'KES',
  description text,
  capacity integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_ticket_tiers_event_idx on public.event_ticket_tiers(event_id);

alter table public.tickets add column if not exists tier_id uuid references public.event_ticket_tiers(id);

-- A Google Maps share link the admin pastes in — simplest reliable way to give
-- attendees a "Get Directions" button without needing a geocoding API/key.
alter table public.events add column if not exists map_url text;

alter table public.event_ticket_tiers enable row level security;

drop policy if exists "ticket_tiers_public_read" on public.event_ticket_tiers;
create policy "ticket_tiers_public_read" on public.event_ticket_tiers
  for select using (
    exists (select 1 from public.events e where e.id = event_id and (e.status <> 'draft' or public.is_admin()))
  );

drop policy if exists "ticket_tiers_admin_write" on public.event_ticket_tiers;
create policy "ticket_tiers_admin_write" on public.event_ticket_tiers
  for all using (public.is_admin()) with check (public.is_admin());
