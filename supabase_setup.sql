-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- 1. Tables

-- Users table
create table public.users (
  id text primary key, -- generated in frontend: firstname-lastname
  first_name text not null,
  last_name text not null,
  class_type text not null,
  group_id int,
  is_leader boolean default false,
  password text,
  created_at timestamptz default now()
);

-- Challenge Configuration (Store limits, deadlines, etc.)
create table public.challenge_config (
  key text primary key,
  value text not null
);

-- Stories (for the mini-game)
create table public.stories (
  id int primary key,
  title text not null,
  intro text not null,
  opt1_text text not null,
  opt1_outcome text not null,
  opt1_emoji text not null,
  opt2_text text not null,
  opt2_outcome text not null,
  opt2_emoji text not null
);

-- Group Progress (for the bonus game)
create table public.group_progress (
  group_id int primary key,
  solved_ids int[] default '{}'
);

-- 2. Initial Data (Defaults)
insert into public.challenge_config (key, value) values
('CORE_TEAM_DEADLINE', '2026-02-01T00:00:00'),
('CONSOLIDATION_DEADLINE', '2026-03-15T00:00:00'),
('LEADER_LOCK_DATE', '2026-03-23T00:00:00'),
('CHALLENGE_START', '2026-03-23T00:00:00');

-- 3. Functions (RPCs)

-- fetchGroups: get_project_members + get_all_challenge_config
drop function if exists get_project_members();
create or replace function get_project_members()
returns setof public.users
language sql
security definer
as $$
  select * from public.users;
$$;

drop function if exists get_all_challenge_config();
create or replace function get_all_challenge_config()
returns setof public.challenge_config
language sql
security definer
as $$
  select * from public.challenge_config;
$$;

-- Login / Register
drop function if exists login_or_register_user(text, text, text, text, text, text);
create or replace function login_or_register_user(
  p_id text,
  p_first_name text,
  p_last_name text,
  p_class_type text,
  p_password text,
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

-- Join Team
drop function if exists join_team(text, int);
create or replace function join_team(p_user_id text, p_group_id int)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
  set group_id = p_group_id, is_leader = false
  where id = p_user_id;
end;
$$;

-- Leave Team
drop function if exists leave_team(text);
create or replace function leave_team(p_user_id text)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
  set group_id = null, is_leader = false
  where id = p_user_id;
end;
$$;

-- Update Group Name
drop function if exists update_group_name(int, text);
create or replace function update_group_name(p_group_id int, p_name text)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.challenge_config (key, value)
  values ('GROUP_NAME_' || p_group_id, p_name)
  on conflict (key) do update set value = excluded.value;
end;
$$;

-- Assign Leader
drop function if exists assign_team_leader(int, text);
create or replace function assign_team_leader(p_group_id int, p_leader_id text)
returns void
language plpgsql
security definer
as $$
begin
  -- Demote current leader of the group
  update public.users set is_leader = false where group_id = p_group_id;
  -- Promote new leader
  update public.users set is_leader = true where id = p_leader_id and group_id = p_group_id;
end;
$$;

-- Claim Bonus Booster
drop function if exists claim_bonus_booster(int);
create or replace function claim_bonus_booster(p_group_id int)
returns boolean
language plpgsql
security definer
as $$
declare
  existing_winner text;
begin
  select value into existing_winner from public.challenge_config where key = 'BONUS_WINNER_GROUP_ID';
  
  if existing_winner is null then
    insert into public.challenge_config (key, value) values ('BONUS_WINNER_GROUP_ID', p_group_id::text);
    return true;
  else
    return false;
  end if;
end;
$$;

-- Validate Story Titles (for the mini-game)
-- Input: p_guesses = [{"id": 1, "title": "My Title"}, ...]
-- Output: [{"id": 1, "is_correct": true}, ...]
drop function if exists validate_story_titles(jsonb);
create or replace function validate_story_titles(p_guesses jsonb)

returns jsonb
language plpgsql
security definer
as $$
declare
  guess record;
  result_arr jsonb := '[]'::jsonb;
  is_match boolean;
  story_title text;
begin
  for guess in select * from jsonb_to_recordset(p_guesses) as x(id int, title text)
  loop
    select title into story_title from public.stories where id = guess.id;
    
    if story_title is not null and lower(trim(story_title)) = lower(trim(guess.title)) then
      is_match := true;
    else
      is_match := false;
    end if;
    
    result_arr := result_arr || jsonb_build_object('id', guess.id, 'is_correct', is_match);
  end loop;
  
  return result_arr;
end;
$$;

-- RLS Policies (Optional but recommended - Basic "Enable All" for dev)
alter table public.users enable row level security;
create policy "Allow all access for public tables" on public.users for all using (true) with check (true);

alter table public.challenge_config enable row level security;
create policy "Allow all access for challenge_config" on public.challenge_config for all using (true) with check (true);

alter table public.stories enable row level security;
create policy "Allow all access for stories" on public.stories for all using (true) with check (true);

alter table public.group_progress enable row level security;
create policy "Allow all access for group_progress" on public.group_progress for all using (true) with check (true);
