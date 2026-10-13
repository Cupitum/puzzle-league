-- Puzzle League Phase 3 Block 2 / Step 4.
-- Profile lifecycle only: no client grants, league permissions, RLS policies or scoring.
-- New Auth users receive a non-identifying public nickname. Email and signup
-- metadata stay in auth.users and are never copied into public.profiles.

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, nickname)
    values (
        new.id,
        'Player-' || substr(replace(new.id::text, '-', ''), 1, 12)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- The function is for the auth.users trigger, not a callable client RPC.
revoke all on function public.create_profile_for_auth_user()
    from public, anon, authenticated;

create trigger puzzle_league_auth_user_created
    after insert on auth.users
    for each row execute function public.create_profile_for_auth_user();

-- Make existing Auth accounts usable if any predate this migration.
-- Never overwrite an existing chosen nickname.
insert into public.profiles (id, nickname)
select u.id, 'Player-' || substr(replace(u.id::text, '-', ''), 1, 12)
from auth.users as u
on conflict (id) do nothing;
