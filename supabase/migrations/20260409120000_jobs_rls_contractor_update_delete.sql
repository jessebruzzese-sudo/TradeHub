-- Align jobs UPDATE and DELETE RLS with contractor-only job posting/editing (same rule as INSERT).
-- Previously: UPDATE/DELETE were owner-only (`auth.uid() = contractor_id`) without `role = 'contractor'`.
-- INSERT already required: owner + EXISTS (... role = 'contractor').
-- Admin moderation remains on a separate policy: "Admins can update job approval status" (unchanged).

DROP POLICY IF EXISTS "Contractors can update own jobs" ON public.jobs;

CREATE POLICY "Contractors can update own jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = contractor_id
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'contractor')
  )
  WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'contractor')
  );

DROP POLICY IF EXISTS "Contractors can delete own jobs" ON public.jobs;

CREATE POLICY "Contractors can delete own jobs"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = contractor_id
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'contractor')
  );
