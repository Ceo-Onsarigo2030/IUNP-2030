-- ============================================================================
-- 0012 — Make the DATABASE itself require two-step verification for admin powers
--
-- !! RUN THIS ONLY AFTER every admin has finished setting up two-step verification
-- !! (Admin Panel → Security & 2-Step) and has logged in once with their 6-digit code.
--
-- Until now the website blocked admins without a verified code, but someone holding an
-- admin password could still talk to the database API directly. After this migration,
-- admin row-level-security policies only pass for sessions at assurance level "aal2"
-- (password + authenticator code).
--
-- To undo (e.g. emergency): re-run the original definition:
--   create or replace function public.is_admin() returns boolean language sql stable
--   security definer set search_path = public as $$ select public.has_role(auth.uid(), 'admin'); $$;
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
