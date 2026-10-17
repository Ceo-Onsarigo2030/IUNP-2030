-- ============================================================================
-- 0014 — Ticketing safeguards for bulk purchases
-- Safe to re-run.
--
--  * reserve_ticket(): ATOMIC seat reservation. It locks the ticket type (and event) row while it
--    counts, so thousands of simultaneous buyers can never oversell a capacity-limited ticket.
--    It also refuses closed events / inactive tiers, a second live payment prompt on the same
--    phone, and phones over the per-event ticket cap. Callable ONLY by the server (service role).
--  * Gate check-in tracking: a ticket can be admitted once.
--  * One M-Pesa receipt can only ever back one ticket (blocks replaying a single payment).
--  * Indexes so ticket counting stays instant with many thousands of rows.
-- ============================================================================

alter table public.tickets add column if not exists checked_in_at timestamptz;
alter table public.tickets add column if not exists checked_in_by uuid references auth.users(id);

create unique index if not exists tickets_mpesa_receipt_unique on public.tickets (mpesa_receipt) where mpesa_receipt is not null;
create index if not exists tickets_phone_event_idx on public.tickets (buyer_phone, event_id, status);
create index if not exists tickets_email_idx on public.tickets (lower(buyer_email));
create index if not exists tickets_pending_created_idx on public.tickets (created_at) where status = 'pending';
create index if not exists tickets_checked_in_idx on public.tickets (event_id) where checked_in_at is not null;

create or replace function public.reserve_ticket(
  p_event_id uuid,
  p_tier_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_max_per_phone integer default 10,
  p_hold_minutes integer default 10
)
returns table(ticket_id uuid, amount numeric, event_slug text, event_title text, tier_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.event_ticket_tiers%rowtype;
  v_event public.events%rowtype;
  v_taken integer;
  v_id uuid;
begin
  -- Lock the ticket type first, then the event (always in this order, so concurrent buyers queue instead of deadlocking).
  select * into v_tier from public.event_ticket_tiers where id = p_tier_id and event_id = p_event_id for update;
  if not found or coalesce(v_tier.is_active, true) = false then
    raise exception 'TIER_UNAVAILABLE';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status not in ('upcoming', 'current') then
    raise exception 'EVENT_CLOSED';
  end if;

  -- One live payment prompt per phone + ticket type.
  if exists (
    select 1 from public.tickets
    where buyer_phone = p_phone and tier_id = p_tier_id and status = 'pending'
      and created_at > now() - interval '3 minutes'
  ) then
    raise exception 'DUPLICATE_PENDING';
  end if;

  -- Per-phone cap (stops a single number hoarding seats).
  if (select count(*) from public.tickets where buyer_phone = p_phone and event_id = p_event_id and status = 'paid') >= p_max_per_phone then
    raise exception 'PHONE_LIMIT';
  end if;

  -- Capacity of this ticket type: paid + payments still in flight.
  if v_tier.capacity is not null then
    select count(*) into v_taken from public.tickets
    where tier_id = p_tier_id
      and (status = 'paid' or (status = 'pending' and created_at > now() - make_interval(mins => p_hold_minutes)));
    if v_taken >= v_tier.capacity then raise exception 'SOLD_OUT'; end if;
  end if;

  -- Capacity of the whole event.
  if v_event.capacity is not null then
    select count(*) into v_taken from public.tickets
    where event_id = p_event_id
      and (status = 'paid' or (status = 'pending' and created_at > now() - make_interval(mins => p_hold_minutes)));
    if v_taken >= v_event.capacity then raise exception 'SOLD_OUT'; end if;
  end if;

  insert into public.tickets (event_id, tier_id, buyer_name, buyer_email, buyer_phone, amount, status)
  values (p_event_id, p_tier_id, p_name, p_email, p_phone, v_tier.price, 'pending')
  returning id into v_id;

  return query select v_id, v_tier.price, v_event.slug, v_event.title, v_tier.name;
end;
$$;

revoke all on function public.reserve_ticket(uuid, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_ticket(uuid, uuid, text, text, text, integer, integer) to service_role;

-- has_role() is only called from inside is_admin() (SECURITY DEFINER), so the API roles don't need it.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
