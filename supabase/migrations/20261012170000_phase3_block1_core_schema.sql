-- Puzzle League / Phase 3 Block 1: initial structural schema only.
-- Source of truth: Project Guide v2.1 and the approved Phase 1 scoring contract.
-- NO user accounts are created; NO scoring, awards, login or RLS policies are activated.
-- All public tables default to RLS deny-by-default with zero policies.

-- Profile identifiers come from Supabase Auth; never mirror emails into public tables.
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nickname text not null check (length(btrim(nickname)) > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Five approved games are catalogue entries, not activated ingestion/scoring services.
create table public.games (
    id text primary key check (length(btrim(id)) > 0),
    display_name text not null check (length(btrim(display_name)) > 0),
    approved_rule_version text not null check (length(btrim(approved_rule_version)) > 0)
);

insert into public.games (id, display_name, approved_rule_version) values
    ('wordle', 'Wordle', 'wordle-fixed-v1-approved'),
    ('minute_cryptic', 'Minute Cryptic', 'minute-cryptic-hints-v1-approved'),
    ('foximax', 'FoxiMax', 'foximax-original-n8-v1-approved'),
    ('polygonle', 'Polygonle', 'polygonle-standard-v1-approved'),
    ('krillion', 'Krillion', 'krillion-daily-absolute700-v1-approved');

-- A league persists across seasons. No default timezone is guessed.
create table public.leagues (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references public.profiles(id),
    name text not null check (length(btrim(name)) > 0),
    visibility text not null check (visibility in ('public', 'private')),
    time_zone text not null check (length(btrim(time_zone)) > 0),
    created_at timestamptz not null default now()
);

create index leagues_owner_user_id_idx on public.leagues (owner_user_id);

-- Separate membership rows preserve join/leave/rejoin history.
-- Owner status is derived from leagues.owner_user_id, not duplicated in role.
-- No league-membership permissions are implemented in this block.
create table public.league_memberships (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references public.leagues(id),
    user_id uuid not null references public.profiles(id),
    role text not null default 'member' check (role in ('member', 'moderator')),
    joined_at timestamptz not null default now(),
    effective_from timestamptz not null default now(),
    left_at timestamptz,
    constraint league_membership_left_after_join check (
        left_at is null or left_at >= joined_at
    )
);

-- At most one ACTIVE membership for one account in one league.
-- Historical rows remain available after leaving.
create unique index league_membership_one_active_per_user
    on public.league_memberships (league_id, user_id)
    where left_at is null;
create index league_memberships_user_id_idx
    on public.league_memberships (user_id);

-- Game/puzzle identity candidates are distinct from VERIFIED daily puzzle identity.
-- No official puzzle date is fabricated from share timestamps.
-- 'mode' is explicit because mode-specific puzzles may share source numbers.
create table public.game_puzzles (
    id uuid primary key default gen_random_uuid(),
    game_id text not null references public.games(id),
    mode text not null check (length(btrim(mode)) > 0),
    identity_key text not null check (length(btrim(identity_key)) > 0),
    puzzle_day date,
    verification_state text not null default 'candidate'
        check (verification_state in ('candidate', 'verified', 'rejected')),
    verified_at timestamptz,
    verification_note text,
    created_at timestamptz not null default now(),
    constraint game_puzzles_verification_consistency check (
        (verification_state = 'verified' and verified_at is not null)
        or (verification_state <> 'verified' and verified_at is null)
    ),
    constraint game_puzzles_identity_unique unique (game_id, mode, identity_key),
    constraint game_puzzles_id_game_unique unique (id, game_id)
);

-- Source text is captured once per authenticated account, then parsed/reviewed.
-- Unrecognised/ambiguous shares may have no game or resolved puzzle yet.
-- No result can be "accepted" without a resolved game and puzzle reference.
-- Strong trusted acceptance/mode/date/48h checks belong to Phase 4.
create table public.result_submissions (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references public.profiles(id),
    game_id text references public.games(id),
    puzzle_id uuid,
    raw_share_text text not null check (length(btrim(raw_share_text)) > 0),
    submission_method text not null
        check (submission_method in ('android_share', 'paste', 'historical_import')),
    parser_version text,
    parse_status text not null default 'not_parsed'
        check (parse_status in (
            'not_parsed', 'recognized_valid', 'invalid',
            'ambiguous', 'needs_review', 'unrecognized'
        )),
    parsed_fields jsonb check (
        parsed_fields is null or jsonb_typeof(parsed_fields) = 'object'
    ),
    review_status text not null default 'pending'
        check (review_status in ('pending', 'accepted', 'rejected')),
    submitted_at timestamptz not null default now(),
    constraint submission_puzzle_requires_game check (
        puzzle_id is null or game_id is not null
    ),
    constraint submission_accepted_requires_identified_puzzle check (
        review_status <> 'accepted'
        or (puzzle_id is not null and game_id is not null and parser_version is not null)
    ),
    constraint submission_puzzle_game_consistency foreign key (puzzle_id, game_id)
        references public.game_puzzles (id, game_id)
);

-- A resolved game-puzzle can appear only ONCE per authenticated account,
-- including pending/rejected entries. Future corrections must be audited,
-- not inserted as a second scoring submission.
create unique index result_submission_one_account_per_puzzle
    on public.result_submissions (account_id, puzzle_id)
    where puzzle_id is not null;
create index result_submissions_account_date_idx
    on public.result_submissions (account_id, submitted_at desc);
create index result_submissions_review_status_idx
    on public.result_submissions (review_status);

-- Preserve the original share exactly; other fields can evolve through later
-- audited review workflows, but an UPDATE must never rewrite the raw source.
create function public.block_raw_share_edits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.raw_share_text is distinct from old.raw_share_text then
        raise exception 'raw_share_text is immutable; use an audited correction workflow';
    end if;
    return new;
end;
$$;

create trigger result_submission_raw_immutable
    before update on public.result_submissions
    for each row execute function public.block_raw_share_edits();

-- No open client privileges or Row Level Security policies in Block 1.
-- Phase 3 Block 2 will introduce tested, narrowly-scoped permission policies.
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.leagues enable row level security;
alter table public.league_memberships enable row level security;
alter table public.game_puzzles enable row level security;
alter table public.result_submissions enable row level security;

revoke all on table
    public.profiles,
    public.games,
    public.leagues,
    public.league_memberships,
    public.game_puzzles,
    public.result_submissions
from anon, authenticated;
revoke all on function public.block_raw_share_edits() from public, anon, authenticated;
