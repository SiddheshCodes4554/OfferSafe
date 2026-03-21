-- Run this in the Supabase SQL Editor to fix Portal log in and organizations

-- 1. Update the Trigger Function so FUTURE signups create an Organization automatically
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_org_id uuid;
  assigned_role text;
begin
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  -- Insert into public.users
  insert into public.users (id, email, role)
  values (new.id, new.email, assigned_role);

  -- If it's a College Portal Admin, create their organization
  if assigned_role = 'org_admin' then
    insert into public.organizations (name)
    values (coalesce(new.raw_user_meta_data->>'org_name', 'Unnamed College Portal'))
    returning id into new_org_id;

    -- Link them as an admin
    insert into public.org_members (org_id, user_id, role)
    values (new_org_id, new.id, 'admin');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 2. Run a one-time clean up to fix any existing accounts (like the one you just made!)
do $$
declare
  broken_user record;
  new_org_id uuid;
begin
  for broken_user in 
    select u.id, auth_user.raw_user_meta_data->>'org_name' as org_name
    from public.users u
    join auth.users auth_user on auth_user.id = u.id
    where u.role = 'org_admin' 
      and not exists (select 1 from public.org_members om where om.user_id = u.id)
  loop
    -- Create the org
    insert into public.organizations (name)
    values (coalesce(broken_user.org_name, 'Recovered College Portal'))
    returning id into new_org_id;

    -- Link them
    insert into public.org_members (org_id, user_id, role)
    values (new_org_id, broken_user.id, 'admin');
  end loop;
end;
$$;
