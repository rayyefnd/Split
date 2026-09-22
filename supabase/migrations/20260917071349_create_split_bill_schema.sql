-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. Bills — one per split-bill session
create table bills (
  id uuid primary key default gen_random_uuid(),
  host_name text not null,
  title text not null,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Participants — people in the split (not necessarily app users)
create table participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  name text not null,
  phone_number text not null,
  invoice_sent boolean not null default false,
  invoice_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Items — line items parsed/entered from the receipt
create table items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null,
  quantity int not null default 1,
  created_at timestamptz not null default now()
);

-- 4. Item assignments — many-to-many: which participant(s) share which item
create table item_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  share numeric(5,4) not null default 1.0, -- e.g. 0.5 if splitting one item between 2 people
  created_at timestamptz not null default now(),
  unique (item_id, participant_id)
);

-- Helpful indexes
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