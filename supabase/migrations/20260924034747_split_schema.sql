-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Bills
create table bills (
  id uuid primary key default gen_random_uuid(),
  host_name text not null default 'Host',
  host_secret text not null default gen_random_uuid()::text,
  title text not null default 'Untitled Bill',
  subtotal numeric(12,2),
  tax numeric(12,2),
  service_charge numeric(12,2),
  discount numeric(12,2),
  total_amount numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'sent')),
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()

);

-- Participants
create table participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  name text not null,
  phone_number text not null,
  invoice_sent boolean not null default false,
  invoice_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Items
create table items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  name text not null,
  original_price numeric(12,2),
  price numeric(12,2) not null,
  quantity int not null default 1,
  created_at timestamptz not null default now()
);

-- Item assignments
create table item_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  share numeric(5,4) not null default 1.0,
  created_at timestamptz not null default now(),
  unique (item_id, participant_id)
);

-- Indexes
create index idx_participants_bill_id on participants(bill_id);
create index idx_items_bill_id on items(bill_id);
create index idx_assignments_item_id on item_assignments(item_id);
create index idx_assignments_participant_id on item_assignments(participant_id);

-- Auto-update updated_at on bills
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bills_updated_at
before update on bills
for each row execute function set_updated_at();

-- RLS (permissive for now — tighten once auth is added)
alter table bills enable row level security;
alter table participants enable row level security;
alter table items enable row level security;
alter table item_assignments enable row level security;

create policy "Allow all" on bills for all using (true) with check (true);
create policy "Allow all" on participants for all using (true) with check (true);
create policy "Allow all" on items for all using (true) with check (true);
create policy "Allow all" on item_assignments for all using (true) with check (true);