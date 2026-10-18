-- Synthetic test for migration 13. ALWAYS ROLLBACK; no real submission changed.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '45s';
DO $security$
DECLARE
  v_proc oid := to_regprocedure('app_private.p6_reparse_unlinked_polygonle(uuid,text,text,jsonb,text,jsonb,text,text,text)');
BEGIN
  IF v_proc IS NULL THEN RAISE EXCEPTION 'Recovery function missing'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc WHERE oid=v_proc AND prosecdef) THEN
    RAISE EXCEPTION 'Recovery function must be SECURITY INVOKER';
  END IF;
  IF has_function_privilege('anon',v_proc,'EXECUTE')
     OR has_function_privilege('authenticated',v_proc,'EXECUTE') THEN
    RAISE EXCEPTION 'Recovery function exposed to client role';
  END IF;
  RAISE NOTICE 'PASS: recovery function remains admin-only';
END $security$;
DO $synthetic$
DECLARE
  v_account uuid;
  v_sub uuid;
  v_raw text := '#Polygonle 1539 🎯/6' || E'\n' || 'PATTERN' || E'\n' || '🟩🟩🟩🟩🟩🟩🟩';
  v_sha text;
  v_event bigint;
  v_fields jsonb := '{"puzzle_number":1539,"attempts":1,"completed_failure":false,"attempt_limit_displayed":6,"pattern_header_raw":"PATTERN","word_length_observed":7,"grid":[["🟩","🟩","🟩","🟩","🟩","🟩","🟩"]],"streak_displayed":null,"puzzle_date":null}'::jsonb;
BEGIN
  SELECT account_id INTO STRICT v_account FROM public.result_submissions
  WHERE review_status='pending' ORDER BY id LIMIT 1;
  INSERT INTO public.result_submissions(account_id,game_id,puzzle_id,raw_share_text,
    submission_method,parser_version,parse_status,parsed_fields,review_status)
  VALUES(v_account,'polygonle',NULL,v_raw,'paste','p4-older',
         'ambiguous','{}'::jsonb,'pending') RETURNING id INTO v_sub;
  v_sha := encode(extensions.digest(convert_to(v_raw,'UTF8'),'sha256'),'hex');

  BEGIN
    PERFORM app_private.p6_reparse_unlinked_polygonle(
      v_sub,repeat('0',64),'p4-older','{}'::jsonb,'p4-1.0.0',v_fields,
      'Synthetic rollback','Expected source hash mismatch is a security rejection',
      'local://phase6/synthetic');
    RAISE EXCEPTION 'Incorrect original-share hash unexpectedly accepted';
  EXCEPTION WHEN OTHERS THEN
    IF position('Stale source/parser/fields: abort' in SQLERRM)=0 THEN RAISE; END IF;
  END;

  v_event := app_private.p6_reparse_unlinked_polygonle(
    v_sub,v_sha,'p4-older','{}'::jsonb,'p4-1.0.0',v_fields,
    'Synthetic rollback','Verify unlinked parser-only reparse under transaction rollback',
    'local://phase6/synthetic');
  IF v_event IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.result_submissions WHERE id=v_sub
      AND raw_share_text=v_raw AND puzzle_id IS NULL AND review_status='pending'
      AND parser_version='p4-1.0.0' AND parse_status='needs_review'
      AND parsed_fields=v_fields
  ) THEN RAISE EXCEPTION 'Parser-only update altered protected row'; END IF;
  IF (SELECT count(*) FROM app_private.p6_pending_reparse_events
      WHERE submission_id=v_sub)<>1 THEN RAISE EXCEPTION 'Missing exactly one audit event'; END IF;
  IF EXISTS(SELECT 1 FROM public.league_score_entries WHERE submission_id=v_sub)
    THEN RAISE EXCEPTION 'Unexpected award'; END IF;
  BEGIN
    UPDATE app_private.p6_pending_reparse_events SET reason='tampered'
    WHERE id=v_event;
    RAISE EXCEPTION 'Audit event unexpectedly mutable';
  EXCEPTION WHEN OTHERS THEN
    IF position('immutable' in lower(SQLERRM))=0
       AND position('cannot' in lower(SQLERRM))=0 THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: synthetic unlinked reparse, original/puzzle immutability, no awards, immutable audit';
END $synthetic$;
ROLLBACK;
