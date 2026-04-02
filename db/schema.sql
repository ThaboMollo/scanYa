create table users (
  id uuid primary key,
  email varchar(255) not null unique,
  password_hash text not null,
  role varchar(32) not null check (role in ('asset_owner', 'event_organizer', 'attendee')),
  name varchar(255) not null,
  company varchar(255),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table assets (
  id uuid primary key,
  owner_id uuid not null references users(id),
  title varchar(255) not null,
  category varchar(120) not null,
  description text not null,
  location varchar(255) not null,
  minimum_notice_hours int not null default 0,
  minimum_rental_hours int not null default 1,
  price_label varchar(255) not null,
  status varchar(32) not null check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table asset_availability_rules (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_hour int not null check (start_hour between 0 and 23),
  end_hour int not null check (end_hour between 1 and 24)
);

create table bookings (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  requester_id uuid not null references users(id),
  contact_name varchar(255) not null,
  contact_email varchar(255) not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status varchar(32) not null check (status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create table qr_codes (
  id uuid primary key,
  owner_id uuid not null references users(id),
  target_type varchar(32) not null check (target_type in ('asset_booking', 'event_page')),
  target_id uuid not null,
  token varchar(255) not null unique,
  status varchar(32) not null check (status in ('active', 'disabled')),
  scan_count int not null default 0
);
