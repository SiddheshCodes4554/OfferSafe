-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create target tables
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null check (role in ('student', 'org_admin', 'org_member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.org_members (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(org_id, user_id)
);

create table public.scans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,   -- For Students
  org_id uuid references public.organizations(id) on delete cascade, -- For College Portals
  document_name text not null,
  trust_score integer not null,
  risk_status text not null,
  analysis_details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure a scan belongs to either a student or an organization, not both/neither
  constraint has_owner check (
    (user_id is not null and org_id is null) or 
    (org_id is not null and user_id is null)
  )
);

-- 3. Enable RLS (Row Level Security)
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.scans enable row level security;

-- 4. Create RLS Policies

-- USERS Table Policies
create policy "Users can view their own profile"
  on public.users for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.users for update
  using ( auth.uid() = id );

-- ORGANIZATIONS Table Policies
-- Org members can view their own organization
create policy "Members can view their organizations"
  on public.organizations for select
  using ( id in (select org_id from public.org_members where user_id = auth.uid()) );

-- ORG_MEMBERS Table Policies
create policy "Users can view their own memberships"
  on public.org_members for select
  using ( user_id = auth.uid() );

-- SCANS Table Policies
-- Policy 1: Students can view and create their own scans
create policy "Students can view their own scans"
  on public.scans for select
  using ( user_id = auth.uid() );

create policy "Students can insert their own scans"
  on public.scans for insert
  with check ( user_id = auth.uid() );

-- Policy 2: College Portal Members/Admins can view and create scans for their org
create policy "College members can view org scans"
  on public.scans for select
  using ( org_id in (select org_id from public.org_members where user_id = auth.uid()) );

create policy "College members can insert org scans"
  on public.scans for insert
  with check ( org_id in (select org_id from public.org_members where user_id = auth.uid()) );

-- 5. Helper Function & Trigger (Optional but recommended)
-- Automatically create a public.users profile when someone signs up via Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'student') -- default to student if no role is passed
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
