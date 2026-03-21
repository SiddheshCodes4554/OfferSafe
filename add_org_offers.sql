-- Run this in the Supabase SQL Editor to add the College Portal 'org_offers' table

create table public.org_offers (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  company_name text not null,
  company_domain text,
  position_title text not null,
  offer_text text not null,
  trust_score integer,
  risk_level text,
  analysis_layers jsonb default '[]'::jsonb,
  findings jsonb default '[]'::jsonb,
  red_flag_count integer default 0,
  status text not null check (status in ('pending', 'verified', 'rejected', 'flagged')) default 'pending',
  reviewer_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.org_offers enable row level security;

-- Policies for org_offers
create policy "Org members can view their org offers"
  on public.org_offers for select
  using ( org_id in (select org_id from public.org_members where user_id = auth.uid()) );

create policy "Org members can insert org offers"
  on public.org_offers for insert
  with check ( org_id in (select org_id from public.org_members where user_id = auth.uid()) );

create policy "Org members can update org offers"
  on public.org_offers for update
  using ( org_id in (select org_id from public.org_members where user_id = auth.uid()) );
