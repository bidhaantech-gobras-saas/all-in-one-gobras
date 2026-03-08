-- =============================================
-- GOBRAS LOGISTICS - SUPABASE SCHEMA
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE (Super Admin only for now)
-- =============================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text unique not null,
  role text default 'super_admin' check (role in ('super_admin')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Admin')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- 2. CUSTOMERS TABLE
-- =============================================
create table customers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  email text unique,
  phone text,
  address text,
  city text,
  country text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- 3. SHIPMENTS TABLE
-- =============================================
create table shipments (
  id uuid default uuid_generate_v4() primary key,
  tracking_number text unique not null default 'GBR-' || upper(substr(md5(random()::text), 1, 6)),

  -- Customer
  customer_id uuid references customers(id) on delete set null,

  -- Origin
  origin_city text not null,
  origin_country text not null,
  origin_address text,

  -- Destination
  destination_city text not null,
  destination_country text not null,
  destination_address text,

  -- Weight & Volume
  weight_kg numeric(10,2),
  volume_cbm numeric(10,3),

  -- Status
  status text default 'pending' check (status in ('pending', 'in_transit', 'delivered', 'cancelled')),

  -- Dates
  shipped_date date,
  estimated_delivery date,
  actual_delivery date,

  -- Notes
  notes text,

  -- Meta
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- 4. AUTO UPDATE updated_at
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

create trigger update_customers_updated_at
  before update on customers
  for each row execute procedure update_updated_at();

create trigger update_shipments_updated_at
  before update on shipments
  for each row execute procedure update_updated_at();

-- =============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================
alter table profiles enable row level security;
alter table customers enable row level security;
alter table shipments enable row level security;

-- Profiles: user can only see their own
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Customers: super admin full access
create policy "Super admin full access on customers"
  on customers for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Shipments: super admin full access
create policy "Super admin full access on shipments"
  on shipments for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- =============================================
-- 6. SAMPLE DATA (optional test data)
-- =============================================
insert into customers (full_name, email, phone, city, country) values
  ('Ahmed Hassan', 'ahmed@example.com', '+252612345678', 'Mogadishu', 'Somalia'),
  ('Fatima Ali', 'fatima@example.com', '+971501234567', 'Dubai', 'UAE'),
  ('Omar Yusuf', 'omar@example.com', '+254701234567', 'Nairobi', 'Kenya');
