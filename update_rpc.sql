-- Run this in your Supabase SQL Editor to fix the login function

drop function if exists login_or_register_user(text, text, text, text, text, text);

create or replace function login_or_register_user(
  p_id text,
  p_first_name text,
  p_last_name text,
  p_class_type text,
  p_password text, -- This was p_password_hash before
  p_password_plain text
)
returns setof public.users
language plpgsql
security definer
as $$
declare
  found_user public.users%rowtype;
begin
  select * into found_user from public.users where id = p_id;
  
  if not found then
    -- Register
    insert into public.users (id, first_name, last_name, class_type, password)
    values (p_id, p_first_name, p_last_name, p_class_type, p_password)
    returning * into found_user;
  else
    -- Login check
    if found_user.password <> p_password then
      raise exception 'Mot de passe incorrect';
    end if;
    
    -- Update class type if changed (optional, but good for data sync)
    update public.users set class_type = p_class_type where id = p_id;
  end if;
  
  return next found_user;
end;
$$;
