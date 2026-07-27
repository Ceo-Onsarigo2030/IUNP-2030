-- ============================================================================
-- Fix: form-based sign-ups never got a matching `profiles` row, because the
-- original handle_new_user() trigger only created `user_roles`. Google
-- sign-ups worked because /auth/callback inserted a profile manually — this
-- migration makes it automatic and consistent for both paths, and backfills
-- any accounts already affected.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict do nothing;

  -- Pull the fields passed at signUp() time (options.data / user_metadata).
  -- Google sign-ins carry full_name/name/email from the provider instead.
  insert into public.profiles (id, full_name, email, category, institution_name, has_disability, signup_method)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'category')::member_category, 'other'),
    new.raw_user_meta_data->>'institution_name',
    coalesce((new.raw_user_meta_data->>'has_disability')::boolean, false),
    coalesce((new.raw_user_meta_data->>'signup_method')::signup_method, 'form')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill: any auth user who somehow still has no profiles row (e.g. signed up
-- while this bug was live) gets one created now, so their dashboard stops
-- showing placeholder "Member / UniNexus-000" data.
insert into public.profiles (id, full_name, email, category, signup_method)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  coalesce((u.raw_user_meta_data->>'category')::member_category, 'other'),
  coalesce((u.raw_user_meta_data->>'signup_method')::signup_method, 'form')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
