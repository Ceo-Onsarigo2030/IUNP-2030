-- ============================================================================
-- 0008 — Ticket tiers: allow archiving instead of only delete.
-- A tier with real paid tickets against it can never be deleted (the foreign key
-- from tickets.tier_id correctly blocks that, to protect sales history) — but the
-- admin panel never told the admin *why* a delete silently did nothing. Adding an
-- is_active flag gives a real way to retire a tier (hide it from new purchases)
-- without losing its sales record.
-- ============================================================================

alter table public.event_ticket_tiers add column if not exists is_active boolean not null default true;
