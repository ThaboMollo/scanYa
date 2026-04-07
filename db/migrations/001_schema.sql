-- Profiles table (linked to Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role varchar(32) not null check (role in ('asset_owner', 'event_organizer', 'attendee')),
  name varchar(255) not null,
  company varchar(255),
  created_at timestamptz not null default now()
);

-- Assets
create table assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  title varchar(255) not null,
  category varchar(120) not null,
  description text not null,
  location varchar(255) not null,
  minimum_notice_hours int not null default 0,
  minimum_rental_hours int not null default 1,
  price_label varchar(255) not null,
  status varchar(32) not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

-- Availability rules
create table asset_availability_rules (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_hour int not null check (start_hour between 0 and 23),
  end_hour int not null check (end_hour between 1 and 24)
);

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  requester_id uuid references profiles(id),
  contact_name varchar(255) not null,
  contact_email varchar(255) not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status varchar(32) not null default 'pending'
    check (status in ('pending_verification', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  verification_token varchar(255) unique,
  verification_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- QR codes
create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  target_type varchar(32) not null check (target_type in ('asset_booking', 'event_page')),
  target_id uuid not null,
  token varchar(255) not null unique,
  status varchar(32) not null default 'active' check (status in ('active', 'disabled')),
  scan_count int not null default 0
);

-- Indexes
create index idx_assets_owner on assets(owner_id);
create index idx_assets_status on assets(status);
create index idx_bookings_asset on bookings(asset_id);
create index idx_bookings_requester on bookings(requester_id);
create index idx_bookings_time on bookings(asset_id, start_at, end_at);
create index idx_availability_asset on asset_availability_rules(asset_id);
create index idx_qr_token on qr_codes(token);
create index idx_bookings_verification on bookings(verification_token) where verification_token is not null;

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table assets enable row level security;
alter table asset_availability_rules enable row level security;
alter table bookings enable row level security;
alter table qr_codes enable row level security;

-- Profiles: users read/update own, public reads name+role
create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Public reads profile name"
  on profiles for select using (true);

-- Assets: anyone reads published, owner manages own
create policy "Public reads published assets"
  on assets for select using (status = 'published');
create policy "Owner reads own assets"
  on assets for select using (auth.uid() = owner_id);
create policy "Owner inserts assets"
  on assets for insert with check (auth.uid() = owner_id);
create policy "Owner updates own assets"
  on assets for update using (auth.uid() = owner_id);

-- Availability rules: anyone reads, owner manages for own assets
create policy "Public reads availability"
  on asset_availability_rules for select using (true);
create policy "Owner manages availability"
  on asset_availability_rules for all using (
    asset_id in (select id from assets where owner_id = auth.uid())
  );

-- Bookings: requester reads own, asset owner reads for their assets
create policy "Requester reads own bookings"
  on bookings for select using (auth.uid() = requester_id);
create policy "Asset owner reads bookings"
  on bookings for select using (
    asset_id in (select id from assets where owner_id = auth.uid())
  );
create policy "Anyone creates bookings"
  on bookings for insert with check (true);
create policy "Asset owner updates booking status"
  on bookings for update using (
    asset_id in (select id from assets where owner_id = auth.uid())
  );

-- QR codes: owner manages, anyone reads active
create policy "Public reads active QR codes"
  on qr_codes for select using (status = 'active');
create policy "Owner manages QR codes"
  on qr_codes for all using (auth.uid() = owner_id);

-- Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'attendee'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
