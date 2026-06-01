-- WhatsApp booking + system alerts feature

-- 1. Owner WhatsApp number (international digits-only, e.g. 27821234567)
alter table public.profiles
  add column if not exists whatsapp_number varchar(32);

-- 2. Booking location ("where the asset is needed")
alter table public.bookings
  add column if not exists location text;

-- 3. Allow super_admin role (the original CHECK omitted it)
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'asset_owner', 'event_organizer', 'attendee'));

-- 4. Privacy: stop the anon client reading whole profile rows.
--    WhatsApp numbers must never be readable by the public.
--    Owner-self reads remain via "Users read own profile"; public booking
--    contact details are served only by the authenticated API (service role).
drop policy if exists "Public reads profile name" on public.profiles;

-- 5. Tighten booking inserts. All booking inserts already go through the API
--    using the service-role key (which bypasses RLS), so this only removes the
--    unused public direct-insert path.
drop policy if exists "Anyone creates bookings" on public.bookings;
create policy "Authenticated users create bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = requester_id);
