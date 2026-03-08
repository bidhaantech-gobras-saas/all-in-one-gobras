-- =============================================
-- GOBRAS LOGISTICS - SHIPMENTS & INVOICES SCHEMA
-- =============================================

-- Drop existing shipments table and recreate with full fields
-- CAREFUL: This will delete existing shipment data!
-- If you have data, use ALTER TABLE instead

alter table shipments 
  add column if not exists shipment_number text unique,
  add column if not exists mode text check (mode in ('air', 'sea', 'land')),
  add column if not exists carrier text,
  add column if not exists cargo_description text,
  add column if not exists packages integer,
  add column if not exists payment_status text default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid'));

-- Update status check constraint
alter table shipments drop constraint if exists shipments_status_check;
alter table shipments add constraint shipments_status_check 
  check (status in ('pending', 'booked', 'in_transit', 'arrived', 'delivered', 'cancelled'));

-- Auto generate shipment number
create or replace function generate_shipment_number()
returns trigger as $$
begin
  if new.shipment_number is null then
    new.shipment_number := 'GBR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_shipment_number on shipments;
create trigger set_shipment_number
  before insert on shipments
  for each row execute procedure generate_shipment_number();

-- =============================================
-- INVOICES TABLE
-- =============================================
create table if not exists invoices (
  id uuid default uuid_generate_v4() primary key,
  invoice_number text unique not null,
  shipment_id uuid references shipments(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  amount numeric(10,2) default 0,
  currency text default 'USD',
  status text default 'issued' check (status in ('issued', 'paid', 'cancelled')),
  issued_date date default current_date,
  due_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto generate invoice number
create or replace function generate_invoice_number()
returns trigger as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_invoice_number on invoices;
create trigger set_invoice_number
  before insert on invoices
  for each row execute procedure generate_invoice_number();

-- Auto create invoice when shipment payment_status = paid
create or replace function auto_create_invoice()
returns trigger as $$
begin
  if new.payment_status = 'paid' and (old.payment_status is null or old.payment_status != 'paid') then
    insert into invoices (shipment_id, customer_id, invoice_number)
    values (
      new.id,
      new.customer_id,
      'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4))
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists auto_invoice_on_paid on shipments;
create trigger auto_invoice_on_paid
  after update on shipments
  for each row execute procedure auto_create_invoice();

-- Auto update updated_at
create trigger update_invoices_updated_at
  before update on invoices
  for each row execute procedure update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================
alter table invoices enable row level security;

drop policy if exists "invoices_all" on invoices;
create policy "invoices_all"
on public.invoices for all
to authenticated
using (auth.uid() = '83feb3b4-c5e6-4026-b774-d0788cff0b3c')
with check (auth.uid() = '83feb3b4-c5e6-4026-b774-d0788cff0b3c');

-- Update shipments policy
drop policy if exists "shipments_all" on shipments;
create policy "shipments_all"
on public.shipments for all
to authenticated
using (auth.uid() = '83feb3b4-c5e6-4026-b774-d0788cff0b3c')
with check (auth.uid() = '83feb3b4-c5e6-4026-b774-d0788cff0b3c');
