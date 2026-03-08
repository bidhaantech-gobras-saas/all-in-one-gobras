-- =============================================
-- GOBRAS LOGISTICS - LEADS TABLE
-- =============================================

create table leads (
  id uuid default uuid_generate_v4() primary key,

  -- Contact Info
  full_name text not null,
  email text,
  phone text,

  -- Company
  company_name text,

  -- Status
  status text default 'new' check (status in ('new', 'contacted', 'qualified', 'lost')),

  -- Source
  source text check (source in ('website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'other')),

  -- Meta
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto update updated_at
create trigger update_leads_updated_at
  before update on leads
  for each row execute procedure update_updated_at();

-- RLS
alter table leads enable row level security;

create policy "Super admin full access on leads"
  on leads for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Sample data
insert into leads (full_name, email, phone, company_name, status, source) values
  ('Mohamed Farah', 'mohamed@example.com', '+252615001001', 'Farah Trading Co.', 'new', 'website'),
  ('Hodan Abdi', 'hodan@example.com', '+971502002002', 'Gulf Freight LLC', 'contacted', 'referral'),
  ('Abdi Warsame', 'abdi@example.com', '+254722003003', 'Warsame Logistics', 'qualified', 'social_media'),
  ('Ifrah Omar', 'ifrah@example.com', '+441234004004', 'Omar Imports Ltd', 'lost', 'cold_call');
