-- Synthetic, transactional compatibility gate for PostgreSQL regex SQLSTATE 2201B.
-- Executed as the LOCAL disposable postgres role after all candidate migrations.
-- Never use this SQL against hosted or any non-disposable database.
BEGIN;
DO $p7_url_gate$
DECLARE
  v_day date := current_date;
  v_valid_url text := 'https://' || repeat('a',500);
  v_before bigint;
  v_id bigint;
  v_reply jsonb;
  v_invalid text;
BEGIN
  IF char_length(v_valid_url) <> 508 THEN
    RAISE EXCEPTION 'Synthetic URL fixture length unexpected';
  END IF;

  -- Exercise the REAL operator, real table constraint and real lookup, not a mocked expression.
  SELECT count(*) INTO v_before FROM public.league_score_entries;
  v_id := app_private.p7_register_daily_reference(
    'wordle','999999998',v_day,'published_number','official_game',
    v_valid_url,repeat('a',64),now()-interval '1 minute',
    now()+interval '2 hours',null,null
  );
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Valid HTTPS reference failed to register';
  END IF;
  v_reply := public.p7_identity_reference('wordle','999999998');
  IF v_reply IS NULL OR v_reply->>'source_url' IS DISTINCT FROM v_valid_url THEN
    RAISE EXCEPTION 'Real reference lookup failed';
  END IF;
  IF (SELECT count(*) FROM public.league_score_entries) IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'Reference registration unexpectedly affected awards';
  END IF;

  -- Every invalid input must be rejected by the trusted operator BEFORE table insert.
  FOREACH v_invalid IN ARRAY ARRAY[
     'http://official.example/puzzle',
     'https://abc',
     'https://official.example/a b',
     'https://official.example/' || chr(10) || 'test',
     'https://' || repeat('a',501)
  ] LOOP
    BEGIN
      PERFORM app_private.p7_register_daily_reference(
        'wordle','999999997',v_day,'published_number','official_game',
        v_invalid,repeat('a',64),now()-interval '1 minute',
        now()+interval '2 hours',null,null
      );
      RAISE EXCEPTION 'Insecure URL unexpectedly registered';
    EXCEPTION WHEN SQLSTATE '22023' THEN
      NULL; -- Expected restricted input rejection only.
    END;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM app_private.p7_daily_reference
    WHERE game_id='wordle' AND identity_key='999999997'
  ) THEN
    RAISE EXCEPTION 'Rejected URL reference persisted';
  END IF;
END $p7_url_gate$;
ROLLBACK;
