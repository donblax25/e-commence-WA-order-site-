create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id),
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key,
  category_id uuid references categories(id),
  name text not null,
  slug text not null unique,
  description text,
  price_kobo int not null check (price_kobo >= 0),
  currency text not null default 'NGN',
  stock_qty int not null default 0 check (stock_qty >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key,
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);

do $$ begin
  create type order_status as enum ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED');
exception
  when duplicate_object then null;
end $$;

create table if not exists orders (
  id uuid primary key,
  order_code text not null unique,
  status order_status not null default 'PENDING',
  customer_name text,
  customer_phone text,
  customer_note text,
  delivery_address text,
  subtotal_kobo int not null,
  total_kobo int not null,
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name_snapshot text not null,
  unit_price_kobo_snapshot int not null,
  qty int not null check (qty > 0),
  line_total_kobo int not null
);

create table if not exists admins (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  role text not null default 'OWNER',
  created_at timestamptz not null default now()
);

create table if not exists order_status_events (
  id uuid primary key,
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by_admin_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create sequence if not exists order_code_seq start 1;

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at);
