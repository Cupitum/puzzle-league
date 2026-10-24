-- READ-ONLY guard for an ISOLATED staging database AFTER the candidate migrations.
-- Never use as proof of cross-role functional behaviour; separate fixture tests needed.
do $$
begin
 if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='p7_polishing' and p.prosecdef) then
   raise exception 'Missing protected Polishing RPC';
 end if;
 if has_function_privilege('anon','public.p7_polishing(uuid,text,jsonb)','execute')
    or has_function_privilege('authenticated','public.p7_polishing(uuid,text,jsonb)','execute') then
   raise exception 'Client must not be able to spoof p_actor';
 end if;
 if not has_function_privilege('service_role','public.p7_polishing(uuid,text,jsonb)','execute') then
   raise exception 'Validated Edge transport cannot invoke protected RPC';
 end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='app_private' and c.relname='account_deletion_requests' and c.relrowsecurity)
    or not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='app_private' and c.relname='account_deletion_audit' and c.relrowsecurity) then
   raise exception 'Deletion register/audit must have RLS';
 end if;
 if has_table_privilege('authenticated','app_private.account_deletion_requests','select')
    or has_table_privilege('anon','app_private.account_deletion_requests','select') then
   raise exception 'Deletion requests must be private';
 end if;
 if (select count(*) from supabase_migrations.schema_migrations
     where version in ('20261023100000','20261023100100'))<>2 then
   raise exception 'Polishing migration history is not complete';
 end if;
end $$;
