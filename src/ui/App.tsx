import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { gameCatalog, type GameId } from '../domain/games/catalog';
import { arrayOf, boardFrom, catalogueName, gameScores, safePreview, type Board, type History, type League, type Member, type PublicLeague, type Report, type Review, type Season } from '../domain/competition/view-model';
import { client, SESSION_STORAGE_KEY, validPublicUsername, type Session } from '../infrastructure/client';
import { publicConfig } from '../config/public-env';
import { consumeIncomingShare, registerPwa } from '../infrastructure/pwa';

type Page = 'home' | 'leagues' | 'league-detail' | 'season-setup' | 'submit' | 'rankings' | 'moderation' | 'account';
type Notice = { message: string; error: boolean } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const dateText = (value: string) => { const time = Date.parse(value); return Number.isFinite(time) ? new Date(time).toLocaleString() : 'Date unavailable'; };
const isOwner = (league: League | null) => Boolean(league?.is_owner);

function Button({ children, onClick, disabled, secondary, danger, type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; type?: 'button' | 'submit' }) {
  return <button type={type} className={`button ${secondary ? 'secondary' : ''} ${danger ? 'danger' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Section({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return <section className="card"><div className="section-line"><h2>{title}</h2>{extra}</div>{children}</section>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="empty">{children}</p>; }
function GameChecks({ selection, setSelection }: { selection: GameId[]; setSelection: (ids: GameId[]) => void }) {
  return <fieldset className="game-checks"><legend>Games included in the next season</legend>{gameCatalog.map(game =>
    <label key={game.id} className="check"><input type="checkbox" checked={selection.includes(game.id)} onChange={e => setSelection(e.target.checked ? [...selection, game.id] : selection.filter(g => g !== game.id))} />{game.label}</label>)}</fieldset>;
}

function App() {
  const [page, setPage] = useState<Page>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pwaReady, setPwaReady] = useState(false);
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupUsername, setSignupUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<PublicLeague[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [board, setBoard] = useState<Board>({ combined: [], by_game: [], streaks: [] });
  const [boardGame, setBoardGame] = useState<GameId | 'combined'>('combined');
  const [history, setHistory] = useState<History[]>([]);
  const [joinToken, setJoinToken] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [timeZone, setTimeZone] = useState('Africa/Johannesburg');
  const [cadence, setCadence] = useState<'calendar_week' | 'calendar_month' | 'rolling_days'>('calendar_month');
  const [days, setDays] = useState(30);
  const [games, setGames] = useState<GameId[]>(gameCatalog.map(g => g.id));
  const [invite, setInvite] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [rawText, setRawText] = useState('');
  const [shareMethod, setShareMethod] = useState<'paste' | 'android_share'>('paste');
  const [waitingShare, setWaitingShare] = useState<string | null>(null);
  const draftRef = useRef('');
  const intakeRunning = useRef(false);
  const intakeQueued = useRef(false);
  const [understands, setUnderstands] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<{ id: string; awarded: number; duplicate: boolean; review: boolean } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reviewRationale, setReviewRationale] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [requestId, setRequestId] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const selected = leagues.find(l => l.league_id === leagueId) ?? null;
  const selectedSeason = seasons.find(s => s.season_id === seasonId) ?? null;
  const preview = safePreview(rawText);

  const flash = useCallback((message: string, error = false) => setNotice({ message, error }), []);
  useEffect(() => { draftRef.current = rawText; }, [rawText]);
  // Page transitions always begin at the top, particularly on a small phone.
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true); setNotice(null);
    try { await task(); }
    catch (error) { flash(error instanceof Error ? error.message : 'This action could not be confirmed.', true); }
    finally { setBusy(false); }
  }, [flash]);
  const loadPublic = useCallback(async () => {
    if (!client) return;
    try { setPublicLeagues(await client.select<PublicLeague>('leagues', 'select=id,name,visibility,time_zone&visibility=eq.public&order=name.asc&limit=100')); }
    catch { /* data may be unreachable offline or RLS-limited */ }
  }, []);
  const loadCore = useCallback(async () => {
    if (!client?.currentSession) return;
    const [leagueData, historyData, profiles] = await Promise.all([
      client.call('my_leagues'), client.call('my_history'),
      client.select<{ nickname: string }>('profiles', `select=nickname&id=eq.${encodeURIComponent(client.userId ?? '')}`),
    ]);
    setLeagues(arrayOf<League>(leagueData));
    setHistory(arrayOf<History>(historyData));
    setNickname(profiles[0]?.nickname ?? '');
  }, []);
  const loadLeague = useCallback(async (id: string, focusFirstSeason = false) => {
    if (!client?.currentSession || !id) return;
    const data = arrayOf<Season>(await client.call('season_list', { league_id: id }));
    setSeasons(data);
    setSeasonId(data.at(-1)?.season_id ?? '');
    // Never carry another league's draft selection into this owner's settings.
    const latestGames = data.at(-1)?.games?.map(g => g.game);
    setGames(latestGames?.length ? latestGames : gameCatalog.map(g => g.id));
    setReviews([]); setReports([]); setMembers([]);
    if (focusFirstSeason) {
      // The league already exists: only its owner can initialise a season.
      setPage(data.length === 0 && leagues.some(l => l.league_id === id && l.is_owner)
        ? 'season-setup' : 'league-detail');
    }
  }, [leagues]);
  const loadBoard = useCallback(async (id: string) => {
    if (!client || !id) return;
    const data = await client.call('standings', { season_id: id });
    setBoard(boardFrom(data));
  }, []);
  const loadIncomingShare = useCallback(async () => {
    if (intakeRunning.current) { intakeQueued.current = true; return; }
    intakeRunning.current = true;
    try {
      do {
        intakeQueued.current = false;
        const shared = await consumeIncomingShare();
        if (shared) {
          if (draftRef.current.trim() && draftRef.current !== shared) {
            setWaitingShare(shared);
            flash('Another result arrived. Your existing draft is preserved; choose which share to review.');
          } else {
            draftRef.current = shared;
            setRawText(shared);
            setShareMethod('android_share');
            setUnderstands(false);
            flash('Shared result received. Review the exact text, then confirm when signed in.');
          }
          setPage('submit');
        }
      } while (intakeQueued.current);
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not read the Android share. Try pasting.', true);
    } finally { intakeRunning.current = false; }
  }, [flash]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const recovered = await (client?.recover() ?? Promise.resolve(null));
        if (cancelled) return;
        if (recovered) { setSession(recovered); await loadCore(); }
        const params = new URLSearchParams(window.location.search);
        const publicSeason = params.get('season');
        if (publicSeason && UUID.test(publicSeason)) { setSeasonId(publicSeason); setPage('rankings'); }
        const token = params.get('invite');
        if (token && UUID.test(token)) { setJoinToken(token); setPage('leagues'); }
      } catch (error) {
        if (!cancelled) flash(error instanceof Error ? error.message : 'Session restoration failed.', true);
      } finally { if (!cancelled) setBooting(false); }
    })();
    // Read shares independently of auth: a disconnected backend cannot hide a draft.
    void loadIncomingShare();
    const params = new URLSearchParams(window.location.search);
    if (params.has('incoming')) {
      const status = params.get('incoming');
      if (status === 'empty') flash('Android provided no share text. Copy the complete result and paste it.', true);
      if (status === 'error') flash('The share could not be imported. Try copying and pasting the result.', true);
      params.delete('incoming');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
    void loadPublic();
    const onOnline = () => setOnline(navigator.onLine);
    const onIncoming = (event: MessageEvent) => {
      if (event.data?.type === 'puzzle-league-share-received') void loadIncomingShare();
    };
    const onFocus = () => { void loadIncomingShare(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void loadIncomingShare(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOnline);
    window.addEventListener('pageshow', onFocus);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onIncoming);
    void registerPwa().then(setPwaReady).catch(() => setPwaReady(false));
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOnline);
      window.removeEventListener('pageshow', onFocus);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onIncoming);
    };
  }, [loadCore, loadPublic, loadIncomingShare, flash]);
  // Installed PWA, ordinary browser, and Android Share Target can be separate windows.
  // Synchronise their stored session when a window resumes or another window signs out.
  useEffect(() => {
    let cancelled = false;
    const syncAuth = () => {
      if (!client) return;
      void client.recover().then(restored => {
        if (cancelled) return;
        setSession(restored);
        if (restored) void loadCore().catch(() => { /* retry on next navigation */ });
        else { setLeagues([]); setHistory([]); setNickname(''); }
      }).catch(() => { /* a transient network failure must not destroy the draft */ });
    };
    const visible = () => { if (document.visibilityState === 'visible') syncAuth(); };
    const stored = (event: StorageEvent) => { if (event.key === SESSION_STORAGE_KEY || event.key === null) syncAuth(); };
    window.addEventListener('focus', syncAuth);
    window.addEventListener('pageshow', syncAuth);
    window.addEventListener('storage', stored);
    document.addEventListener('visibilitychange', visible);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', syncAuth);
      window.removeEventListener('pageshow', syncAuth);
      window.removeEventListener('storage', stored);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadCore]);
  useEffect(() => { if (seasonId) void loadBoard(seasonId).catch(() => setBoard({ combined: [], by_game: [], streaks: [] })); }, [seasonId, loadBoard]);
  async function act(action: string, data: Record<string, unknown>, success: string, update?: () => Promise<void>) {
    const api = client; if (!api) return;
    await run(async () => {
      await api.call(action, data);
      if (update) await update();
      flash(success);
    });
  }
  async function openLeague(id: string) {
    setLeagueId(id);
    await run(() => loadLeague(id, true));
  }
  async function createLeague(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const api = client;
    if (!api || !session) return flash('Sign in to create and own a league.', true);
    await run(async () => {
      const result = await api.call('create_league', {
        name: leagueName.trim(), visibility, time_zone: timeZone.trim(),
      }) as { league_id?: string };
      if (!result.league_id || !UUID.test(result.league_id)) throw new Error('League created, but the server did not provide a valid identifier. Refresh My leagues.');
      setLeagueName('');
      setLeagueId(result.league_id);
      await loadCore();
      await loadLeague(result.league_id);
      // This is a new view, not a section beneath the directory of leagues.
      setPage('season-setup');
      await loadPublic();
      flash('League created. You are the owner; choose games and start its first season.');
    });
  }
  async function signin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const api = client;
    if (!api) return flash('Backend not configured. Create .env.local in the project root and restart Vite.', true);
    if (signup && !validPublicUsername(signupUsername.trim())) return flash('Choose a public display name (3–40 letters, numbers, spaces, dots, dashes or underscores).', true);
    if (signup && password !== confirmPassword) return flash('Passwords do not match. Please check both fields.', true);
    await run(async () => {
      const result = await api.authenticate(email.trim(), password, signup, signupUsername.trim());
      setPassword(''); setConfirmPassword(''); setSession(result.session); flash(result.message);
      if (result.session) { await loadCore(); setPage(rawText.trim() ? 'submit' : 'home'); }
      else if (signup) setSignup(false);
    });
  }
  async function submitResult(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const api = client;
    if (!rawText.trim()) return flash('Paste or share a complete result first.', true);
    if (rawText.length > 16000) return flash('This result is too long to submit.', true);
    if (!api) return flash('Backend not configured. Set the public Supabase URL/key in .env.local and restart Vite.', true);
    if (!session) { setPage('account'); return flash('Sign in first; your puzzle draft is preserved on the Submit tab.', true); }
    if (!online) return flash('You are offline; reconnect before submitting.', true);
    if (!understands) return flash('Check the ownership and review acknowledgement before submitting.', true);
    await run(async () => {
      const res = await api.call('submit', { raw_text: rawText, method: shareMethod }) as Record<string, unknown>;
      setLastSubmit({ id: String(res.submission_id), awarded: Number(res.awarded ?? 0), duplicate: Boolean(res.duplicate), review: Boolean(res.review_required) });
      setRawText(''); setUnderstands(false); setShareMethod('paste');
      await loadCore(); flash('The server returned a submission receipt. See its status below.');
    });
  }
  async function fetchReview() {
    const api = client; if (!api || !leagueId) return;
    await run(async () => {
      const [r, reportsData] = await Promise.all([api.call('review_queue', { league_id: leagueId }), api.call('report_queue', { league_id: leagueId })]);
      setReviews(arrayOf<Review>(r)); setReports(arrayOf<Report>(reportsData)); flash('Authorised queues loaded.');
    });
  }
  async function loadRoster() {
    const api = client; if (!api || !leagueId) return;
    await run(async () => {
      const rows = await api.select<Member>('league_memberships', `select=id,user_id,role,joined_at&league_id=eq.${encodeURIComponent(leagueId)}&left_at=is.null&order=joined_at.asc`);
      setMembers(rows); flash('Membership records visible under your RLS permissions have loaded.');
    });
  }
  async function reviewAction(id: string, decision: 'approved' | 'rejected') {
    if (!reviewRationale.trim() || reviewRationale.trim().length < 3) return flash('Add a reason of at least 3 characters.', true);
    await act('review', { request_id: id, decision, rationale: reviewRationale.trim() }, `Server recorded ${decision} review decision.`, fetchReview);
  }
  const auth = Boolean(session);
  const navigation: { id: Page; label: string }[] = [
    { id: 'home', label: 'Overview' }, { id: 'leagues', label: 'Leagues' }, { id: 'submit', label: 'Submit' },
    { id: 'rankings', label: 'Rankings' }, { id: 'moderation', label: 'Moderation' }, { id: 'account', label: 'Account' },
  ];
  return <div className="shell">
    <header className="topbar"><div className="brand"><div aria-hidden="true" className="brand-mark">PL</div><div><span className="brand-name">Puzzle League</span><span className="brand-sub">Play the puzzle. Join the league.</span></div></div><span className={`connection ${online ? '' : 'offline'}`}>{online ? 'Online' : 'Offline'}</span></header>
    <div className="body-layout"><nav className="sidebar" aria-label="Primary navigation">{navigation.map(n => <button className={page === n.id || ((page === 'season-setup' || page === 'league-detail') && n.id === 'leagues') ? 'nav active' : 'nav'} key={n.id} onClick={() => setPage(n.id)} aria-current={page === n.id || ((page === 'season-setup' || page === 'league-detail') && n.id === 'leagues') ? 'page' : undefined}>{n.label}</button>)}</nav>
      <main id="main-content" className="content">
        {notice && <div role={notice.error ? 'alert' : 'status'} className={`notice ${notice.error ? 'is-error' : ''}`}>{notice.message}<button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}
        {!client && <Section title="Connect the local competition backend"><p>This build has no public backend settings. On Ubuntu open the project directory and run <code>python3 scripts/phase5/configure_local_env.py</code> to create the ignored <code>.env.local</code> file from the public local Supabase key. Then restart Vite and reload the app. Never place secret-role keys in the browser.</p></Section>}
        {booting ? <p role="status">Restoring your session and checking shared results…</p> : <>
          {page === 'home' && <>
            <div className="hero"><span className="overline">YOUR DAILY PUZZLE CLUB</span><h1>A little puzzle. A whole lot of competition.</h1><p>Share a result from the original game, compare your league standings, and keep your streaks separate from championship points.</p><div className="actions"><Button onClick={() => setPage('submit')}>Share a result</Button><Button secondary onClick={() => setPage('leagues')}>Explore leagues</Button></div></div>
            <Section title="Your competition at a glance" extra={<span className="tag">Five pilot games</span>}>
              <div className="stat-grid"><div><strong>{leagues.length}</strong><span>My leagues</span></div><div><strong>{history.length}</strong><span>Recent results</span></div><div><strong>{seasons.length}</strong><span>Selected league seasons</span></div></div>
              {!auth && <Empty>Explore public leagues below. Sign in to join, submit and manage your profile.</Empty>}
            </Section>
            <Section title="Supported puzzles"><div className="game-grid">{gameCatalog.map(g => <div className="game-tile" key={g.id}><strong>{g.label}</strong><small>Approved rule · Season-specific</small></div>)}</div><p className="muted">No app-side scores are calculated. Only the trusted backend can accept an entry or award points; unknown official puzzle dates and modes require review.</p></Section>
            <Section title="Phase 5 preview"><p>This is a local PWA implementation candidate. It is not yet a hosted release or verified Android installed Share Target. {pwaReady ? 'Service worker registration was attempted successfully in this browser.' : 'PWA installation requires HTTPS or a supported localhost browser.'}</p></Section>
          </>}
          {page === 'account' && <>
            <div className="page-heading"><span className="overline">IDENTITY & SECURITY</span><h1>Your account</h1><p>Email is used for authentication and never published in rankings.</p></div>
            {!auth ? <Section title={signup ? 'Create account' : 'Sign in'}><form onSubmit={signin} className="stack">
                {signup && <label>Public username (display name)
                  <input type="text" required minLength={3} maxLength={40} autoComplete="nickname" value={signupUsername} onChange={e => setSignupUsername(e.target.value)} placeholder="How you will appear on standings" />
                  <small className="muted">3–40 letters/numbers, spaces, dots, hyphens or underscores. This is not a unique login ID; your email is your private sign-in identity.</small>
                </label>}
                <label>Email <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
                <label>Password <input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
                {signup && <label>Confirm password <input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} aria-invalid={confirmPassword.length > 0 && confirmPassword !== password} /></label>}
                <label className="check"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show passwords</label>
                {signup && confirmPassword && confirmPassword !== password && <p className="form-warning" role="alert">Passwords do not match.</p>}
                <Button disabled={busy || !client || (signup && (password !== confirmPassword || !validPublicUsername(signupUsername.trim())))} type="submit">{signup ? 'Create account' : 'Sign in'}</Button>
                <button type="button" className="text-button" onClick={() => { setSignup(!signup); setConfirmPassword(''); setPassword(''); setShowPassword(false); }}>{signup ? 'Already a member? Sign in' : 'New here? Create account'}</button>
              </form></Section> : <>
              <Section title="Player profile"><p className="muted">Signed in as {session?.user.email ?? 'authenticated account'}. Your private email is never shown on leaderboards.</p><form className="stack" onSubmit={e => { e.preventDefault(); void act('update_profile', { nickname: nickname.trim() }, 'Nickname updated.'); }}><label>Public nickname <input maxLength={40} required value={nickname} onChange={e => setNickname(e.target.value)} /></label><Button type="submit" disabled={busy || !nickname.trim()}>Save nickname</Button></form></Section>
              <Section title="Session"><p className="muted">Your account stays signed in across pages, app restarts and Android Share launches on this device. Use Sign out on a shared device; never use a public computer for a persistent session.</p><Button danger onClick={() => void run(async () => { await client?.signOut(); setSession(null); setLeagues([]); setHistory([]); setLeagueId(''); setSeasons([]); setBoard({ combined: [], by_game: [], streaks: [] }); setReviews([]); setReports([]); setRawText(''); setInvite(''); flash('Signed out locally.'); })}>Sign out</Button></Section>
            </>}
          </>}
          {page === 'season-setup' && <>
            <div className="page-heading">
              <span className="overline">LEAGUE OWNER · FIRST SEASON</span>
              <h1>Set up your first season</h1>
              <p>You've created the league. Now select the games that will count towards its first competition.</p>
              <div className="actions"><Button secondary onClick={() => setPage('leagues')}>Back to leagues</Button></div>
            </div>
            {!selected ? <Section title="Loading your new league"><p>Your league details are not loaded yet. Use Back to leagues and open it again if this persists.</p></Section> :
              !selected.is_owner ? <Section title="Owner permission required"><p>This league is not owned by your signed-in account. Only its owner can start a season.</p><Button secondary onClick={() => setPage('leagues')}>Back to leagues</Button></Section> :
              seasons.length > 0 ? <Section title="A season already exists"><p>{selected.name} already has a season. Its current game selection is frozen; changes must be scheduled for a future season.</p><Button onClick={() => setPage('league-detail')}>Open league management</Button></Section> : <>
                <Section title={selected.name} extra={<span className="tag">Owner</span>}>
                  <p className="muted">{selected.visibility} league · {selected.time_zone}. Creating a league gives you ownership; starting its first season activates its competition settings.</p>
                </Section>
                <Section title="Choose games and schedule">
                  <form className="stack" onSubmit={e => { e.preventDefault(); void act('start_season', {
                    league_id: leagueId, cadence,
                    ...(cadence === 'rolling_days' ? { duration_days: days } : {}), games,
                  }, 'First season created. Your league is ready for members.', async () => {
                    await loadLeague(leagueId);
                    setPage('league-detail');
                  }); }}>
                    <label>Season schedule<select value={cadence} onChange={e => setCadence(e.target.value as typeof cadence)}>
                      <option value="calendar_month">Calendar month</option>
                      <option value="calendar_week">Calendar week</option>
                      <option value="rolling_days">Rolling days</option>
                    </select></label>
                    {cadence === 'rolling_days' && <label>Duration (1–366 days)<input type="number" min={1} max={366} required value={days} onChange={e => setDays(Number(e.target.value))} /></label>}
                    <GameChecks selection={games} setSelection={setGames} />
                    <p className="muted">The selected games and approved scoring versions will be frozen for this season. Changes to games apply to future seasons only.</p>
                    <Button disabled={busy || games.length === 0 || !session || !online} type="submit">Start first season</Button>
                  </form>
                </Section>
              </>}
          </>}
          {page === 'leagues' && <>
            <div className="page-heading"><span className="overline">PLAY TOGETHER</span><h1>Leagues & seasons</h1><p>Join a public league or use a private invitation. Your participation begins when you join, not retroactively.</p></div>
            <Section title="Discover public leagues" extra={<Button secondary onClick={() => void loadPublic()}>Refresh</Button>}>
              {publicLeagues.length ? <div className="item-list">{publicLeagues.map(l => <div className="item" key={l.id}><div><strong>{l.name}</strong><small>Public · {l.time_zone}</small></div><Button disabled={!auth || busy} secondary onClick={() => void act('join', { league_id: l.id }, 'Join request accepted by the server.', loadCore)}>Join</Button></div>)}</div> : <Empty>No publicly listed leagues are available from this backend.</Empty>}
              {!auth && <p className="muted">Sign in to join. Guests can view public standings only when given a season ID.</p>}
            </Section>
            {auth && <>
              <Section title="My leagues" extra={<Button secondary onClick={() => void run(loadCore)}>Refresh</Button>}>
                {leagues.length ? <div className="item-list">{leagues.map(l => <div className="item" key={l.league_id}><div><strong>{l.name}</strong><small>{l.visibility} · {l.time_zone} · {l.is_owner ? 'Owner' : 'Member'}</small></div><Button secondary onClick={() => void openLeague(l.league_id)}>Open</Button></div>)}</div> : <Empty>Create a league or join one to begin.</Empty>}
              </Section>
              <Section title="Join with an invitation"><form className="inline-form" onSubmit={e => { e.preventDefault(); void act('join', { invite_token: joinToken.trim() }, 'Private invitation accepted.', async () => { setJoinToken(''); await loadCore(); }); }}><label>Invitation token <input value={joinToken} onChange={e => setJoinToken(e.target.value)} placeholder="UUID from league owner" required /></label><Button disabled={busy || !UUID.test(joinToken.trim())} type="submit">Join private league</Button></form><p className="muted">One-use invitations expire after seven days. Keep the token private.</p></Section>
              <Section title="Step 1 · Create a league"><p className="muted">A league is your ongoing community. Creating it makes you the owner and automatically opens a dedicated first-season setup screen.</p><form className="stack" onSubmit={e => { void createLeague(e); }}>
                <label>League name <input value={leagueName} maxLength={100} onChange={e => setLeagueName(e.target.value)} required /></label><div className="two"><label>Visibility<select value={visibility} onChange={e => setVisibility(e.target.value as 'public' | 'private')}><option value="private">Private</option><option value="public">Public</option></select></label><label>IANA time zone<input value={timeZone} onChange={e => setTimeZone(e.target.value)} required placeholder="Africa/Johannesburg" /></label></div><Button type="submit" disabled={busy || !leagueName.trim()}>Create league and continue to game selection</Button></form></Section>
            </>}
          </>}
          {page === 'league-detail' && <div className="page-heading">
            <span className="overline">LEAGUE MANAGEMENT</span>
            <h1>{selected?.name ?? 'Your league'}</h1>
            <p>View seasons, standings, member invitations and owner settings.</p>
            <div className="actions"><Button secondary onClick={() => setPage('leagues')}>Back to all leagues</Button></div>
          </div>}
              {page === 'league-detail' && selected && <>
                {selected.is_owner && !seasons.length && <p className="notice" role="status">You own this league. Choose its first-season games on the dedicated setup screen. League creation alone does not begin scoring.</p>}
                <Section title={selected.name} extra={<span className="tag">{selected.is_owner ? 'Owner' : 'Member'}</span>}>
                  <p className="muted">{selected.visibility} · {selected.time_zone}</p>
                  <div className="actions"><Button onClick={() => setPage('rankings')}>View rankings</Button><Button secondary onClick={() => setPage('moderation')}>Review & safety</Button>{!selected.is_owner && <Button danger disabled={busy} onClick={() => { if (window.confirm('Leave this league? You will no longer score new puzzles here.')) void act('leave', { league_id: leagueId }, 'Left league.', async () => { setLeagueId(''); setSeasons([]); setPage('leagues'); await loadCore(); }); }}>Leave league</Button>}</div>
                </Section>
                <Section title="Seasons" extra={<Button secondary onClick={() => void run(() => loadLeague(leagueId))}>Refresh</Button>}>
                  {seasons.length ? <div className="item-list">{seasons.map(s => <div className="item" key={s.season_id}><div><strong>Season {s.sequence_no} · {s.state}</strong><small>{dateText(s.starts_at)} – {dateText(s.ends_at)}</small><small>{s.games?.map(g => catalogueName(g.game)).join(' · ') || 'No selected games'}</small></div><div className="actions"><Button secondary onClick={() => { setSeasonId(s.season_id); setPage('rankings'); }}>Standings</Button>{selected.visibility === 'public' && <Button secondary onClick={() => { const link = `${window.location.origin}/?season=${encodeURIComponent(s.season_id)}`; void navigator.clipboard?.writeText(link).then(() => flash('Public season link copied.')).catch(() => flash('Copy failed; use the season ID.', true)); }}>Share public standings</Button>}</div></div>)}</div> : <Empty>No season started for this league yet.</Empty>}
                </Section>
                {selected.is_owner && <>
                  {!seasons.length && <Section title="First season not yet configured"><p className="muted">Only the league owner can select games and start the first season.</p><Button onClick={() => setPage('season-setup')}>Set up first season</Button></Section>}
                  {seasons.length > 0 && <Section title="Schedule a future season change"><p className="muted">The checkboxes initially reflect the latest season. Changes take effect at the next season only. Existing season rules and scores are frozen.</p><GameChecks selection={games} setSelection={setGames} /><Button disabled={busy || games.length === 0} onClick={() => void act('schedule_games', { league_id: leagueId, games }, 'Changes scheduled for a future season.')}>Schedule selected games</Button></Section>}
                  <Section title="Private invitations"><Button disabled={busy} onClick={() => { const api = client; if (!api) return; void run(async () => { const r = await api.call('invite', { league_id: leagueId }) as { invite_token: string; expires_at: string }; setInvite(r.invite_token); setInviteExpiry(r.expires_at); flash('Single-use invitation created.'); }); }}>Create invitation</Button>{invite && <div className="invite"><label>Private invitation token <input readOnly value={invite} onFocus={(e: { currentTarget: HTMLInputElement }) => e.currentTarget.select()} /></label><small>Expires {dateText(inviteExpiry)}. Share privately; only one account can redeem it.</small><div className="actions"><Button secondary onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/?invite=${encodeURIComponent(invite)}`).then(() => flash('Invitation link copied.')).catch(() => flash('Clipboard unavailable; copy the token manually.', true))}>Copy invitation link</Button><Button danger onClick={() => void act('invite_revoke', { league_id: leagueId, invite_token: invite }, 'Invitation revoked.', async () => { setInvite(''); setInviteExpiry(''); })}>Revoke</Button></div></div>}</Section>
                </>}
              </>}
          {page === 'submit' && <>
            <div className="page-heading"><span className="overline">SHARE OR PASTE</span><h1>Submit a puzzle result</h1><p>Share directly from a puzzle game to the installed Android app or paste the game's text here. We never automatically submit incoming shares.</p></div>
            {waitingShare && <Section title="Another shared result is waiting"><p>Your current draft has not been overwritten. Loading the new share will replace the draft on screen.</p><div className="actions"><Button secondary onClick={() => { draftRef.current = waitingShare; setRawText(waitingShare); setShareMethod('android_share'); setUnderstands(false); setWaitingShare(null); flash('New share loaded for review.'); }}>Review new shared result</Button><Button secondary onClick={() => setWaitingShare(null)}>Keep current draft</Button></div></Section>}
            <Section title="Review the original share"><form className="stack" onSubmit={submitResult}><label>Original game share text<textarea value={rawText} onChange={e => { draftRef.current = e.target.value; setRawText(e.target.value); setShareMethod('paste'); setUnderstands(false); }} placeholder="Paste the game's complete shared result…" maxLength={16000} rows={8} required /></label><div className="preview"><span className="overline">DISPLAY-ONLY PREVIEW</span><strong>{rawText.trim() ? preview.status : 'No result entered'}</strong><p>{rawText.trim() ? `Detected header: ${catalogueName(preview.game)}.` : 'Enter a genuine share before confirming.'}</p><p className="muted">{preview.caveat}</p><small>{rawText.length} / 16,000 characters · {shareMethod === 'android_share' ? 'Android share intake' : 'Manual paste'}</small></div><label className="check wide"><input type="checkbox" checked={understands} onChange={e => setUnderstands(e.target.checked)} />I confirm this is my own completed result. I understand that the server may hold it for review and no points are guaranteed.</label><Button type="submit" disabled={busy}>Confirm and submit to server</Button></form><p className="muted" role="status">{!client ? 'Server connection is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to ignored .env.local, then restart Vite.' : !auth ? 'Sign in on the Account tab before submitting. Your draft will be preserved; tapping Confirm will take you there.' : !online ? 'You are offline: submission requires a live server receipt.' : !understands ? 'Tick the ownership/review acknowledgement, then tap Confirm.' : 'Ready for server-side submission. No score is awarded locally.'}</p></Section>
            {lastSubmit && <Section title="Server submission receipt"><dl className="receipt"><dt>Submission</dt><dd className="monospace">{lastSubmit.id}</dd><dt>Result</dt><dd>{lastSubmit.duplicate ? 'Duplicate — no new points' : lastSubmit.review ? 'Review may be required' : 'Processed by server'}</dd><dt>New league awards</dt><dd>{lastSubmit.awarded} (reported by server, not a client calculation)</dd></dl></Section>}
            {auth && <Section title="Your recent submission history">{history.length ? <div className="item-list">{history.slice(0, 20).map(h => <div className="item" key={h.id}><div><strong>{catalogueName(h.game)}</strong><small>{dateText(h.submitted_at)} · {h.parse_status} · {h.review_status}</small></div><button className="text-button" onClick={() => { setRequestId(h.id); setPage('moderation'); }}>Request review</button></div>)}</div> : <Empty>No results in the latest history window.</Empty>}<p className="muted">History is server-provided and may include pending or rejected results; this list is not a points tally.</p></Section>}
          </>}
          {page === 'rankings' && <>
            <div className="page-heading"><span className="overline">LEAGUE LEADERBOARDS</span><h1>Standings & streaks</h1><p>Combined points are a sum of eligible games. Streaks are separate and never add championship points.</p></div>
            <Section title="Choose a league & season"><div className="two"><label>My league<select value={leagueId} onChange={e => { const id = e.target.value; setLeagueId(id); setSeasonId(''); void run(() => loadLeague(id)); }}><option value="">Choose a league</option>{leagues.map(l => <option key={l.league_id} value={l.league_id}>{l.name}</option>)}</select></label><label>Season<select value={seasonId} onChange={e => setSeasonId(e.target.value)}><option value="">Choose a season</option>{seasons.map(s => <option value={s.season_id} key={s.season_id}>#{s.sequence_no} · {s.state}</option>)}</select></label></div><div className="actions"><Button secondary disabled={!seasonId || busy} onClick={() => void run(() => loadBoard(seasonId))}>Refresh standings</Button></div>
              {!auth && <p className="muted">Guests can open a public season by its UUID. Private season standings are protected by the server.</p>}
              {!auth && <label>Public season ID<input value={seasonId} onChange={e => setSeasonId(e.target.value)} placeholder="Season UUID" /></label>}
              {selectedSeason && <p className="muted">{dateText(selectedSeason.starts_at)} – {dateText(selectedSeason.ends_at)} · {selectedSeason.state}</p>}
            </Section>
            {seasonId && <><Section title="Championship leaderboard"><label>Show<select value={boardGame} onChange={e => setBoardGame(e.target.value as GameId | 'combined')}><option value="combined">Combined points</option>{gameCatalog.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>{gameScores(board, boardGame).length ? <div className="leaderboard" role="table" aria-label="Competition rankings"><div className="score-row header-row" role="row"><span>Rank</span><span>Player</span><span>Points</span></div>{gameScores(board, boardGame).map((entry, i) => <div className="score-row" role="row" key={`${entry.nickname}-${i}`}><span className="rank">#{entry.rank}</span><span>{entry.nickname}</span><strong>{entry.total}</strong></div>)}</div> : <Empty>No awarded points to display for this game and season.</Empty>}</Section>
              <Section title="Longest streaks"><p className="muted">Streaks are independent statistics. They do not modify any championship score.</p>{board.streaks.length ? <div className="item-list">{board.streaks.map((s, i) => <div className="item" key={`${s.nickname}-${s.game}-${i}`}><div><strong>{s.nickname}</strong><small>{catalogueName(s.game)}</small></div><strong>{s.longest_streak} days</strong></div>)}</div> : <Empty>No verified streak data for this season.</Empty>}</Section></>}
          </>}
          {page === 'moderation' && <>
            <div className="page-heading"><span className="overline">TRUSTED COMPETITION</span><h1>Reviews & community safety</h1><p>Only authorised owners or explicitly delegated moderators can review requests. The backend requires independent decisions and verified daily puzzle identity before approval.</p></div>
            <Section title="Select a league"><label>League<select value={leagueId} onChange={e => { setLeagueId(e.target.value); setReviews([]); setReports([]); setMembers([]); }}><option value="">Select a league</option>{leagues.map(l => <option key={l.league_id} value={l.league_id}>{l.name}</option>)}</select></label><div className="actions"><Button secondary disabled={!leagueId || busy} onClick={() => void fetchReview()}>Load authorised queues</Button><Button secondary disabled={!leagueId || busy} onClick={() => void loadRoster()}>Load visible members</Button></div></Section>
            {auth && <>
              <Section title="Request an historical exception or score correction"><p className="muted">You can request a league-specific historical exception for your own submission. A correction requires an already-awarded entry and the same game/puzzle identity.</p><div className="stack"><label>Submission ID<select value={requestId} onChange={e => setRequestId(e.target.value)}><option value="">Choose your result</option>{history.map(h => <option value={h.id} key={h.id}>{catalogueName(h.game)} · {dateText(h.submitted_at)} · {h.review_status}</option>)}</select></label><label>Reason<input value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} maxLength={2000} placeholder="Explain the request" /></label><div className="actions"><Button disabled={!leagueId || !UUID.test(requestId) || busy} onClick={() => void act('request_historical', { submission_id: requestId, league_id: leagueId, rationale: correctionReason.trim() }, 'Historical exception requested; independent review required.')}>Request historical exception</Button></div><label>Replacement original share (for correction only)<textarea value={correctionText} onChange={e => setCorrectionText(e.target.value)} rows={5} maxLength={16000} placeholder="Paste the corrected complete game share" /></label><Button secondary disabled={!leagueId || !UUID.test(requestId) || !correctionText.trim() || busy} onClick={() => void act('request_correction', { submission_id: requestId, league_id: leagueId, rationale: correctionReason.trim(), replacement_raw_text: correctionText }, 'Correction request submitted; no scores changed until independent approval.')}>Request score correction</Button></div></Section>
              <Section title="Report a member"><p className="muted">Use a valid account UUID if you know it; otherwise file a general report for this league. Report reasons are private to authorised reviewers.</p><div className="stack"><label>Subject user UUID (optional)<input value={reportSubject} onChange={e => setReportSubject(e.target.value)} /></label><label>Reason<textarea rows={3} value={reportReason} onChange={e => setReportReason(e.target.value)} maxLength={2000} required /></label><Button disabled={!leagueId || reportReason.trim().length < 3 || (reportSubject.trim() !== '' && !UUID.test(reportSubject.trim())) || busy} onClick={() => void act('report', { league_id: leagueId, reason: reportReason.trim(), ...(reportSubject.trim() ? { subject_user_id: reportSubject.trim() } : {}) }, 'Report filed privately.', async () => { setReportReason(''); setReportSubject(''); })}>File report</Button></div></Section>
              <Section title={`Pending review requests (${reviews.length})`}>
                <label>Decision rationale (minimum 3 characters)<textarea rows={2} maxLength={2000} value={reviewRationale} onChange={e => setReviewRationale(e.target.value)} placeholder="Reason for each independent decision" /></label>
                {reviews.length ? reviews.map(r => <article key={r.request_id} className="review"><strong>{r.kind} · {catalogueName(r.game)}</strong><small>{dateText(r.submitted_at)} · {r.parse_status} · {r.review_status}</small><p>Request: {r.rationale}</p><details><summary>View submitted text</summary><pre>{r.raw_text}</pre>{r.correction_proposed_text && <><p>Proposed corrected text:</p><pre>{r.correction_proposed_text}</pre></>}</details><div className="actions"><Button disabled={busy || reviewRationale.trim().length < 3} onClick={() => void reviewAction(r.request_id, 'approved')}>Approve (server verifies)</Button><Button secondary disabled={busy || reviewRationale.trim().length < 3} onClick={() => void reviewAction(r.request_id, 'rejected')}>Reject</Button></div></article>) : <Empty>No requests loaded or none pending. Queue access is enforced server-side.</Empty>}
              </Section>
              <Section title={`Reports requiring action (${reports.length})`}>{reports.length ? reports.map(r => <div className="item" key={r.report_id}><div><strong>{r.reason}</strong><small>{dateText(r.created_at)} · Subject: {r.subject_user_id ? `${r.subject_user_id.slice(0, 8)}…` : 'General'}</small></div><Button disabled={busy} secondary onClick={() => void act('resolve_report', { league_id: leagueId, report_id: r.report_id }, 'Report resolved.', fetchReview)}>Resolve</Button></div>) : <Empty>No reports loaded or none pending.</Empty>}</Section>
              <Section title="Roster & delegated permissions"><p className="muted">Roster visibility is restricted by database policies. Only owners can change moderator, suspension or removal status; a moderator role alone does not grant review authority.</p>{members.length ? <div className="item-list">{members.map(m => <div className="item" key={m.id}><div><strong>{m.role}</strong><small>Account {m.user_id.slice(0, 8)}… · joined {dateText(m.joined_at)}</small></div><Button secondary onClick={() => setMemberId(m.user_id)}>Manage</Button></div>)}</div> : <Empty>No roster loaded. Members without roster privileges may only see their own membership.</Empty>}
                {isOwner(selected) && <div className="stack admin"><label>Selected member UUID<input value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="Choose from roster" /></label><label>Reason for suspension (minimum 3 characters)<input value={moderationReason} onChange={e => setModerationReason(e.target.value)} /></label><div className="actions"><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void run(async () => { await client?.roleRpc('set_league_moderator', { p_league_id: leagueId, p_member_user_id: memberId, p_is_moderator: true }); flash('Moderator role enabled. Review authority remains separately delegated.'); await loadRoster(); })}>Promote moderator</Button><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void run(async () => { await client?.roleRpc('set_league_moderator', { p_league_id: leagueId, p_member_user_id: memberId, p_is_moderator: false }); flash('Moderator role removed.'); await loadRoster(); })}>Demote</Button><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void act('delegate_review', { league_id: leagueId, member_id: memberId, enabled: true }, 'Review delegation granted to active moderator.')}>Grant review</Button><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void act('delegate_review', { league_id: leagueId, member_id: memberId, enabled: false }, 'Review delegation revoked.')}>Revoke review</Button><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void run(async () => { await client?.roleRpc('set_league_moderator_permission', { p_league_id: leagueId, p_member_user_id: memberId, p_permission_name: 'view_member_roster', p_enabled: true }); flash('Roster visibility delegated.'); })}>Grant roster view</Button><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void run(async () => { await client?.roleRpc('set_league_moderator_permission', { p_league_id: leagueId, p_member_user_id: memberId, p_permission_name: 'view_member_roster', p_enabled: false }); flash('Roster delegation removed.'); })}>Revoke roster view</Button><Button danger disabled={!UUID.test(memberId) || moderationReason.trim().length < 3 || busy} onClick={() => void act('suspend_member', { league_id: leagueId, member_id: memberId, reason: moderationReason.trim() }, 'Member suspended.', loadRoster)}>Suspend</Button><Button secondary disabled={!UUID.test(memberId) || busy} onClick={() => void act('unsuspend_member', { league_id: leagueId, member_id: memberId }, 'Member suspension lifted.')}>Unsuspend</Button><Button danger disabled={!UUID.test(memberId) || busy} onClick={() => { if (window.confirm('Remove this member from the current league?')) void act('remove_member', { league_id: leagueId, member_id: memberId }, 'Current membership ended.', loadRoster); }}>Remove</Button></div></div>}
              </Section>
            </>}
          </>}
        </>}
      </main></div>
    <footer className="footer"><span>Phase 5 local implementation · {publicConfig.stage}</span><span>Server-authoritative scores · {online ? 'Connected to network' : 'Offline mode: read-only'}</span></footer>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(n => <button className={page === n.id || ((page === 'season-setup' || page === 'league-detail') && n.id === 'leagues') ? 'active' : ''} key={n.id} onClick={() => setPage(n.id)} aria-current={page === n.id || ((page === 'season-setup' || page === 'league-detail') && n.id === 'leagues') ? 'page' : undefined}>{n.id === 'moderation' ? 'Review' : n.label}</button>)}</nav>
  </div>;
}
export default App;
