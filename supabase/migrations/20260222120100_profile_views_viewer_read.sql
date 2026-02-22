-- Allow viewers to read their own view records for per-day dedup checks
create policy "Users can read their own viewer records"
on public.profile_views
for select
to authenticated
using (auth.uid() = viewer_user_id);
