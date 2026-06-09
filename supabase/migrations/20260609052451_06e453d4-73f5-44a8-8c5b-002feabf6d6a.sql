
-- ============ ENUM de roles ============
create type public.app_role as enum ('admin', 'moderator', 'player');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text unique,
  city text,
  level text default 'Iniciante',
  avatar_url text,
  bio text,
  is_verified boolean not null default false,
  is_suspended boolean not null default false,
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============ USER_ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- ============ has_role (security definer) ============
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin','moderator')
  )
$$;

-- ============ PROFILES policies ============
create policy "profiles_public_read" on public.profiles
  for select using (true);
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_admin_update" on public.profiles
  for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ============ USER_ROLES policies ============
create policy "roles_self_read" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "roles_admin_manage" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ Trigger criar profile + role 'player' ao signup ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'player')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ updated_at helper ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('post','profile','arena','tournament','match')),
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports_insert_authed" on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "reports_self_read" on public.reports
  for select to authenticated using (auth.uid() = reporter_id or public.is_staff(auth.uid()));
create policy "reports_staff_manage" on public.reports
  for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ============ BANNERS ============
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  link_url text,
  variant text not null default 'info' check (variant in ('info','success','warning','promo')),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  audience text not null default 'all',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.banners to anon;
grant select on public.banners to authenticated;
grant all on public.banners to service_role;
alter table public.banners enable row level security;
create policy "banners_public_read_active" on public.banners
  for select using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
create policy "banners_staff_all_read" on public.banners
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "banners_admin_manage" on public.banners
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link_url text,
  kind text not null default 'system',
  is_read boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_self_read" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_self_update" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_staff_read" on public.notifications
  for select to authenticated using (public.is_staff(auth.uid()));

-- ============ APP SETTINGS (chave/valor) ============
create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings_public_read" on public.app_settings for select using (true);
create policy "settings_admin_manage" on public.app_settings
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create trigger settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (key, value, description) values
  ('maintenance_mode', '{"enabled": false, "message": "Estamos em manutenção, voltamos já!"}'::jsonb, 'Modo manutenção global'),
  ('feature_flags', '{"h2h": true, "ranking": true, "tournaments": true, "feed": true}'::jsonb, 'Ligar/desligar seções'),
  ('levels', '["Iniciante","Intermediário","Avançado","Profissional"]'::jsonb, 'Níveis de jogador'),
  ('cities', '["Rio de Janeiro","São Paulo","Florianópolis","Salvador","Recife","Fortaleza"]'::jsonb, 'Cidades atendidas');

-- ============ AUDIT LOG ============
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit_staff_read" on public.audit_log
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "audit_staff_insert" on public.audit_log
  for insert to authenticated with check (public.is_staff(auth.uid()));
