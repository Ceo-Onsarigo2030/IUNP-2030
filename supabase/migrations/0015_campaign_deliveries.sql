-- 0015 — exact per-recipient delivery records for email campaigns (no double sends; targeted corrections).
create table if not exists public.email_campaign_deliveries (
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  email text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  primary key (campaign_id, email)
);
alter table public.email_campaign_deliveries enable row level security;
revoke all on public.email_campaign_deliveries from anon, authenticated;

-- A follow-up/correction campaign can be aimed at exactly the people who received another campaign.
alter table public.email_campaigns
  add column if not exists audience_from_campaign uuid references public.email_campaigns(id) on delete set null;
