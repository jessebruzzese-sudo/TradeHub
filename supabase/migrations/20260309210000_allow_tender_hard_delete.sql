-- Allow hard deletes on tenders: drop any trigger that blocks DELETE with "Hard deletes are not allowed"
-- This trigger may have been added via Supabase Dashboard or a template

-- 1) Drop by matching trigger function body
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE c.relname = 'tenders'
      AND NOT t.tgisinternal
      AND (t.tgtype & 8) = 8  -- DELETE event
      AND pg_get_functiondef(p.oid) ILIKE '%Hard deletes are not allowed%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tenders', r.tgname);
    RAISE NOTICE 'Dropped trigger % on tenders', r.tgname;
  END LOOP;
END $$;

-- 2) Drop common trigger names that may block hard deletes (idempotent)
DROP TRIGGER IF EXISTS tenders_prevent_hard_delete ON public.tenders;
DROP TRIGGER IF EXISTS tenders_block_hard_delete ON public.tenders;
DROP TRIGGER IF EXISTS tenders_soft_delete_only ON public.tenders;
DROP TRIGGER IF EXISTS prevent_hard_delete ON public.tenders;
