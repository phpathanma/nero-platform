-- Pin has_control_role to an empty search_path so caller-controlled schemas
-- cannot shadow objects inside this SECURITY DEFINER function.
create or replace function public.has_control_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = any(required_roles)
  );
$$;

revoke all on function public.has_control_role(text[]) from public, anon;
grant execute on function public.has_control_role(text[]) to authenticated;
