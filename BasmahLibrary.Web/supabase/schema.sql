-- BASMAH LIBRARY DATABASE
-- شغّل الملف ده في Supabase SQL Editor.
-- ملاحظة: service_role key لا يوضع أبداً في GitHub أو JavaScript.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new','processing','ready','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- helper: هل المستخدم الحالي Admin؟
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone)
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Public can read only active products
drop policy if exists "public read active products" on public.products;
create policy "public read active products"
on public.products for select
to anon, authenticated
using (active = true or public.is_admin());

-- Only admins can insert/update/delete products
drop policy if exists "admin insert products" on public.products;
create policy "admin insert products"
on public.products for insert to authenticated
with check (public.is_admin());

drop policy if exists "admin update products" on public.products;
create policy "admin update products"
on public.products for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete products" on public.products;
create policy "admin delete products"
on public.products for delete to authenticated
using (public.is_admin());

-- Users can read/update their own profile; admins can read all
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- Orders: customer can create/read own; admin can read/update all
drop policy if exists "customer create order" on public.orders;
create policy "customer create order"
on public.orders for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "customer read own orders" on public.orders;
create policy "customer read own orders"
on public.orders for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders"
on public.orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer create order items" on public.order_items;
create policy "customer create order items"
on public.order_items for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "read own order items" on public.order_items;
create policy "read own order items"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
  )
);

-- IMPORTANT:
-- بعد إنشاء حساب الأدمن لأول مرة، نفّذ:
-- update public.profiles set role='admin' where phone='+2010XXXXXXXX';
