// Production-bound parser port of preserved Phase 1 v0.4.0 research.
// No external fetches or account assumptions. Never confuses parsing with verified identity.
export const PARSER_VERSION = 'p4-1.0.0';
const validGrid = (line, width, fox = false) => {
  const tiles = line.match(fox ? /🟩|🟥|🟨|⬛|⬜/gu : /🟩|🟨|⬛|⬜/gu) || [];
  return tiles.length === width && tiles.join('') === line ? tiles : null;
};
const result = (game, status, raw, fields = {}, issues = [], identityKey = null) => ({
  parser_version: PARSER_VERSION, game, status, raw_text: raw, fields, issues,
  identity_key: identityKey, verified_identity: false, awarded: false,
});
const monthNumber = (s) => {
  const a = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const n = a.indexOf(s.toLowerCase()); return n < 0 ? null : n + 1;
};
const validDay = (d, month, yr) => {
  const m = monthNumber(month);
  if (!m) return null;
  const iso = `${yr}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === iso ? iso : null;
};
export function parseShare(raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 16000)
    return result(null, 'invalid', String(raw ?? ''), {}, ['empty_or_oversize_input']);
  const lines = raw.split(/\r?\n/u).map(x => x.trim()).filter(Boolean);
  const h = lines[0];
  let m = /^Wordle ([\d,]+) ([1-6X])\/6\s*$/iu.exec(h);
  if (m) {
    const n = Number(m[1].replaceAll(',','')), tries = m[2].toUpperCase(), failed = tries === 'X';
    const expected = failed ? 6 : Number(tries);
    const remaining = lines.slice(1).filter(x => !/^https?:\/\//u.test(x));
    if (!Number.isSafeInteger(n) || n <= 0) return result('wordle','invalid',raw,{},['invalid_puzzle_number']);
    const rows = remaining.slice(0, expected).map(x => validGrid(x,5));
    if (rows.length !== expected || rows.some(x => !x)) return result('wordle','invalid',raw,{},['unexpected_grid_content']);
    if (failed ? rows.some(x => x.every(y => y==='🟩')) : !rows.at(-1).every(y => y==='🟩'))
      return result('wordle','invalid',raw,{},['win_failure_grid_contradiction']);
    if (remaining.slice(expected).some(x => validGrid(x,5)))
      return result('wordle','invalid',raw,{},['extra_grid']);
    const fields = {puzzle_number:n,attempts:failed?null:expected,completed_failure:failed,grid:rows,puzzle_date:null};
    const trailing = remaining.length > expected;
    return result('wordle',trailing?'needs_review':'recognized_valid',raw,fields,
      trailing?['unrecognized_trailing_text','puzzle_date_not_verified']:['puzzle_date_not_verified'],String(n));
  }
  if (/^wordle\b/iu.test(h)) return result('wordle','invalid',raw,{},['unrecognized_header']);

  m = /^Minute Cryptic - (\d{1,2}) ([A-Za-z]+), (\d{4})$/u.exec(h);
  if (m) {
    const day = validDay(Number(m[1]),m[2],Number(m[3]));
    if (!day) return result('minute_cryptic','invalid',raw,{},['invalid_date']);
    if (lines.length < 4 || !/^["“].+["”]\s*\([\d, ]+\)$/u.test(lines[1]))
      return result('minute_cryptic','ambiguous',raw,{},['unrecognized_clue']);
    const rx = /^(🏆|🤝|🏋\uFE0F?)\s*(\d+) hints?\s*[–-]\s*(?:(\d+) (under|over) the community par|matched the community par)\s*\(([\d,]+) solvers so far\)\.?(?:\s*Time:\s*([^\n]+))?\.?$/iu;
    const hits = lines.slice(2).map(x=>rx.exec(x)).filter(Boolean);
    if (hits.length !== 1) return result('minute_cryptic','ambiguous',raw,{},['unrecognized_par_line'],day);
    const c=hits[0], hints=Number(c[2]);
    if (!Number.isSafeInteger(hints) || hints < 0) return result('minute_cryptic','invalid',raw,{},['invalid_hints']);
    const fields={puzzle_date:day,clue:lines[1],hints_used:hints,
      signed_under_par_difference:c[3] ? (c[4].toLowerCase()==='over'?-1:1)*Number(c[3]):0,
      solver_count_observed:Number(c[5].replaceAll(',','')),time_display:c[6]?.replace(/\.$/u,'')??null,
      puzzle_number:null,result_icon:c[1]};
    return result('minute_cryptic','recognized_valid',raw,fields,
      ['source_day_self_reported_not_officially_verified','hint_taxonomy_unverified'],day);
  }
  if (/^minute cryptic/iu.test(h)) return result('minute_cryptic','ambiguous',raw,{},['unrecognized_header']);

  m=/^🦊#FoxiMax\s+#(\d+)\s+(\d+|X)\/(\d+)\s+\((\d+) letters\)$/iu.exec(h);
  if (m) {
    const n=Number(m[1]), attempts=m[2].toUpperCase()==='X'?null:Number(m[2]), cap=Number(m[3]), letters=Number(m[4]);
    if (!Number.isSafeInteger(n)||n<1||cap<1||cap>30||letters<1|| (attempts!==null&&(attempts<1||attempts>cap)))
      return result('foximax','invalid',raw,{},['invalid_numeric_field']);
    const payload=lines.slice(1).filter(x=>!/^https?:\/\//u.test(x));
    const rows=payload.map(x=>validGrid(x,5,true));
    if (rows.length!==(attempts??cap)||rows.some(x=>!x)) return result('foximax','invalid',raw,{},['invalid_grid_or_rows']);
    const fields={puzzle_number:n,fraction_numerator:attempts,fraction_denominator:cap,
      completed_failure:attempts===null,letter_count_displayed:letters,grid:rows,puzzle_date:null};
    return result('foximax','needs_review',raw,fields,['mode_unverified','puzzle_date_not_verified'],String(n));
  }
  if (/^🦊#foximax/iu.test(h)) return result('foximax','ambiguous',raw,{},['unrecognized_header']);

  m=/^#Polygonle\s+([\d,]+)\s+([1-6]|😔|🎯)[\uFE0E\uFE0F]?\/6[\uFE0E\uFE0F]?$/iu.exec(h);
  if (m) {
    const n=Number(m[1].replaceAll(',','')), failed=m[2]==='😔', attempts=failed?null:(m[2]==='🎯'?1:Number(m[2]));
    if (!Number.isSafeInteger(n)||n<1) return result('polygonle','invalid',raw,{},['invalid_number']);
    const rest=lines.slice(1).filter(x=>!/^https?:\/\//u.test(x));
    if (!rest.length) return result('polygonle','ambiguous',raw,{},['no_pattern_header']);
    const pattern=rest.shift(), rows=[]; let streak=null,width=null;
    for (const line of rest) {
      const sm=/^🔥\s*streak:\s*(\d+)$/iu.exec(line);
      if (sm && streak===null) {streak=Number(sm[1]);continue;}
      const tiles=line.match(/🟩|🟨|⬛|⬜/gu)||[];
      if (tiles.join('')!==line||tiles.length<5||tiles.length>8)
        return result('polygonle','ambiguous',raw,{},['unsupported_grid_or_trailer']);
      width??=tiles.length;
      if(width!==tiles.length) return result('polygonle','invalid',raw,{},['inconsistent_length']);
      rows.push(tiles);
    }
    if (rows.length!==(attempts??6)) return result('polygonle','invalid',raw,{},['row_count']);
    if (failed?rows.some(x=>x.every(t=>t==='🟩')):!rows.at(-1).every(t=>t==='🟩'))
      return result('polygonle','invalid',raw,{},['win_failure_grid_contradiction']);
    const fields={puzzle_number:n,attempts,completed_failure:failed,attempt_limit_displayed:6,
      pattern_header_raw:pattern,word_length_observed:width,grid:rows,streak_displayed:streak,puzzle_date:null};
    return result('polygonle','needs_review',raw,fields,['mode_unverified','puzzle_date_not_verified'],String(n));
  }
  if (/^#polygonle/iu.test(h)) return result('polygonle','ambiguous',raw,{},['unrecognized_header']);

  m=/^Krillion\s+#(\d+)\s+(.+)$/iu.exec(h);
  if (m) {
    const n=Number(m[1]), rest=lines.slice(1).filter(x=>!/^https?:\/\//u.test(x));
    if (!Number.isSafeInteger(n)||n<1) return result('krillion','invalid',raw,{},['invalid_number']);
    if(rest.length!==2||!/^\d+$/u.test(rest[0])||!rest[1])
      return result('krillion','ambiguous',raw,{},['unknown_score_or_trail']);
    const fields={puzzle_number:n,header_symbol_raw:m[2],reported_number:Number(rest[0]),
      symbol_trail_raw:rest[1],puzzle_date:null};
    if (!Number.isSafeInteger(fields.reported_number)||fields.reported_number>700)
      return result('krillion','invalid',raw,fields,['score_out_of_range'],String(n));
    return result('krillion','needs_review',raw,fields,['mode_unverified','puzzle_date_not_verified'],String(n));
  }
  if (/^krillion/iu.test(h)) return result('krillion','ambiguous',raw,{},['unrecognized_header']);
  return result(null,'unrecognized',raw,{},['unsupported_game']);
}

export const RULE_VERSIONS=Object.freeze({
  wordle:'wordle-fixed-v1-approved',
  minute_cryptic:'minute-cryptic-hints-v1-approved',
  foximax:'foximax-original-n8-v1-approved',
  polygonle:'polygonle-standard-v1-approved',
  krillion:'krillion-daily-absolute700-v1-approved'
});
export function previewPerformance(p) {
  if (!p || !['recognized_valid','needs_review'].includes(p.status) || !RULE_VERSIONS[p.game]) return null;
  const f=p.fields;
  if(p.game==='minute_cryptic')return Number.isInteger(f.hints_used)&&f.hints_used>=0?Math.max(0,10-f.hints_used):null;
  if(p.game==='krillion')return Number.isInteger(f.reported_number)&&f.reported_number>=0&&f.reported_number<=700?Math.min(10,Math.floor((f.reported_number+35)/70)):null;
  if(p.game==='foximax'&&f.fraction_denominator!==8)return null;
  if(p.game==='polygonle'&&(f.attempt_limit_displayed!==6||![6,7,8].includes(f.word_length_observed)))return null;
  if(f.completed_failure===true)return 0;
  const attempts=p.game==='foximax'?f.fraction_numerator:f.attempts;
  if(!Number.isInteger(attempts))return null;
  const values=p.game==='foximax'?[10,9,7,6,5,4,2,1]:[10,8,6,4,2,1];
  return values[attempts-1]??null;
}
