# Supabase DB cleanup — jobs-only architecture

The app targets a **jobs-only** model (jobs, applications, conversations, messages). If this project ever had tender/quote tables, they may still exist in Postgres until removed manually.

**Do not run the statements below blindly.** Confirm names with `\dt public.*tender*` / `\dt public.*quote*` (or the Supabase Table Editor), check for foreign keys and dependents, and take a backup first.

## Tables / objects to review and drop (if present)

- `tenders`, `tender_quotes`, `tender_quote_requests`, `tender_documents`, `tender_trade_requirements`
- Any views/RPCs/policies/triggers named with `tender` or `quote_request` (excluding job pay type `quote_required` or profile `quote_on_request`)

## Legacy usage metric enum value

`usage_metrics.metric_type` was created with `'QUOTE_RECEIVED'` (see migration `20251231232045_add_context_and_update_pricing_model.sql`). The application union in `src/lib/types.ts` uses jobs-only values (e.g. `APPLICATION_SUBMITTED`). Optional cleanup:

1. Update or delete rows where `metric_type = 'QUOTE_RECEIVED'`.
2. Replace the column CHECK constraint with a list that omits `QUOTE_RECEIVED` (requires a new migration and constraint recreation in Postgres).

## App compatibility

- Job `pay_type` may still include `quote_required` in the database for older rows; the UI labels it **Rate to be agreed**.
- Profile `pricing_type` may still include `quote_on_request`; the UI labels it **Pricing on enquiry**.
