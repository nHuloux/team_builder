-- Enable RLS (just in case)
alter table public.group_progress enable row level security;

-- Drop existing policy to avoid conflicts
drop policy if exists "Allow all access for group_progress" on public.group_progress;

-- Create the policy permitting ALL actions (select, insert, update, delete) for everyone (anon and authenticated)
create policy "Allow all access for group_progress"
on public.group_progress
for all
using (true)
with check (true);

-- Also fix stories just in case
alter table public.stories enable row level security;
drop policy if exists "Allow all access for stories" on public.stories;
create policy "Allow all access for stories" on public.stories for all using (true) with check (true);
