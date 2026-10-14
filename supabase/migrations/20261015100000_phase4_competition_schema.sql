-- Phase 4 / forward-only additions. Requires all five Phase 3 migrations.
-- No direct anon/authenticated DML to competition data; API uses a JWT-checked Edge function.
create table app_private.league_invitations (
 id uuid primary key default gen_random_uuid(),
 league_id uuid not null references public.leagues(id),
 issued_by uuid not null references public.profiles(id),
 token uuid not null unique default gen_random_uuid(),
 expires_at timestamptz not null,
 max_uses integer not null default 1 check(max_uses between 1 and 1000),
 use_count integer not null default 0 check(use_count>=0 and use_count<=max_uses),
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index league_invitations_league_idx on app_private.league_invitations(league_id);

create table public.league_seasons (
 id uuid primary key default gen_random_uuid(),
 league_id uuid not null references public.leagues(id),
 sequence_no integer not null check(sequence_no>=1),
 cadence text not null check(cadence in ('calendar_week','calendar_month','rolling_days')),
 duration_days integer check(duration_days between 1 and 366),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 state text not null default 'scheduled' check(state in ('scheduled','active','review','finalised')),
 finalised_at timestamptz,
 created_at timestamptz not null default now(),
 unique(league_id, sequence_no),
 unique(id,league_id),
 check(ends_at>starts_at),
 check((cadence='rolling_days' and duration_days is not null)
   or (cadence<>'rolling_days' and duration_days is null)),
 check((state='finalised')=(finalised_at is not null))
);
create index league_seasons_period_idx on public.league_seasons(league_id,starts_at,ends_at);
-- Exclude overlapping periods for a league; allows review of prior and active next season.
create extension if not exists btree_gist with schema extensions;
alter table public.league_seasons add constraint league_seasons_no_overlap
 exclude using gist (league_id with =, tstzrange(starts_at,ends_at,'[)') with &&);

create table public.season_game_settings (
 season_id uuid not null references public.league_seasons(id),
 game_id text not null references public.games(id),
 rule_version text not null,
 primary key(season_id,game_id)
);

create table app_private.scheduled_season_changes (
 id uuid primary key default gen_random_uuid(),
 league_id uuid not null references public.leagues(id),
 target_sequence integer not null check(target_sequence>=2),
 selected_game_ids text[] not null check(cardinality(selected_game_ids)>0),
 scheduled_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(league_id,target_sequence)
);

-- Abuse/moderation controls survive leave/rejoin and prevent immediate re-entry.
create table app_private.league_suspensions (
 league_id uuid not null references public.leagues(id),
 user_id uuid not null references public.profiles(id),
 suspended_by uuid not null references public.profiles(id),
 reason text not null check(length(btrim(reason)) between 3 and 2000),
 suspended_until timestamptz,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(league_id,user_id)
);
create table app_private.moderation_reports (
 id uuid primary key default gen_random_uuid(),
 league_id uuid not null references public.leagues(id),
 filed_by uuid not null references public.profiles(id),
 subject_user_id uuid references public.profiles(id),
 reason text not null check(length(btrim(reason)) between 3 and 2000),
 state text not null default 'pending' check(state in ('pending','closed')),
 resolved_by uuid references public.profiles(id),
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 check((state='pending' and resolved_by is null and resolved_at is null)
       or (state='closed' and resolved_by is not null and resolved_at is not null))
);
create index moderation_reports_queue_idx on app_private.moderation_reports(league_id,state,created_at);

create table app_private.league_review_delegations (
 membership_id uuid primary key references public.league_memberships(id) on delete cascade,
 granted_by uuid not null references public.profiles(id),
 granted_at timestamptz not null default now()
);

create table public.league_score_entries (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.result_submissions(id),
 league_id uuid not null references public.leagues(id),
 season_id uuid not null,
 game_id text not null references public.games(id),
 account_id uuid not null references public.profiles(id),
 rule_version text not null,
 performance_points integer not null check(performance_points between 0 and 10),
 participation_points integer not null check(participation_points=1),
 awarded_at timestamptz not null default now(),
 voided_at timestamptz,
 void_reason text,
 foreign key(season_id,league_id) references public.league_seasons(id,league_id),
 unique(submission_id,season_id),
 check((voided_at is null and void_reason is null) or (voided_at is not null and length(btrim(void_reason))>0))
);
create index league_score_entries_rank_idx on public.league_score_entries(season_id,game_id,account_id) where voided_at is null;

-- Audit supplements existing Phase 3 immutable events and preserves correction versions.
create table app_private.competition_events (
 id bigint generated always as identity primary key,
 actor_id uuid, -- durable pseudonymous identifier; do not block Auth deletion
 action text not null,
 target_id uuid,
 league_id uuid,
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object'),
 occurred_at timestamptz not null default clock_timestamp()
);
create trigger competition_events_immutable before update or delete on app_private.competition_events
 for each row execute function app_private.prevent_audit_history_mutation();

create table app_private.result_corrections (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.result_submissions(id),
 request_id uuid not null unique references app_private.approval_requests(id),
 corrected_by uuid not null references public.profiles(id),
 replacement_raw_text text not null check(length(btrim(replacement_raw_text))>0),
 replacement_parser_version text not null,
 replacement_fields jsonb not null check(jsonb_typeof(replacement_fields)='object'),
 prior_fields jsonb,
 created_at timestamptz not null default now()
);
create trigger result_corrections_immutable before update or delete on app_private.result_corrections
 for each row execute function app_private.prevent_audit_history_mutation();

-- Owner membership is implicit; no ordinary client needs these tables directly.
alter table public.league_seasons enable row level security;
alter table public.season_game_settings enable row level security;
alter table public.league_score_entries enable row level security;
alter table app_private.league_invitations enable row level security;
alter table app_private.scheduled_season_changes enable row level security;
alter table app_private.league_review_delegations enable row level security;
alter table app_private.league_suspensions enable row level security;
alter table app_private.moderation_reports enable row level security;
alter table app_private.competition_events enable row level security;
alter table app_private.result_corrections enable row level security;
revoke all on public.league_seasons,public.season_game_settings,public.league_score_entries,
 app_private.league_invitations,app_private.scheduled_season_changes,
 app_private.league_review_delegations,app_private.league_suspensions,
 app_private.moderation_reports,app_private.competition_events,
 app_private.result_corrections from public,anon,authenticated;
revoke all on sequence app_private.competition_events_id_seq from public,anon,authenticated;
-- Privileged Edge API accesses through a single GRANT-restricted transactional RPC.
