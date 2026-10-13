-- Phase 3 Block 2 / Step 4: reversible DB-level Auth/Profile lifecycle smoke test.
-- Tests the database trigger, not an actual HTTP signup/sign-in or access-token flow.
-- Execute with postgres on local Supabase PostgreSQL only. No test user persists.
begin;

do $$
declare
    test_id uuid := gen_random_uuid();
    test_email text;
    public_nickname text;
    profile_count integer;
begin
    test_email := 'phase3-step4-' || test_id::text || '@example.invalid';

    insert into auth.users (id, email, raw_user_meta_data)
    values (test_id, test_email, '{"nickname": "PRIVATE-SIGNUP-DATA"}'::jsonb);

    select count(*), max(nickname)
    into profile_count, public_nickname
    from public.profiles
    where id = test_id;

    if profile_count <> 1 then
        raise exception 'Expected exactly one auto-created profile; got %', profile_count;
    end if;
    if public_nickname is distinct from
        'Player-' || substr(replace(test_id::text, '-', ''), 1, 12) then
        raise exception 'Unexpected public nickname: %', public_nickname;
    end if;
    if public_nickname ilike '%PRIVATE%' or public_nickname ilike '%@%' then
        raise exception 'Private signup information leaked to profile';
    end if;

    delete from auth.users where id = test_id;
    if exists (select 1 from public.profiles where id = test_id) then
        raise exception 'Deleting Auth account failed to cascade-delete profile';
    end if;

    if has_function_privilege('anon', 'public.create_profile_for_auth_user()', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.create_profile_for_auth_user()', 'EXECUTE') then
        raise exception 'Trigger helper can be executed directly by a client role';
    end if;

    raise notice 'PASS: Auth user creates one email-free profile; deletion cascades; helper cannot be called by clients';
end;
$$;

rollback;
