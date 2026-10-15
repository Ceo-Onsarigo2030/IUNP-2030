-- ============================================================================
-- 0013 — "Institutions on Board" de-duplication + campaign progress tracking
-- Safe to re-run. (Applied to production on 2026-10-15.)
--
-- The live counter treated "Kenyatta  university" (two spaces), "KENYATTA UNIVERSITY",
-- "The Technical University of Kenya" vs "Technical University of Kenya", "Co-operative" vs
-- "Cooperative" etc. as DIFFERENT institutions, because it only compared lower(trim()).
-- It now compares a normalised key (case, spacing, punctuation, apostrophes, a leading
-- "The", and "co-operative" all ignored), still honouring the institution_aliases table.
-- ============================================================================

create or replace function public.normalize_institution(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
           trim(regexp_replace(
             regexp_replace(
               regexp_replace(lower(coalesce(t, '')), '[''’`]', '', 'g'),
               'co[\s\-\.]+operative', 'cooperative', 'g'),
             '[^a-z0-9]+', ' ', 'g')),
         '^the ', '')
$$;

-- Common spellings / short forms that clearly mean the same institution.
insert into public.institution_aliases (alias, canonical_name)
select v.alias, v.canonical
from (values
  ('Nairobi University',        'University Of Nairobi'),
  ('Kenyetta University',       'Kenyatta University'),
  ('Kenyatta',                  'Kenyatta University'),
  ('Kenyattauniversity',        'Kenyatta University'),
  ('Jomo Kenyatta University',  'Jomo Kenyatta University of Agriculture and Technology'),
  ('Multimedia University',     'MULTIMEDIA UNIVERSITY OF KENYA'),
  ('Cooperative University',    'CO-OPERATIVE UNIVERSITY OF KENYA')
) as v(alias, canonical)
where not exists (
  select 1 from public.institution_aliases ia
  where public.normalize_institution(ia.alias) = public.normalize_institution(v.alias)
);

-- Obvious typos of the same institution.
insert into public.institution_aliases (alias, canonical_name)
select v.alias, v.canonical
from (values
  ('Kenyattta University',            'Kenyatta University'),
  ('Kenyataa University',             'Kenyatta University'),
  ('Kenyatta Universities',           'Kenyatta University'),
  ('Kenyatta University Nairobi Kenya','Kenyatta University'),
  ('Universiity of Nairobi',          'University Of Nairobi'),
  ('University of Nairobj',           'University Of Nairobi'),
  ('Universuty of Eldoret',           'UNIVERSITY OF ELDORET'),
  ('Eldoret University',              'UNIVERSITY OF ELDORET'),
  ('Karatinaa University',            'KARATINA UNIVERSITY'),
  ('Kisii Univer6',                   'KISII UNIVERSITY'),
  ('University of Cooperative University of Kenya', 'CO-OPERATIVE UNIVERSITY OF KENYA'),
  ('Jommo Kenyatta University of Agriculture and Technology', 'Jomo Kenyatta University of Agriculture and Technology'),
  ('Jomo Kenyatta University of Technology and Agriculture',  'Jomo Kenyatta University of Agriculture and Technology'),
  ('Jomo Kenyatta Unuversity of Agriculture and Technology',  'Jomo Kenyatta University of Agriculture and Technology'),
  ('Jomo Kenyatta Universityof Agriculture and Technologynology', 'Jomo Kenyatta University of Agriculture and Technology'),
  ('Jomo Kenyatta University of Science and Technology',      'Jomo Kenyatta University of Agriculture and Technology'),
  ('Kenya Scout Association',         'Kenya Scouts Association')
) as v(alias, canonical)
where not exists (
  select 1 from public.institution_aliases ia
  where public.normalize_institution(ia.alias) = public.normalize_institution(v.alias)
);

create or replace function public.get_public_stats()
returns table(members bigint, disability bigint, institutions bigint, events bigint)
language sql
stable
security definer
set search_path = public
as $$
  with al as (
    select public.normalize_institution(alias) as a, public.normalize_institution(canonical_name) as c
    from public.institution_aliases
  ),
  n as (
    select public.normalize_institution(institution_name) as k
    from public.profiles
    where institution_name is not null and trim(institution_name) <> ''
  )
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where has_disability),
    (select count(distinct coalesce(al.c, n.k)) from n left join al on al.a = n.k),
    (select count(*) from public.events);
$$;

-- Campaign progress: invalid / rejected addresses are skipped and counted, not fatal.
alter table public.email_campaigns add column if not exists skipped_count integer not null default 0;
