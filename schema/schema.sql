


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."abn_verification_status" AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


ALTER TYPE "public"."abn_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."subcontractor_plan_type" AS ENUM (
    'NONE',
    'PRO_10'
);


ALTER TYPE "public"."subcontractor_plan_type" OWNER TO "postgres";


CREATE TYPE "public"."subcontractor_subscription_status" AS ENUM (
    'NONE',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED'
);


ALTER TYPE "public"."subcontractor_subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_quote_request"("p_request_id" "uuid", "p_trade_slug" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tender_id uuid;
  v_builder_id uuid;
  v_requester_id uuid;
  v_status text;
  v_used int;
  v_is_premium boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.tender_id, r.requester_id, r.status
  INTO v_tender_id, v_requester_id, v_status
  FROM public.tender_quote_requests r
  WHERE r.id = p_request_id;

  IF v_tender_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  SELECT builder_id
  INTO v_builder_id
  FROM public.tenders
  WHERE id = v_tender_id AND deleted_at IS NULL;

  IF v_builder_id <> v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  v_is_premium := public.is_premium_user(v_requester_id);

  IF NOT v_is_premium THEN
    INSERT INTO public.user_trade_quote_credits (user_id, trade_slug, used_count)
    VALUES (v_requester_id, p_trade_slug, 0)
    ON CONFLICT (user_id, trade_slug) DO NOTHING;

    SELECT used_count INTO v_used
    FROM public.user_trade_quote_credits
    WHERE user_id = v_requester_id AND trade_slug = p_trade_slug;

    IF v_used >= 3 THEN
      RAISE EXCEPTION 'quote_trade_limit_reached';
    END IF;

    UPDATE public.user_trade_quote_credits
      SET used_count = used_count + 1
    WHERE user_id = v_requester_id AND trade_slug = p_trade_slug;
  END IF;

  UPDATE public.tender_quote_requests
    SET status = 'ACCEPTED',
        updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, description, data, link)
  VALUES (
    v_requester_id,
    'QUOTE_REQUEST_ACCEPTED',
    'Your quote request was accepted',
    'The tender poster has accepted your request to quote.',
    jsonb_build_object('tender_id', v_tender_id, 'trade_slug', p_trade_slug),
    '/tenders/' || v_tender_id
  );
END;
$$;


ALTER FUNCTION "public"."accept_quote_request"("p_request_id" "uuid", "p_trade_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_user_billing_field_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Allow server/service role to update anything
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only applies to UPDATE
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Reject updates that attempt to change billing/entitlement fields
  IF
    COALESCE(NEW.active_plan, 'NONE') <> COALESCE(OLD.active_plan, 'NONE')
    OR COALESCE(NEW.subscription_status, 'NONE') <> COALESCE(OLD.subscription_status, 'NONE')
    OR NEW.subscription_renews_at IS DISTINCT FROM OLD.subscription_renews_at
    OR NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at
    OR NEW.subscription_canceled_at IS DISTINCT FROM OLD.subscription_canceled_at
    OR NEW.complimentary_premium_until IS DISTINCT FROM OLD.complimentary_premium_until
    OR COALESCE(NEW.stripe_customer_id, '') <> COALESCE(OLD.stripe_customer_id, '')
    OR COALESCE(NEW.stripe_subscription_id, '') <> COALESCE(OLD.stripe_subscription_id, '')
    OR COALESCE(NEW.additional_trades_unlocked, false) <> COALESCE(OLD.additional_trades_unlocked, false)
  THEN
    RAISE EXCEPTION 'Billing/subscription fields are server-managed';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_user_billing_field_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_profile_strength"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  u public.users%rowtype;

  activity_points int := 0;
  links_points int := 0;
  completeness_points int := 0;
  abn_points int := 0;
  total_points int := 0;

  effective_last_active timestamptz;
  inactive_days numeric;
  band text;
begin
  select *
  into u
  from public.users
  where id = p_user_id;

  if not found then
    return jsonb_build_object(
      'total', 0,
      'band', 'LOW',
      'activity', 0,
      'links', 0,
      'completeness', 0,
      'abn', 0,
      'activity_points', 0,
      'links_points', 0,
      'completeness_points', 0,
      'abn_points', 0,
      'google_points', 0,
      'likes_points', 0,
      'last_active_at', null
    );
  end if;

  effective_last_active :=
    coalesce(
      u.last_seen_at,
      u.updated_at,
      u.created_at
    );

  if effective_last_active is not null then
    inactive_days := extract(epoch from (now() - effective_last_active)) / 86400.0;

    if inactive_days <= 1 then activity_points := 32;
    elsif inactive_days <= 7 then activity_points := 24;
    elsif inactive_days <= 30 then activity_points := 16;
    elsif inactive_days <= 90 then activity_points := 8;
    else activity_points := 0;
    end if;
  end if;

  links_points :=
    least(
      12,
      (case when nullif(trim(coalesce(u.website, '')), '') is not null then 4 else 0 end) +
      (case when nullif(trim(coalesce(u.instagram, '')), '') is not null then 2 else 0 end) +
      (case when nullif(trim(coalesce(u.facebook, '')), '') is not null then 2 else 0 end) +
      (case when nullif(trim(coalesce(u.linkedin, '')), '') is not null then 2 else 0 end) +
      (case when nullif(trim(coalesce(u.tiktok, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.youtube, '')), '') is not null then 1 else 0 end)
    );

  completeness_points :=
    least(
      13,
      (case when nullif(trim(coalesce(u.bio, '')), '') is not null then 3 else 0 end) +
      (case when nullif(trim(coalesce(u.mini_bio, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.primary_trade, '')), '') is not null then 2 else 0 end) +
      (case when coalesce(array_length(u.additional_trades, 1), 0) > 0 then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.location, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.postcode, '')), '') is not null then 1 else 0 end) +
      (case when nullif(trim(coalesce(u.phone, '')), '') is not null and coalesce(u.show_phone_on_profile, false) = true then 1 else 0 end) +
      (case when coalesce(u.completed_jobs, 0) > 0 then 2 else 0 end)
    );

  if coalesce(u.abn_verified, false) = true
     or upper(coalesce(u.abn_status::text, '')) = 'VERIFIED'
  then
    abn_points := 10;
  else
    abn_points := 0;
  end if;

  total_points :=
    activity_points +
    links_points +
    completeness_points +
    abn_points;

  total_points := least(100, greatest(0, total_points));

  band :=
    case
      when total_points >= 70 then 'HIGH'
      when total_points >= 40 then 'MEDIUM'
      else 'LOW'
    end;

  return jsonb_build_object(
    'total', total_points,
    'band', band,
    'activity', activity_points,
    'links', links_points,
    'completeness', completeness_points,
    'abn', abn_points,
    'activity_points', activity_points,
    'links_points', links_points,
    'completeness_points', completeness_points,
    'abn_points', abn_points,
    'google_points', 0,
    'likes_points', 0,
    'last_active_at', effective_last_active
  );
end;
$$;


ALTER FUNCTION "public"."calculate_profile_strength"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_publish_tender"("uid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_is_premium boolean;
  v_is_owner boolean;
  v_published_this_month int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- uid = tender_id (yes the arg name is misleading, but we keep it to match your RPC)
  v_is_owner := public.is_tender_owner(uid, v_uid);
  if not v_is_owner and not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  -- premium = unlimited
  v_is_premium := public.is_premium_user(v_uid);
  if v_is_premium then
    return true;
  end if;

  -- Free: 1 published tender per month
  select count(*) into v_published_this_month
  from public.tenders t
  where t.builder_id = v_uid
    and t.deleted_at is null
    and upper(coalesce(t.status, '')) in ('PUBLISHED','LIVE','OPEN')
    and t.created_at >= date_trunc('month', now())
    and t.created_at <  date_trunc('month', now()) + interval '1 month';

  if v_published_this_month >= 1 then
    raise exception 'free_tender_monthly_limit_reached';
  end if;

  return true;
end;
$$;


ALTER FUNCTION "public"."can_publish_tender"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_tender"("p_tender_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_builder uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select t.builder_id, t.status
    into v_builder, v_status
  from public.tenders t
  where t.id = p_tender_id
    and t.deleted_at is null;

  if v_builder is null then
    raise exception 'tender_not_found';
  end if;

  if v_builder <> v_uid then
    raise exception 'not_owner';
  end if;

  if v_status = 'CLOSED' then
    raise exception 'cannot_cancel_closed';
  end if;

  if v_status = 'CANCELLED' then
    raise exception 'already_cancelled';
  end if;

  update public.tenders
    set status = 'CANCELLED'
  where id = p_tender_id;
end;
$$;


ALTER FUNCTION "public"."cancel_tender"("p_tender_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_exists"("check_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  exists_in_auth boolean;
  exists_in_public boolean;
BEGIN
  -- Check auth.users (requires SECURITY DEFINER)
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = check_email
  ) INTO exists_in_auth;
  
  -- Check public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE email = check_email
  ) INTO exists_in_public;
  
  -- Return true if email exists in either table
  RETURN exists_in_auth OR exists_in_public;
END;
$$;


ALTER FUNCTION "public"."check_email_exists"("check_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_email_exists"("check_email" "text") IS 'Checks if email exists in either auth.users or public.users. Returns true if duplicate found, false otherwise.';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tenders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_deleted integer;
begin
  with deleted as (
    delete from public.tenders
    where
      (tier = 'PREMIUM_14' and created_at < now() - interval '90 days')
      or (tier in ('FREE_TRIAL', 'BASIC_8') and created_at < now() - interval '30 days')
    returning id
  )
  select count(*)::integer into v_deleted from deleted;
  return coalesce(v_deleted, 0);
end;
$$;


ALTER FUNCTION "public"."cleanup_expired_tenders"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_tenders"() IS 'Hard delete tenders past retention: 90d for PREMIUM_14, 30d for FREE_TRIAL/BASIC_8. Called by pg_cron daily.';



CREATE OR REPLACE FUNCTION "public"."close_tender"("p_tender_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_t public.tenders;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    raise exception 'tender_not_found';
  end if;

  if v_t.builder_id <> v_uid then
    raise exception 'not_owner';
  end if;

  if upper(v_t.status) = 'CLOSED' then
    raise exception 'already_closed';
  end if;

  update public.tenders
  set status = 'CLOSED', updated_at = now()
  where id = p_tender_id;
end;
$$;


ALTER FUNCTION "public"."close_tender"("p_tender_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_account_review_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO admin_account_reviews (user_id, status)
  VALUES (NEW.id, 'pending');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_account_review_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_quote_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tender_id uuid;
  v_builder_id uuid;
  v_requester_id uuid;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.tender_id, r.requester_id, r.status
  INTO v_tender_id, v_requester_id, v_status
  FROM public.tender_quote_requests r
  WHERE r.id = p_request_id;

  IF v_tender_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  SELECT builder_id
  INTO v_builder_id
  FROM public.tenders
  WHERE id = v_tender_id AND deleted_at IS NULL;

  IF v_builder_id <> v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  UPDATE public.tender_quote_requests
    SET status = 'DECLINED',
        updated_at = now()
  WHERE id = p_request_id;
END;
$$;


ALTER FUNCTION "public"."decline_quote_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_tender"("p_tender_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_builder uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select t.builder_id into v_builder
  from public.tenders t
  where t.id = p_tender_id;

  if v_builder is null then
    raise exception 'tender_not_found';
  end if;

  if v_builder <> v_uid then
    raise exception 'not_owner';
  end if;

  delete from public.tenders where id = p_tender_id;
end;
$$;


ALTER FUNCTION "public"."delete_tender"("p_tender_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_tender"("p_tender_id" "uuid") IS 'Hard delete a tender and all related records. Owner only. Storage files must be removed by the API first.';



CREATE OR REPLACE FUNCTION "public"."enforce_free_tender_quote_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_plan text;
  v_count int;
  v_lock_key bigint;
begin
  -- Ignore soft-deleted inserts (unlikely, but safe)
  if new.deleted_at is not null then
    return new;
  end if;

  -- Only enforce for FREE tenders
  select t.plan_tier_at_post into v_plan
  from public.tenders t
  where t.id = new.tender_id;

  if coalesce(v_plan, 'FREE') <> 'FREE' then
    return new;
  end if;

  -- Transaction-scoped lock per tender+trade_key (prevents concurrent inserts sneaking past)
  v_lock_key :=
    hashtextextended(new.tender_id::text || ':' || coalesce(new.trade_key, ''), 0);

  perform pg_advisory_xact_lock(v_lock_key);

  -- Count existing active quotes for this tender + trade_key
  select count(*) into v_count
  from public.tender_quotes q
  where q.tender_id = new.tender_id
    and q.trade_key = new.trade_key
    and q.deleted_at is null
    and q.status <> 'WITHDRAWN';

  -- If already at cap, block insert
  if v_count >= 3 then
    raise exception 'free_quote_limit_reached';
  end if;

  return new;
end $$;


ALTER FUNCTION "public"."enforce_free_tender_quote_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_jobs_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "contractor_id" "uuid", "title" "text", "description" "text", "trade_category" "text", "location" "text", "postcode" "text", "dates" "jsonb", "start_time" "text", "duration" integer, "pay_type" "text", "rate" numeric, "attachments" "jsonb", "status" "text", "created_at" timestamp with time zone, "location_lat" double precision, "location_lng" double precision, "distance_km" double precision, "viewer_radius_km" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with v as (
    select
      u.id,
      (
        case
          when (
            coalesce(u.is_premium, false) = true
            or (u.premium_until is not null and u.premium_until > now())
            or coalesce(u.active_plan, '') ilike '%premium%'
          )
          and u.search_lat is not null and u.search_lng is not null
          then u.search_lat::double precision
          else u.location_lat::double precision
        end
      ) as lat,
      (
        case
          when (
            coalesce(u.is_premium, false) = true
            or (u.premium_until is not null and u.premium_until > now())
            or coalesce(u.active_plan, '') ilike '%premium%'
          )
          and u.search_lat is not null and u.search_lng is not null
          then u.search_lng::double precision
          else u.location_lng::double precision
        end
      ) as lng,
      case
        when coalesce(u.is_premium, false) = true then 100
        when u.premium_until is not null and u.premium_until > now() then 100
        when coalesce(u.active_plan, '') ilike '%premium%' then 100
        else 20
      end as radius_km
    from public.users u
    where u.id = viewer_id
  )
  select
    j.id,
    j.contractor_id,
    j.title,
    j.description,
    j.trade_category,
    j.location,
    j.postcode,
    j.dates,
    j.start_time,
    j.duration,
    j.pay_type,
    j.rate,
    j.attachments,
    j.status,
    j.created_at,
    j.location_lat,
    j.location_lng,
    public.km_distance(v.lat, v.lng, j.location_lat, j.location_lng) as distance_km,
    v.radius_km as viewer_radius_km
  from public.jobs j
  join v on true
  where
    j.status = 'open'
    and j.created_at >= (now() - interval '30 days')
    and j.location_lat is not null
    and j.location_lng is not null
    and v.lat is not null
    and v.lng is not null
    and (
      trade_filter is null
      or trim(trade_filter) = ''
      or j.trade_category = any(string_to_array(trim(trade_filter), '|'))
    )
    and public.km_distance(v.lat, v.lng, j.location_lat, j.location_lng) <= v.radius_km
  order by j.created_at desc
  limit limit_count
  offset offset_count;
$$;


ALTER FUNCTION "public"."get_jobs_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenders_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "builder_id" "uuid", "status" "text", "tier" "text", "is_anonymous" boolean, "is_name_hidden" boolean, "project_name" "text", "project_description" "text", "suburb" "text", "postcode" "text", "lat" double precision, "lng" double precision, "desired_start_date" "date", "desired_end_date" "date", "budget_min_cents" bigint, "budget_max_cents" bigint, "created_at" timestamp with time zone, "distance_km" double precision, "viewer_radius_km" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with v as (
    select
      u.id,
      -- Use location_lat/lng when base_lat/lng are null (new users, profile edit)
      coalesce(u.base_lat, u.location_lat)::double precision as lat,
      coalesce(u.base_lng, u.location_lng)::double precision as lng,
      case
        when coalesce(u.is_premium, false) = true then 100
        when u.premium_until is not null and u.premium_until > now() then 100
        when u.active_plan is not null and u.active_plan::text ilike '%premium%' then 100
        else 20
      end as radius_km
    from public.users u
    where u.id = viewer_id
  ),
  tender_trades as (
    select distinct t.id as tender_id
    from public.tenders t
    join public.tender_trade_requirements tr on tr.tender_id = t.id
    where (
      coalesce(trim(trade_filter), '') = ''
      or tr.trade = any(string_to_array(trim(trade_filter), '|'))
    )
  )
  select
    t.id,
    t.builder_id,
    t.status,
    t.tier,
    t.is_anonymous,
    t.is_name_hidden,
    t.project_name,
    t.project_description,
    t.suburb,
    t.postcode,
    t.lat::double precision,
    t.lng::double precision,
    t.desired_start_date,
    t.desired_end_date,
    t.budget_min_cents,
    t.budget_max_cents,
    t.created_at,
    case
      when public.tender_has_valid_coords(t.lat, t.lng)
           and v.lat is not null and v.lng is not null
           and (v.lat <> 0 or v.lng <> 0)
      then public.km_distance(v.lat, v.lng, t.lat::double precision, t.lng::double precision)
      else null
    end as distance_km,
    v.radius_km::int as viewer_radius_km
  from public.tenders t
  join v on true
  join tender_trades tt on tt.tender_id = t.id
  where
    t.deleted_at is null
    and t.status in ('PUBLISHED', 'LIVE')
    and t.builder_id <> viewer_id
    and public.tender_has_valid_coords(t.lat, t.lng)
    and v.lat is not null and v.lng is not null
    and (v.lat <> 0 or v.lng <> 0)
    and public.km_distance(v.lat, v.lng, t.lat::double precision, t.lng::double precision) <= v.radius_km
  order by t.created_at desc
  limit limit_count
  offset offset_count;
$$;


ALTER FUNCTION "public"."get_tenders_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_abn text;
  v_abr boolean;
  v_ver_at timestamptz;
  v_biz text;
  v_entity text;
  v_status public.abn_verification_status;
  v_abn_ver boolean;
  v_ver_at_out timestamptz;
BEGIN
  v_abn := NULLIF(regexp_replace(btrim(COALESCE(NEW.raw_user_meta_data->>'abn', '')), '\D', '', 'g'), '');

  v_abr := (
    COALESCE(NEW.raw_user_meta_data->>'abn_abr_verified', '') IN ('true', 't', '1')
    OR COALESCE(NEW.raw_user_meta_data->>'abnVerified', '') IN ('true', 't', '1')
    OR COALESCE(NEW.raw_user_meta_data->>'abn_verified', '') IN ('true', 't', '1')
  );

  v_ver_at := NULL;
  BEGIN
    IF NEW.raw_user_meta_data->>'abn_verified_at' IS NOT NULL
       AND btrim(NEW.raw_user_meta_data->>'abn_verified_at') <> '' THEN
      v_ver_at := (NEW.raw_user_meta_data->>'abn_verified_at')::timestamptz;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_ver_at := NULL;
  END;

  v_biz := NULLIF(btrim(COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'businessName',
    ''
  )), '');

  v_entity := NULLIF(btrim(COALESCE(
    NEW.raw_user_meta_data->>'abn_entity_name',
    NEW.raw_user_meta_data->>'abnEntityName',
    ''
  )), '');

  IF v_abn IS NOT NULL AND v_abr THEN
    v_status := 'VERIFIED'::public.abn_verification_status;
    v_abn_ver := true;
    v_ver_at_out := COALESCE(v_ver_at, now());
  ELSIF v_abn IS NOT NULL THEN
    v_status := 'UNVERIFIED'::public.abn_verification_status;
    v_abn_ver := false;
    v_ver_at_out := NULL;
  ELSE
    v_status := 'UNVERIFIED'::public.abn_verification_status;
    v_abn_ver := false;
    v_ver_at_out := NULL;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    primary_trade,
    business_name,
    abn,
    abn_status,
    abn_verified,
    abn_verified_at,
    location,
    postcode,
    trust_status,
    rating,
    completed_jobs,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'contractor'),
    NEW.raw_user_meta_data->>'primary_trade',
    CASE
      WHEN v_abn IS NOT NULL AND v_abr AND v_entity IS NOT NULL THEN v_entity
      WHEN v_abn IS NOT NULL AND v_abr AND v_biz IS NOT NULL THEN v_biz
      WHEN v_biz IS NOT NULL THEN v_biz
      ELSE NULL
    END,
    v_abn,
    v_status,
    v_abn_ver,
    v_ver_at_out,
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'postcode',
    'pending',
    0,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    role = COALESCE(EXCLUDED.role, users.role),
    primary_trade = COALESCE(EXCLUDED.primary_trade, users.primary_trade),
    business_name = COALESCE(EXCLUDED.business_name, users.business_name),
    abn = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn
      ELSE users.abn
    END,
    abn_status = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn_status
      ELSE users.abn_status
    END,
    abn_verified = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn_verified
      ELSE users.abn_verified
    END,
    abn_verified_at = CASE
      WHEN EXCLUDED.abn IS NOT NULL THEN EXCLUDED.abn_verified_at
      ELSE users.abn_verified_at
    END,
    location = COALESCE(EXCLUDED.location, users.location),
    postcode = COALESCE(EXCLUDED.postcode, users.postcode),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."haversine_km"("lat1" double precision, "lon1" double precision, "lat2" double precision, "lon2" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select 6371.0 * 2 * asin(
    sqrt(
      pow(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      pow(sin(radians((lon2 - lon1) / 2)), 2)
    )
  );
$$;


ALTER FUNCTION "public"."haversine_km"("lat1" double precision, "lon1" double precision, "lat2" double precision, "lon2" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and coalesce(u.is_admin, false) = true
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and coalesce(u.is_admin, false) = true
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_premium_discovery"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$select coalesce(
  (
    select
      (
        (
          coalesce(u.plan, 'free') = 'premium'
          and coalesce(u.subscription_status, 'NONE') = 'ACTIVE'
        )
        or
        (
          u.complimentary_premium_until is not null
          and u.complimentary_premium_until > now()
        )
      )
    from public.users u
    where u.id = uid
    limit 1
  ),
  false
);$$;


ALTER FUNCTION "public"."is_premium_discovery"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_premium_user"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce((SELECT is_premium FROM public.users WHERE id = uid AND deleted_at IS NULL), false);
$$;


ALTER FUNCTION "public"."is_premium_user"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_tender_owner"("p_tender_id" "uuid", "p_uid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1
    from public.tenders t
    where t.id = p_tender_id
      and t.builder_id = p_uid
      and t.deleted_at is null
  );
$$;


ALTER FUNCTION "public"."is_tender_owner"("p_tender_id" "uuid", "p_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."km_distance"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select 6371.0 * 2.0 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1) / 2.0)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lng2 - lng1) / 2.0)), 2)
    )
  );
$$;


ALTER FUNCTION "public"."km_distance"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_admins_new_account_review"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  admin_record RECORD;
  new_user_name text;
  new_user_email text;
  new_user_role text;
BEGIN
  -- Get the new user's details
  SELECT name, email, role INTO new_user_name, new_user_email, new_user_role
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create a notification for each admin
  FOR admin_record IN 
    SELECT id FROM users WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      link,
      read,
      created_at
    ) VALUES (
      admin_record.id,
      'application',
      'New Account Review Required',
      new_user_name || ' (' || new_user_email || ') created a ' || new_user_role || ' account. Review for potential scams or misconduct.',
      '/admin/account-reviews',
      false,
      now()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_admins_new_account_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_hard_delete_tender_quotes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed. Use soft delete (set deleted_at).';
END;
$$;


ALTER FUNCTION "public"."prevent_hard_delete_tender_quotes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_hard_delete_tenders"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed. Use soft delete (set deleted_at).';
END;
$$;


ALTER FUNCTION "public"."prevent_hard_delete_tenders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_tender"("p_tender_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_t public.tenders;
  v_user public.users;
  v_trade_count int;
  v_active_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    raise exception 'tender_not_found';
  end if;

  if v_t.builder_id <> v_uid then
    raise exception 'not_owner';
  end if;

  if v_t.status <> 'DRAFT' then
    raise exception 'not_ready';
  end if;

  select count(*) into v_trade_count from public.tender_trade_requirements where tender_id = p_tender_id;
  if v_trade_count is null or v_trade_count = 0 then
    raise exception 'trades_required';
  end if;

  if coalesce(trim(v_t.project_name), '') = '' or coalesce(trim(v_t.suburb), '') = '' or coalesce(trim(v_t.postcode), '') = '' then
    raise exception 'not_ready';
  end if;

  select * into v_user from public.users where id = v_uid and deleted_at is null;
  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  -- Free plan: 1 active tender per 30 days (premium = is_premium or active paid plan)
  if coalesce(v_user.is_premium, false) = false
     and not (
       coalesce(v_user.subscription_status, '') = 'ACTIVE'
       and (coalesce(v_user.active_plan, '') not in ('', 'NONE')
            or coalesce(v_user.subcontractor_plan::text, '') = 'PRO_10')
     ) then
    select count(*) into v_active_count
    from public.tenders
    where builder_id = v_uid
      and status in ('LIVE', 'PUBLISHED', 'PENDING_APPROVAL')
      and created_at >= now() - interval '30 days';
    if v_active_count >= 1 then
      raise exception 'free_tender_monthly_limit_reached';
    end if;
  end if;

  update public.tenders
  set status = 'LIVE', updated_at = now()
  where id = p_tender_id;
end;
$$;


ALTER FUNCTION "public"."publish_tender"("p_tender_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_expired_job_listings"() RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with deleted as (
    delete from public.jobs
    where created_at < (now() - interval '30 days')
    returning 1
  )
  select count(*)::bigint from deleted;
$$;


ALTER FUNCTION "public"."purge_expired_job_listings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_welcome_email_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.email_events (
    user_id,
    to_email,
    email_type,
    status,
    payload
  )
  values (
    new.id,
    new.email,
    'welcome',
    'pending',
    jsonb_build_object(
      'firstName', split_part(coalesce(new.name, ''), ' ', 1),
      'source', 'users_insert_trigger'
    )
  )
  on conflict do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."queue_welcome_email_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_profile_strength"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  jc int;
  wu int;
  calc jsonb;
  comp_score int;
BEGIN
  SELECT COUNT(*)::int INTO jc
  FROM public.jobs j
  WHERE j.contractor_id = p_user_id AND j.deleted_at IS NULL;

  SELECT COUNT(*)::int INTO wu
  FROM public.previous_work pw
  WHERE pw.user_id = p_user_id;

  calc := public.calculate_profile_strength(p_user_id);
  IF calc ? 'error' THEN
    RETURN;
  END IF;

  comp_score := COALESCE((calc->>'completeness_points')::int, 0);

  UPDATE public.users u
  SET
    jobs_posted_count = jc,
    works_uploaded_count = wu,
    works_completed_count = COALESCE(u.completed_jobs, 0),
    profile_completion_score = comp_score,
    profile_strength_score = (calc->>'total')::int,
    profile_strength_band = calc->>'band',
    last_strength_calculated_at = now()
  WHERE u.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."refresh_profile_strength"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_profile_strength"("p_user_id" "uuid") IS 'Persist denormalized counts and profile strength scores for a user.';



CREATE OR REPLACE FUNCTION "public"."reopen_tender"("p_tender_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_t public.tenders;
  v_user public.users;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_t from public.tenders where id = p_tender_id and deleted_at is null;
  if v_t.id is null then
    raise exception 'tender_not_found';
  end if;

  if v_t.builder_id <> v_uid then
    raise exception 'not_owner';
  end if;

  if upper(v_t.status) <> 'CLOSED' then
    raise exception 'tender_not_closed';
  end if;

  select * into v_user from public.users where id = v_uid and deleted_at is null;
  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  -- Admin can always reopen
  if v_user.role = 'admin' then
    update public.tenders set status = 'LIVE', updated_at = now() where id = p_tender_id;
    return;
  end if;

  -- Premium = is_premium or active paid plan
  if coalesce(v_user.is_premium, false) = false
     and not (
       coalesce(v_user.subscription_status, '') = 'ACTIVE'
       and (coalesce(v_user.active_plan, '') not in ('', 'NONE')
            or coalesce(v_user.subcontractor_plan::text, '') = 'PRO_10')
     ) then
    raise exception 'free_cannot_reopen_closed_tender';
  end if;

  update public.tenders
  set status = 'LIVE', updated_at = now()
  where id = p_tender_id;
end;
$$;


ALTER FUNCTION "public"."reopen_tender"("p_tender_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_to_quote"("p_tender_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_builder uuid;
  v_request_id uuid;
  v_requester_name text;
  v_tender_title text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT t.builder_id, t.project_name
  INTO v_builder, v_tender_title
  FROM public.tenders t
  WHERE t.id = p_tender_id AND t.deleted_at IS NULL;

  IF v_builder IS NULL THEN
    RAISE EXCEPTION 'tender_not_found';
  END IF;

  SELECT COALESCE(u.business_name, u.name, 'A trade business')
  INTO v_requester_name
  FROM public.users u
  WHERE u.id = v_uid AND u.deleted_at IS NULL;

  IF v_requester_name IS NULL OR trim(v_requester_name) = '' THEN
    v_requester_name := 'A trade business';
  END IF;

  INSERT INTO public.tender_quote_requests (tender_id, requester_id, status)
  VALUES (p_tender_id, v_uid, 'PENDING')
  ON CONFLICT (tender_id, requester_id) DO UPDATE
    SET status = 'PENDING',
        updated_at = now()
  RETURNING id INTO v_request_id;

  IF v_request_id IS NULL THEN
    SELECT id INTO v_request_id FROM public.tender_quote_requests
    WHERE tender_id = p_tender_id AND requester_id = v_uid;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, description, data, link)
  VALUES (
    v_builder,
    'QUOTE_REQUEST',
    v_requester_name || ' requested to quote on your tender: ' || COALESCE(v_tender_title, 'Untitled'),
    v_requester_name || ' requested to quote on your tender: ' || COALESCE(v_tender_title, 'Untitled'),
    jsonb_build_object(
      'tender_id', p_tender_id,
      'requester_id', v_uid,
      'request_id', v_request_id,
      'requester_name', v_requester_name,
      'tender_title', v_tender_title
    ),
    '/tenders/' || p_tender_id
  );
END;
$$;


ALTER FUNCTION "public"."request_to_quote"("p_tender_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_context_window_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.context_window_expires_at := NEW.created_at + INTERVAL '72 hours';
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_context_window_expiry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET profile_likes_count = GREATEST(0, profile_likes_count + 1)
    WHERE id = NEW.liked_user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET profile_likes_count = GREATEST(0, profile_likes_count - 1)
    WHERE id = OLD.liked_user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_profile_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tender_has_valid_coords"("p_lat" double precision, "p_lng" double precision) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select
    p_lat is not null
    and p_lng is not null
    and (p_lat <> 0 or p_lng <> 0)
    and p_lat >= -90 and p_lat <= 90
    and p_lng >= -180 and p_lng <= 180
    and abs(p_lat) < 1e10
    and abs(p_lng) < 1e10;
$$;


ALTER FUNCTION "public"."tender_has_valid_coords"("p_lat" double precision, "p_lng" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tenders_block_reopen_for_free"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user public.users;
begin
  -- Only care when status changes from CLOSED to something that reopens
  if upper(OLD.status) <> 'CLOSED' then
    return NEW;
  end if;
  if upper(NEW.status) not in ('LIVE', 'DRAFT', 'PUBLISHED') then
    return NEW;
  end if;

  select * into v_user from public.users where id = auth.uid() and deleted_at is null;
  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  if v_user.role = 'admin' then
    return NEW;
  end if;

  if coalesce(v_user.is_premium, false) = true then
    return NEW;
  end if;
  if coalesce(v_user.subscription_status, '') = 'ACTIVE'
     and (coalesce(v_user.active_plan, '') not in ('', 'NONE')
          or coalesce(v_user.subcontractor_plan::text, '') = 'PRO_10') then
    return NEW;
  end if;

  raise exception 'free_cannot_reopen_closed_tender';
end;
$$;


ALTER FUNCTION "public"."tenders_block_reopen_for_free"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_last_active_if_stale"("p_user_id" "uuid", "p_now" timestamp with time zone DEFAULT "now"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  rows_affected int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  UPDATE public.users u
  SET last_active_at = p_now
  WHERE u.id = p_user_id
    AND (
      u.last_active_at IS NULL
      OR u.last_active_at < (p_now - interval '6 hours')
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;


ALTER FUNCTION "public"."touch_last_active_if_stale"("p_user_id" "uuid", "p_now" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."touch_last_active_if_stale"("p_user_id" "uuid", "p_now" timestamp with time zone) IS 'Updates users.last_active_at only when null or older than 6 hours. Authenticated callers may only touch their own row.';



CREATE OR REPLACE FUNCTION "public"."trg_users_abn_invariants"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.abn IS NULL OR btrim(COALESCE(NEW.abn, '')) = '' THEN
    NEW.abn := NULL;
    NEW.abn_verified := false;
    NEW.abn_verified_at := NULL;
    NEW.abn_status := 'UNVERIFIED'::public.abn_verification_status;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_users_abn_invariants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_updated_at_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_updated_at_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_previous_work_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_previous_work_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subcontractor_availability_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subcontractor_availability_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_account_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "flag_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'flagged'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."admin_account_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_account_reviews" IS 'Admin review records for new account monitoring';



COMMENT ON COLUMN "public"."admin_account_reviews"."status" IS 'Review status: pending, reviewed, flagged, suspended';



CREATE TABLE IF NOT EXISTS "public"."admin_review_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subcontractor_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "reliability_event_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "resolution_notes" "text",
    "suspension_days" integer,
    "suspension_ends_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_review_cases_reason_check" CHECK (("reason" = ANY (ARRAY['RELIABILITY'::"text", 'TRUST_VIOLATION'::"text", 'FRAUD'::"text", 'OTHER'::"text"]))),
    CONSTRAINT "admin_review_cases_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'IN_REVIEW'::"text", 'CLEARED'::"text", 'WARNING_ISSUED'::"text", 'SUSPENDED'::"text", 'PERMANENTLY_BANNED'::"text"])))
);


ALTER TABLE "public"."admin_review_cases" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_review_cases" IS 'Manual admin review cases for flagged subcontractors';



CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "subcontractor_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'applied'::"text" NOT NULL,
    "message" "text",
    "selected_dates" "jsonb" DEFAULT '[]'::"jsonb",
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    "withdrawn_at" timestamp with time zone,
    "withdrawn_reason" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['applied'::"text", 'selected'::"text", 'accepted'::"text", 'declined'::"text", 'confirmed'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_user_id" "uuid",
    "target_job_id" "uuid",
    "target_review_id" "uuid",
    "details" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "contractor_id" "uuid" NOT NULL,
    "subcontractor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "to_email" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_events_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "email_events_type_check" CHECK (("email_type" = ANY (ARRAY['account_verification'::"text", 'welcome'::"text", 'password_reset'::"text", 'premium_upgraded'::"text", 'payment_receipt'::"text", 'payment_failed'::"text", 'job_invite'::"text", 'job_alert'::"text", 'tender_alert'::"text", 'quote_request'::"text", 'hire_confirmed'::"text", 'new_message'::"text", 'abn_verified'::"text", 'reliability_review'::"text", 'weekly_opportunity_digest'::"text"])))
);


ALTER TABLE "public"."email_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_post_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_post_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_post_events" IS 'Immutable log of job posting events used for free-tier rolling 30-day enforcement. Deleting jobs must not free quota slots.';



CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "trade_category" "text" NOT NULL,
    "location" "text" NOT NULL,
    "postcode" "text" NOT NULL,
    "dates" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "start_time" "text",
    "duration" integer,
    "pay_type" "text" NOT NULL,
    "rate" numeric,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "selected_subcontractor" "uuid",
    "confirmed_subcontractor" "uuid",
    "start_date" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancellation_reason" "text",
    "was_accepted_or_confirmed_before_cancellation" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "starts_at" timestamp with time zone,
    "fulfilled" boolean,
    "fulfillment_marked_by" "uuid",
    "fulfillment_marked_at" timestamp with time zone,
    "reminder_48h_sent" boolean DEFAULT false,
    "approval_status" "text" DEFAULT 'approved'::"text",
    "approval_notes" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "location_lat" double precision,
    "location_lng" double precision,
    "location_place_id" "text",
    "file_url" "text",
    "file_name" "text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "jobs_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_approval'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "jobs_pay_type_check" CHECK (("pay_type" = ANY (ARRAY['fixed'::"text", 'hourly'::"text", 'quote_required'::"text", 'day_rate'::"text"]))),
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'pending_approval'::"text", 'accepted'::"text", 'confirmed'::"text", 'completed'::"text", 'cancelled'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."jobs"."starts_at" IS 'Job start time for 48h reminder scheduling';



COMMENT ON COLUMN "public"."jobs"."fulfilled" IS 'Whether subcontractor completed the job (true=yes, false=no, null=not marked)';



COMMENT ON COLUMN "public"."jobs"."reminder_48h_sent" IS 'Whether 48h reminder notification has been sent';



CREATE TABLE IF NOT EXISTS "public"."listing_alert_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_type" "text" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "recipient_user_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "trade_label" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "listing_alert_sends_listing_type_check" CHECK (("listing_type" = ANY (ARRAY['job'::"text", 'tender'::"text"]))),
    CONSTRAINT "listing_alert_sends_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."listing_alert_sends" OWNER TO "postgres";


COMMENT ON TABLE "public"."listing_alert_sends" IS 'Log of email alerts sent for new jobs/tenders; used for duplicate prevention and debugging';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "is_system_message" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "job_id" "uuid",
    "conversation_id" "uuid",
    "link" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."previous_work" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "caption" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL
);


ALTER TABLE "public"."previous_work" OWNER TO "postgres";


COMMENT ON TABLE "public"."previous_work" IS 'Portfolio items for subcontractor profiles; trade comes from user profile.';



COMMENT ON COLUMN "public"."previous_work"."title" IS 'Short headline for portfolio item; caption holds full description.';



CREATE TABLE IF NOT EXISTS "public"."previous_work_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "previous_work_id" "uuid" NOT NULL,
    "image_path" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."previous_work_images" OWNER TO "postgres";


COMMENT ON TABLE "public"."previous_work_images" IS 'Image paths in previous-work storage bucket; signed URLs generated in app.';



CREATE TABLE IF NOT EXISTS "public"."profile_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "liked_user_id" "uuid" NOT NULL,
    "liked_by_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_likes_no_self_like" CHECK (("liked_user_id" <> "liked_by_user_id"))
);


ALTER TABLE "public"."profile_likes" OWNER TO "postgres";


COMMENT ON TABLE "public"."profile_likes" IS 'One profile “like” per viewer; capped contribution to profile strength score.';



CREATE TABLE IF NOT EXISTS "public"."profile_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "viewed_user_id" "uuid" NOT NULL,
    "viewer_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profile_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" DEFAULT 'subcontractor'::"text" NOT NULL,
    "trust_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "avatar" "text",
    "bio" "text",
    "rating" numeric DEFAULT 0,
    "reliability_rating" numeric,
    "completed_jobs" integer DEFAULT 0,
    "member_since" timestamp with time zone DEFAULT "now"(),
    "business_name" "text",
    "abn" "text",
    "location" "text",
    "radius" integer,
    "availability" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_trade" "text",
    "builder_plan" "text" DEFAULT 'NONE'::"text",
    "builder_sub_status" "text" DEFAULT 'NONE'::"text",
    "builder_sub_renews_at" timestamp with time zone,
    "contractor_plan" "text" DEFAULT 'NONE'::"text",
    "contractor_sub_status" "text" DEFAULT 'NONE'::"text",
    "contractor_sub_renews_at" timestamp with time zone,
    "alerts_enabled" boolean DEFAULT false,
    "alert_channel_email" boolean DEFAULT true,
    "alert_channel_sms" boolean DEFAULT false,
    "preferred_radius_km" integer DEFAULT 15,
    "base_lat" numeric,
    "base_lng" numeric,
    "base_suburb" "text",
    "base_postcode" "text",
    "subcontractor_plan" "public"."subcontractor_plan_type" DEFAULT 'NONE'::"public"."subcontractor_plan_type",
    "subcontractor_sub_status" "public"."subcontractor_subscription_status" DEFAULT 'NONE'::"public"."subcontractor_subscription_status",
    "subcontractor_sub_renews_at" timestamp with time zone,
    "subcontractor_preferred_radius_km" integer DEFAULT 15,
    "subcontractor_alerts_enabled" boolean DEFAULT false,
    "subcontractor_alert_channel_in_app" boolean DEFAULT true,
    "subcontractor_alert_channel_email" boolean DEFAULT false,
    "subcontractor_alert_channel_sms" boolean DEFAULT false,
    "subcontractor_availability_horizon_days" integer DEFAULT 14,
    "subcontractor_work_alerts_enabled" boolean DEFAULT true,
    "subcontractor_work_alert_in_app" boolean DEFAULT true,
    "subcontractor_work_alert_email" boolean DEFAULT true,
    "subcontractor_work_alert_sms" boolean DEFAULT false,
    "subcontractor_availability_broadcast_enabled" boolean DEFAULT false,
    "sms_opt_in_prompt_shown" boolean DEFAULT false,
    "sms_opt_in_prompt_dismissed_at" timestamp with time zone,
    "account_flagged_for_review" boolean DEFAULT false,
    "account_suspended" boolean DEFAULT false,
    "suspension_ends_at" timestamp with time zone,
    "active_plan" "text" DEFAULT 'NONE'::"text",
    "subscription_status" "text" DEFAULT 'NONE'::"text",
    "subscription_renews_at" timestamp with time zone,
    "subscription_started_at" timestamp with time zone,
    "subscription_canceled_at" timestamp with time zone,
    "additional_trades" "text"[] DEFAULT '{}'::"text"[],
    "additional_trades_unlocked" boolean DEFAULT false,
    "additional_trades_payment_date" timestamp with time zone,
    "complimentary_premium_until" timestamp with time zone,
    "complimentary_reason" "text",
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "availability_description" "text",
    "postcode" "text",
    "location_lat" numeric,
    "location_lng" numeric,
    "search_location" "text",
    "search_postcode" "text",
    "search_lat" numeric,
    "search_lng" numeric,
    "account_reviewed" boolean DEFAULT false,
    "abn_status" "public"."abn_verification_status" DEFAULT 'UNVERIFIED'::"public"."abn_verification_status",
    "abn_verified_at" timestamp with time zone,
    "abn_verified_by" "uuid",
    "abn_rejection_reason" "text",
    "abn_submitted_at" timestamp with time zone,
    "abn_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "premium_until" timestamp with time zone,
    "is_premium" boolean DEFAULT false,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "is_public_profile" boolean DEFAULT true NOT NULL,
    "cover_url" "text",
    "website" "text",
    "instagram" "text",
    "facebook" "text",
    "linkedin" "text",
    "tiktok" "text",
    "youtube" "text",
    "show_abn_on_profile" boolean DEFAULT false NOT NULL,
    "show_business_name_on_profile" boolean DEFAULT true NOT NULL,
    "lat" double precision,
    "lng" double precision,
    "abn_verified" boolean DEFAULT false NOT NULL,
    "phone" "text",
    "show_phone_on_profile" boolean DEFAULT false NOT NULL,
    "show_email_on_profile" boolean DEFAULT false NOT NULL,
    "mini_bio" "text",
    "deleted_at" timestamp with time zone,
    "entity_type" "text",
    "abn_last_checked_at" timestamp with time zone,
    "additional_locations" "jsonb" DEFAULT '[]'::"jsonb",
    "pricing_type" "text",
    "pricing_amount" numeric,
    "show_pricing_on_profile" boolean DEFAULT false NOT NULL,
    "show_pricing_in_listings" boolean DEFAULT false NOT NULL,
    "receive_trade_alerts" boolean DEFAULT false,
    "plan" "text" DEFAULT 'free'::"text",
    "profile_strength_score" integer DEFAULT 0 NOT NULL,
    "profile_strength_band" "text" DEFAULT 'LOW'::"text" NOT NULL,
    "profile_likes_count" integer DEFAULT 0 NOT NULL,
    "website_url" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "linkedin_url" "text",
    "google_business_url" "text",
    "google_rating" numeric(2,1),
    "google_review_count" integer,
    "google_rating_verified" boolean DEFAULT false NOT NULL,
    "works_completed_count" integer DEFAULT 0 NOT NULL,
    "jobs_posted_count" integer DEFAULT 0 NOT NULL,
    "works_uploaded_count" integer DEFAULT 0 NOT NULL,
    "profile_completion_score" integer DEFAULT 0 NOT NULL,
    "last_strength_calculated_at" timestamp with time zone,
    "last_active_at" timestamp with time zone DEFAULT "now"(),
    "google_business_name" "text",
    "google_business_address" "text",
    "google_place_id" "text",
    "google_business_rating" numeric,
    "google_business_review_count" integer,
    "google_listing_claimed_by_user" boolean DEFAULT false NOT NULL,
    "google_listing_verification_status" "text" DEFAULT 'UNVERIFIED'::"text" NOT NULL,
    "google_listing_verified_at" timestamp with time zone,
    "google_listing_verification_method" "text",
    "google_listing_verified_by" "uuid",
    "google_listing_rejection_reason" "text",
    CONSTRAINT "users_active_plan_check" CHECK (("active_plan" = ANY (ARRAY['NONE'::"text", 'BUSINESS_PRO_20'::"text", 'SUBCONTRACTOR_PRO_10'::"text", 'ALL_ACCESS_PRO_26'::"text"]))),
    CONSTRAINT "users_google_business_rating_range_check" CHECK ((("google_business_rating" IS NULL) OR (("google_business_rating" >= (0)::numeric) AND ("google_business_rating" <= (5)::numeric)))),
    CONSTRAINT "users_google_business_review_count_nonnegative_check" CHECK ((("google_business_review_count" IS NULL) OR ("google_business_review_count" >= 0))),
    CONSTRAINT "users_google_listing_verification_status_check" CHECK (("google_listing_verification_status" = ANY (ARRAY['UNVERIFIED'::"text", 'SELF_CONFIRMED'::"text", 'PENDING_REVIEW'::"text", 'VERIFIED'::"text", 'REJECTED'::"text"]))),
    CONSTRAINT "users_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'premium'::"text"]))),
    CONSTRAINT "users_pricing_type_check" CHECK (("pricing_type" = ANY (ARRAY['hourly'::"text", 'day'::"text", 'from_hourly'::"text", 'quote_on_request'::"text"]))),
    CONSTRAINT "users_profile_strength_band_check" CHECK (("profile_strength_band" = ANY (ARRAY['LOW'::"text", 'MEDIUM'::"text", 'HIGH'::"text", 'ELITE'::"text"]))),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['contractor'::"text", 'subcontractor'::"text", 'admin'::"text"]))),
    CONSTRAINT "users_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['NONE'::"text", 'ACTIVE'::"text", 'PAST_DUE'::"text", 'CANCELED'::"text"]))),
    CONSTRAINT "users_trust_status_check" CHECK (("trust_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'verified'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."business_name" IS 'Business name provided during signup';



COMMENT ON COLUMN "public"."users"."subcontractor_plan" IS 'Subcontractor subscription plan: NONE (Free), PRO_10 ($10/month)';



COMMENT ON COLUMN "public"."users"."subcontractor_sub_status" IS 'Subscription status: NONE, ACTIVE, PAST_DUE, CANCELED';



COMMENT ON COLUMN "public"."users"."subcontractor_preferred_radius_km" IS 'Desired search radius. Free: capped at 15km, Pro: up to 999km';



COMMENT ON COLUMN "public"."users"."subcontractor_alerts_enabled" IS 'Master toggle for all alert channels';



COMMENT ON COLUMN "public"."users"."subcontractor_alert_channel_in_app" IS 'In-app notifications (available to all tiers)';



COMMENT ON COLUMN "public"."users"."subcontractor_alert_channel_email" IS 'Email alerts (Pro only)';



COMMENT ON COLUMN "public"."users"."subcontractor_alert_channel_sms" IS 'SMS alerts (Pro only)';



COMMENT ON COLUMN "public"."users"."subcontractor_availability_horizon_days" IS 'How far ahead availability can be set. Free: 14 days, Pro: 60 days';



COMMENT ON COLUMN "public"."users"."subcontractor_work_alerts_enabled" IS 'Master toggle for work alerts (Free + Pro). At least one channel must stay enabled.';



COMMENT ON COLUMN "public"."users"."subcontractor_work_alert_in_app" IS 'In-app notifications for new work postings (Free + Pro)';



COMMENT ON COLUMN "public"."users"."subcontractor_work_alert_email" IS 'Email alerts for new work postings (Free + Pro)';



COMMENT ON COLUMN "public"."users"."subcontractor_work_alert_sms" IS 'SMS alerts for new work postings (Free + Pro)';



COMMENT ON COLUMN "public"."users"."subcontractor_availability_broadcast_enabled" IS 'Availability broadcast to contractors (Pro only)';



COMMENT ON COLUMN "public"."users"."sms_opt_in_prompt_shown" IS 'Whether SMS opt-in banner has been displayed to user';



COMMENT ON COLUMN "public"."users"."sms_opt_in_prompt_dismissed_at" IS 'When user dismissed SMS opt-in prompt (prevents re-showing)';



COMMENT ON COLUMN "public"."users"."account_flagged_for_review" IS 'Account flagged for admin review due to reliability issues';



COMMENT ON COLUMN "public"."users"."active_plan" IS 'Current subscription plan: NONE, BUSINESS_PRO_20, SUBCONTRACTOR_PRO_10, or ALL_ACCESS_PRO_26';



COMMENT ON COLUMN "public"."users"."subscription_status" IS 'Current subscription status: NONE, ACTIVE, PAST_DUE, or CANCELED';



COMMENT ON COLUMN "public"."users"."postcode" IS 'Postcode of the user business location';



COMMENT ON COLUMN "public"."users"."location_lat" IS 'Latitude of business location';



COMMENT ON COLUMN "public"."users"."location_lng" IS 'Longitude of business location';



COMMENT ON COLUMN "public"."users"."search_location" IS 'Premium feature: Custom search location (overrides business location)';



COMMENT ON COLUMN "public"."users"."search_postcode" IS 'Premium feature: Postcode for custom search location';



COMMENT ON COLUMN "public"."users"."search_lat" IS 'Premium feature: Latitude for custom search location';



COMMENT ON COLUMN "public"."users"."search_lng" IS 'Premium feature: Longitude for custom search location';



COMMENT ON COLUMN "public"."users"."account_reviewed" IS 'Whether admin has reviewed this account for scams/misconduct';



COMMENT ON COLUMN "public"."users"."is_public_profile" IS 'When true, profile appears in Trades near you discovery. Default false for privacy.';



COMMENT ON COLUMN "public"."users"."additional_locations" IS 'Premium: additional service locations. Array of { location, postcode, lat?, lng? }';



COMMENT ON COLUMN "public"."users"."pricing_type" IS 'Type of rate: hourly, day, from_hourly, or quote_on_request';



COMMENT ON COLUMN "public"."users"."pricing_amount" IS 'Rate amount in AUD. Null for quote_on_request or when not set.';



COMMENT ON COLUMN "public"."users"."show_pricing_on_profile" IS 'When true, pricing is shown on public profile page.';



COMMENT ON COLUMN "public"."users"."show_pricing_in_listings" IS 'When true, pricing is shown in discovery/listing cards.';



COMMENT ON COLUMN "public"."users"."receive_trade_alerts" IS 'Premium: receive alerts when new jobs/tenders matching user trade are listed';



CREATE OR REPLACE VIEW "public"."public_profile_directory" AS
 SELECT "id",
    "name",
    "business_name",
    "avatar",
    "bio",
    "mini_bio",
    "cover_url",
    "location",
    "postcode",
    "member_since",
    "completed_jobs",
    "rating",
    "reliability_rating",
    "role",
    "abn",
    "abn_status",
    "abn_verified_at",
    "is_public_profile",
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "youtube",
    "website",
    "complimentary_premium_until",
    "premium_until",
    "premium_until" AS "premium_expires_at",
    "subscription_status",
    "active_plan",
    "is_premium",
    "subcontractor_sub_status",
    "pricing_type",
    "pricing_amount",
    "show_pricing_on_profile",
    ((("complimentary_premium_until" IS NOT NULL) AND ("complimentary_premium_until" > "now"())) OR (("premium_until" IS NOT NULL) AND ("premium_until" > "now"())) OR (("lower"(COALESCE("subscription_status", ''::"text")) = ANY (ARRAY['active'::"text", 'trialing'::"text"])) AND ("lower"(COALESCE("active_plan", 'none'::"text")) <> 'none'::"text")) OR (COALESCE("is_premium", false) = true)) AS "premium_now"
   FROM "public"."users" "u"
  WHERE (("deleted_at" IS NULL) AND (COALESCE("is_public_profile", false) = true));


ALTER VIEW "public"."public_profile_directory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_ratings" (
    "id" bigint NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "rater_user_id" "uuid" NOT NULL,
    "value" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_ratings_value_check" CHECK (("value" = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE "public"."user_ratings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_rating_aggregates" AS
 SELECT "target_user_id",
    "sum"(
        CASE
            WHEN ("value" = 1) THEN 1
            ELSE 0
        END) AS "up_count",
    "sum"(
        CASE
            WHEN ("value" = '-1'::integer) THEN 1
            ELSE 0
        END) AS "down_count",
    "count"(*) AS "rating_count",
        CASE
            WHEN ("count"(*) = 0) THEN 0.0
            ELSE "round"(((1)::numeric + ((("sum"(
            CASE
                WHEN ("value" = 1) THEN 1
                ELSE 0
            END))::numeric / ("count"(*))::numeric) * (4)::numeric)), 1)
        END AS "rating_avg"
   FROM "public"."user_ratings"
  GROUP BY "target_user_id";


ALTER VIEW "public"."user_rating_aggregates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_profile_directory_with_ratings" AS
 SELECT "d"."id",
    "d"."name",
    "d"."business_name",
    "d"."avatar",
    "d"."bio",
    "d"."mini_bio",
    "d"."cover_url",
    "d"."location",
    "d"."postcode",
    "d"."member_since",
    "d"."completed_jobs",
    "d"."rating",
    "d"."reliability_rating",
    "d"."role",
    "d"."abn",
    "d"."abn_status",
    "d"."abn_verified_at",
    "d"."is_public_profile",
    "d"."instagram",
    "d"."facebook",
    "d"."linkedin",
    "d"."tiktok",
    "d"."youtube",
    "d"."website",
    "d"."complimentary_premium_until",
    "d"."premium_until",
    "d"."premium_expires_at",
    "d"."subscription_status",
    "d"."active_plan",
    "d"."is_premium",
    "d"."subcontractor_sub_status",
    "d"."pricing_type",
    "d"."pricing_amount",
    "d"."show_pricing_on_profile",
    "d"."premium_now",
    "ura"."up_count",
    "ura"."down_count",
    "ura"."rating_count",
    "ura"."rating_avg"
   FROM ("public"."public_profile_directory" "d"
     LEFT JOIN "public"."user_rating_aggregates" "ura" ON (("ura"."target_user_id" = "d"."id")));


ALTER VIEW "public"."public_profile_directory_with_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reliability_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subcontractor_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contractor_notes" "text",
    "admin_reviewed" boolean DEFAULT false,
    "admin_reviewed_by" "uuid",
    "admin_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "subcontractor_context" "text",
    "subcontractor_context_submitted_at" timestamp with time zone,
    "context_window_expires_at" timestamp with time zone,
    CONSTRAINT "reliability_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['NO_SHOW'::"text", 'DID_NOT_COMPLETE'::"text", 'LATE_CANCELLATION'::"text"])))
);


ALTER TABLE "public"."reliability_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."reliability_events" IS 'Tracks subcontractor non-fulfillments for reliability scoring';



COMMENT ON COLUMN "public"."reliability_events"."subcontractor_context" IS 'Optional context provided by subcontractor within 72 hours (admin-only visibility)';



COMMENT ON COLUMN "public"."reliability_events"."context_window_expires_at" IS 'Deadline for context submission (72 hours from event creation)';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "text" "text" NOT NULL,
    "is_reliability_review" boolean DEFAULT false,
    "reliability_score" integer,
    "communication_score" integer,
    "moderation_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reply" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_communication_score_check" CHECK ((("communication_score" >= 1) AND ("communication_score" <= 5))),
    CONSTRAINT "reviews_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_reliability_score_check" CHECK ((("reliability_score" >= 1) AND ("reliability_score" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractor_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subcontractor_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_plan" "text",
    "to_plan" "text",
    "amount_cents" integer,
    "currency" "text" DEFAULT 'AUD'::"text",
    "payment_provider" "text",
    "payment_provider_ref" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscription_history_event_type_check" CHECK (("event_type" = ANY (ARRAY['SUBSCRIBED'::"text", 'UPGRADED'::"text", 'DOWNGRADED'::"text", 'RENEWED'::"text", 'CANCELED'::"text", 'PAYMENT_SUCCEEDED'::"text", 'PAYMENT_FAILED'::"text"])))
);


ALTER TABLE "public"."subscription_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_history" IS 'Complete audit trail of all subscription changes and payments';



CREATE TABLE IF NOT EXISTS "public"."trades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trades" OWNER TO "postgres";


COMMENT ON TABLE "public"."trades" IS 'Canonical trade catalog; app selectors read active rows only.';



CREATE TABLE IF NOT EXISTS "public"."usage_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "metric_type" "text" NOT NULL,
    "metric_value" integer DEFAULT 1,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "usage_metrics_metric_type_check" CHECK (("metric_type" = ANY (ARRAY['TENDER_POSTED'::"text", 'JOB_POSTED'::"text", 'QUOTE_RECEIVED'::"text", 'APPLICATION_SUBMITTED'::"text", 'AVAILABILITY_BROADCAST'::"text", 'RADIUS_USED_KM'::"text"])))
);


ALTER TABLE "public"."usage_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."usage_metrics" IS 'Usage tracking for billing transparency and smart upgrade recommendations';



CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_external_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "profile_type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_external_profiles_type_check" CHECK (("profile_type" = ANY (ARRAY['website'::"text", 'instagram'::"text", 'facebook'::"text", 'linkedin'::"text", 'google_business'::"text"])))
);


ALTER TABLE "public"."user_external_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text",
    "location" "text" NOT NULL,
    "postcode" "text",
    "lat" double precision,
    "lng" double precision,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_locations" IS 'Premium: additional service locations per user. Primary location stays on users.';



CREATE SEQUENCE IF NOT EXISTS "public"."user_ratings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_ratings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_ratings_id_seq" OWNED BY "public"."user_ratings"."id";



CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "category" "text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_reports_category_check" CHECK (("category" = ANY (ARRAY['harassment'::"text", 'spam'::"text", 'scam'::"text", 'inappropriate_content'::"text", 'other'::"text"]))),
    CONSTRAINT "user_reports_check" CHECK (("reporter_id" <> "reported_id")),
    CONSTRAINT "user_reports_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."user_reports" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."users_with_ratings" AS
 SELECT "u"."id",
    "u"."email",
    "u"."name",
    "u"."role",
    "u"."trust_status",
    "u"."avatar",
    "u"."bio",
    "u"."rating",
    "u"."reliability_rating",
    "u"."completed_jobs",
    "u"."member_since",
    "u"."business_name",
    "u"."abn",
    "u"."location",
    "u"."radius",
    "u"."availability",
    "u"."created_at",
    "u"."updated_at",
    "u"."primary_trade",
    "u"."builder_plan",
    "u"."builder_sub_status",
    "u"."builder_sub_renews_at",
    "u"."contractor_plan",
    "u"."contractor_sub_status",
    "u"."contractor_sub_renews_at",
    "u"."alerts_enabled",
    "u"."alert_channel_email",
    "u"."alert_channel_sms",
    "u"."preferred_radius_km",
    "u"."base_lat",
    "u"."base_lng",
    "u"."base_suburb",
    "u"."base_postcode",
    "u"."subcontractor_plan",
    "u"."subcontractor_sub_status",
    "u"."subcontractor_sub_renews_at",
    "u"."subcontractor_preferred_radius_km",
    "u"."subcontractor_alerts_enabled",
    "u"."subcontractor_alert_channel_in_app",
    "u"."subcontractor_alert_channel_email",
    "u"."subcontractor_alert_channel_sms",
    "u"."subcontractor_availability_horizon_days",
    "u"."subcontractor_work_alerts_enabled",
    "u"."subcontractor_work_alert_in_app",
    "u"."subcontractor_work_alert_email",
    "u"."subcontractor_work_alert_sms",
    "u"."subcontractor_availability_broadcast_enabled",
    "u"."sms_opt_in_prompt_shown",
    "u"."sms_opt_in_prompt_dismissed_at",
    "u"."account_flagged_for_review",
    "u"."account_suspended",
    "u"."suspension_ends_at",
    "u"."active_plan",
    "u"."subscription_status",
    "u"."subscription_renews_at",
    "u"."subscription_started_at",
    "u"."subscription_canceled_at",
    "u"."additional_trades",
    "u"."additional_trades_unlocked",
    "u"."additional_trades_payment_date",
    "u"."complimentary_premium_until",
    "u"."complimentary_reason",
    "u"."last_seen_at",
    "u"."availability_description",
    "u"."postcode",
    "u"."location_lat",
    "u"."location_lng",
    "u"."search_location",
    "u"."search_postcode",
    "u"."search_lat",
    "u"."search_lng",
    "u"."account_reviewed",
    "u"."abn_status",
    "u"."abn_verified_at",
    "u"."abn_verified_by",
    "u"."abn_rejection_reason",
    "u"."abn_submitted_at",
    "u"."abn_updated_at",
    "u"."premium_until",
    "u"."is_premium",
    "u"."stripe_customer_id",
    "u"."stripe_subscription_id",
    "u"."is_admin",
    "u"."is_public_profile",
    "u"."cover_url",
    "u"."website",
    "u"."instagram",
    "u"."facebook",
    "u"."linkedin",
    "u"."tiktok",
    "u"."youtube",
    "u"."show_abn_on_profile",
    "u"."show_business_name_on_profile",
    "u"."lat",
    "u"."lng",
    "u"."abn_verified",
    "u"."phone",
    "u"."show_phone_on_profile",
    "u"."show_email_on_profile",
    "u"."mini_bio",
    "u"."deleted_at",
    "u"."entity_type",
    "u"."abn_last_checked_at",
    "u"."additional_locations",
    "u"."pricing_type",
    "u"."pricing_amount",
    "u"."show_pricing_on_profile",
    "u"."show_pricing_in_listings",
    "u"."receive_trade_alerts",
    "u"."plan",
    "u"."profile_strength_score",
    "u"."profile_strength_band",
    "u"."profile_likes_count",
    "u"."website_url",
    "u"."instagram_url",
    "u"."facebook_url",
    "u"."linkedin_url",
    "u"."google_business_url",
    "u"."google_rating",
    "u"."google_review_count",
    "u"."google_rating_verified",
    "u"."works_completed_count",
    "u"."jobs_posted_count",
    "u"."works_uploaded_count",
    "u"."profile_completion_score",
    "u"."last_strength_calculated_at",
    "u"."last_active_at",
    "u"."google_business_name",
    "u"."google_business_address",
    "u"."google_place_id",
    "u"."google_business_rating",
    "u"."google_business_review_count",
    "u"."google_listing_claimed_by_user",
    "u"."google_listing_verification_status",
    "u"."google_listing_verified_at",
    "u"."google_listing_verification_method",
    "u"."google_listing_verified_by",
    "u"."google_listing_rejection_reason",
    "ura"."up_count",
    "ura"."down_count",
    "ura"."rating_count",
    "ura"."rating_avg"
   FROM ("public"."users" "u"
     LEFT JOIN "public"."user_rating_aggregates" "ura" ON (("ura"."target_user_id" = "u"."id")));


ALTER VIEW "public"."users_with_ratings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."user_ratings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_ratings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_account_reviews"
    ADD CONSTRAINT "admin_account_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_review_cases"
    ADD CONSTRAINT "admin_review_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_id_subcontractor_id_key" UNIQUE ("job_id", "subcontractor_id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_post_events"
    ADD CONSTRAINT "job_post_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_alert_sends"
    ADD CONSTRAINT "listing_alert_sends_listing_type_listing_id_recipient_user__key" UNIQUE ("listing_type", "listing_id", "recipient_user_id");



ALTER TABLE ONLY "public"."listing_alert_sends"
    ADD CONSTRAINT "listing_alert_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."previous_work_images"
    ADD CONSTRAINT "previous_work_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."previous_work"
    ADD CONSTRAINT "previous_work_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_unique" UNIQUE ("liked_user_id", "liked_by_user_id");



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reliability_events"
    ADD CONSTRAINT "reliability_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_job_id_author_id_recipient_id_key" UNIQUE ("job_id", "author_id", "recipient_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractor_availability"
    ADD CONSTRAINT "subcontractor_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractor_availability"
    ADD CONSTRAINT "subcontractor_availability_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trades"
    ADD CONSTRAINT "trades_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."usage_metrics"
    ADD CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_external_profiles"
    ADD CONSTRAINT "user_external_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_external_profiles"
    ADD CONSTRAINT "user_external_profiles_unique" UNIQUE ("user_id", "profile_type");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



CREATE UNIQUE INDEX "conversations_direct_user_pair_unique" ON "public"."conversations" USING "btree" (LEAST("contractor_id", "subcontractor_id"), GREATEST("contractor_id", "subcontractor_id")) WHERE ("job_id" IS NULL);



CREATE UNIQUE INDEX "email_events_one_welcome_per_user_idx" ON "public"."email_events" USING "btree" ("user_id", "email_type") WHERE ("email_type" = 'welcome'::"text");



CREATE INDEX "email_events_status_idx" ON "public"."email_events" USING "btree" ("status");



CREATE INDEX "email_events_type_idx" ON "public"."email_events" USING "btree" ("email_type");



CREATE INDEX "email_events_user_id_idx" ON "public"."email_events" USING "btree" ("user_id");



CREATE INDEX "idx_admin_account_reviews_status" ON "public"."admin_account_reviews" USING "btree" ("status");



CREATE INDEX "idx_admin_account_reviews_user_id" ON "public"."admin_account_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_admin_review_cases_status" ON "public"."admin_review_cases" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['PENDING'::"text", 'IN_REVIEW'::"text"]));



CREATE INDEX "idx_admin_review_cases_subcontractor" ON "public"."admin_review_cases" USING "btree" ("subcontractor_id");



CREATE INDEX "idx_applications_job_id" ON "public"."applications" USING "btree" ("job_id");



CREATE INDEX "idx_applications_status" ON "public"."applications" USING "btree" ("status");



CREATE INDEX "idx_applications_subcontractor_id" ON "public"."applications" USING "btree" ("subcontractor_id");



CREATE INDEX "idx_audit_logs_admin_id" ON "public"."audit_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_conversations_contractor_id" ON "public"."conversations" USING "btree" ("contractor_id");



CREATE INDEX "idx_conversations_job_id" ON "public"."conversations" USING "btree" ("job_id");



CREATE INDEX "idx_conversations_subcontractor_id" ON "public"."conversations" USING "btree" ("subcontractor_id");



CREATE INDEX "idx_conversations_user_pair" ON "public"."conversations" USING "btree" ("contractor_id", "subcontractor_id");



CREATE INDEX "idx_job_post_events_contractor_created_at" ON "public"."job_post_events" USING "btree" ("contractor_id", "created_at" DESC);



CREATE INDEX "idx_jobs_approval_status" ON "public"."jobs" USING "btree" ("approval_status");



CREATE INDEX "idx_jobs_contractor_id" ON "public"."jobs" USING "btree" ("contractor_id");



CREATE INDEX "idx_jobs_created_at" ON "public"."jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_jobs_location_lat_lng" ON "public"."jobs" USING "btree" ("location_lat", "location_lng");



CREATE INDEX "idx_jobs_starts_at" ON "public"."jobs" USING "btree" ("starts_at") WHERE (("starts_at" IS NOT NULL) AND ("reminder_48h_sent" = false));



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_jobs_trade_category" ON "public"."jobs" USING "btree" ("trade_category");



CREATE INDEX "idx_listing_alert_sends_listing" ON "public"."listing_alert_sends" USING "btree" ("listing_type", "listing_id");



CREATE INDEX "idx_listing_alert_sends_recipient" ON "public"."listing_alert_sends" USING "btree" ("recipient_user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_previous_work_images_work_sort" ON "public"."previous_work_images" USING "btree" ("previous_work_id", "sort_order");



CREATE INDEX "idx_previous_work_user_created" ON "public"."previous_work" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_profile_likes_liked_by" ON "public"."profile_likes" USING "btree" ("liked_by_user_id");



CREATE INDEX "idx_profile_likes_liked_user" ON "public"."profile_likes" USING "btree" ("liked_user_id");



CREATE INDEX "idx_profile_views_created_at" ON "public"."profile_views" USING "btree" ("created_at");



CREATE INDEX "idx_profile_views_viewed_user_id" ON "public"."profile_views" USING "btree" ("viewed_user_id");



CREATE INDEX "idx_reliability_events_context_expiry" ON "public"."reliability_events" USING "btree" ("context_window_expires_at") WHERE ("subcontractor_context" IS NULL);



CREATE INDEX "idx_reliability_events_job" ON "public"."reliability_events" USING "btree" ("job_id");



CREATE INDEX "idx_reliability_events_subcontractor" ON "public"."reliability_events" USING "btree" ("subcontractor_id", "event_date" DESC);



CREATE INDEX "idx_reviews_job_id" ON "public"."reviews" USING "btree" ("job_id");



CREATE INDEX "idx_reviews_recipient_id" ON "public"."reviews" USING "btree" ("recipient_id");



CREATE INDEX "idx_subcontractor_availability_user_date" ON "public"."subcontractor_availability" USING "btree" ("user_id", "date");



CREATE INDEX "idx_subscription_history_user_date" ON "public"."subscription_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_trades_active_sort" ON "public"."trades" USING "btree" ("is_active", "sort_order", "name");



CREATE INDEX "idx_usage_metrics_user_date" ON "public"."usage_metrics" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_blocks_blocked" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_locations_user_id" ON "public"."user_locations" USING "btree" ("user_id");



CREATE INDEX "idx_user_ratings_rater" ON "public"."user_ratings" USING "btree" ("rater_user_id");



CREATE INDEX "idx_user_ratings_target" ON "public"."user_ratings" USING "btree" ("target_user_id");



CREATE INDEX "idx_user_reports_created_at" ON "public"."user_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_reports_reported_id" ON "public"."user_reports" USING "btree" ("reported_id");



CREATE INDEX "idx_user_reports_reporter_id" ON "public"."user_reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_user_reports_status" ON "public"."user_reports" USING "btree" ("status");



CREATE INDEX "idx_users_account_reviewed" ON "public"."users" USING "btree" ("account_reviewed");



CREATE INDEX "idx_users_active_plan" ON "public"."users" USING "btree" ("active_plan") WHERE ("active_plan" <> 'NONE'::"text");



CREATE INDEX "idx_users_complimentary_premium" ON "public"."users" USING "btree" ("complimentary_premium_until") WHERE ("complimentary_premium_until" IS NOT NULL);



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_last_active_at" ON "public"."users" USING "btree" ("last_active_at");



CREATE INDEX "idx_users_last_seen_at" ON "public"."users" USING "btree" ("last_seen_at");



CREATE INDEX "idx_users_primary_trade" ON "public"."users" USING "btree" ("primary_trade");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_subcontractor_plan" ON "public"."users" USING "btree" ("subcontractor_plan") WHERE ("role" = 'subcontractor'::"text");



CREATE INDEX "idx_users_subcontractor_sub_status" ON "public"."users" USING "btree" ("subcontractor_sub_status") WHERE ("role" = 'subcontractor'::"text");



CREATE INDEX "jobs_location_lat_lng_idx" ON "public"."jobs" USING "btree" ("location_lat", "location_lng");



CREATE INDEX "jobs_status_idx" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "jobs_trade_category_idx" ON "public"."jobs" USING "btree" ("trade_category");



CREATE INDEX "notifications_user_id_created_at_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "profile_likes_liked_by_user_idx" ON "public"."profile_likes" USING "btree" ("liked_by_user_id");



CREATE INDEX "profile_likes_liked_user_idx" ON "public"."profile_likes" USING "btree" ("liked_user_id");



CREATE INDEX "user_ratings_target_idx" ON "public"."user_ratings" USING "btree" ("target_user_id");



CREATE UNIQUE INDEX "user_ratings_unique_rater_target" ON "public"."user_ratings" USING "btree" ("target_user_id", "rater_user_id");



CREATE INDEX "users_abn_idx" ON "public"."users" USING "btree" ("abn");



CREATE INDEX "users_abn_status_idx" ON "public"."users" USING "btree" ("abn_status");



CREATE INDEX "users_deleted_at_idx" ON "public"."users" USING "btree" ("deleted_at");



CREATE OR REPLACE TRIGGER "set_context_window_expiry_trigger" BEFORE INSERT ON "public"."reliability_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_context_window_expiry"();



CREATE OR REPLACE TRIGGER "trg_block_user_billing_field_updates" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."block_user_billing_field_updates"();



CREATE OR REPLACE TRIGGER "trg_profile_likes_sync_count" AFTER INSERT OR DELETE ON "public"."profile_likes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_likes_count"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_likes_count" AFTER INSERT OR DELETE ON "public"."profile_likes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_likes_count"();



CREATE OR REPLACE TRIGGER "trg_users_abn_invariants" BEFORE INSERT OR UPDATE OF "abn" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."trg_users_abn_invariants"();



CREATE OR REPLACE TRIGGER "trigger_conversation_updated_on_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_updated_at_on_message"();



CREATE OR REPLACE TRIGGER "trigger_create_account_review" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_account_review_on_signup"();



CREATE OR REPLACE TRIGGER "trigger_notify_admins_new_account_review" AFTER INSERT ON "public"."admin_account_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."notify_admins_new_account_review"();



CREATE OR REPLACE TRIGGER "trigger_previous_work_updated_at" BEFORE UPDATE ON "public"."previous_work" FOR EACH ROW EXECUTE FUNCTION "public"."update_previous_work_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_queue_welcome_email_event" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."queue_welcome_email_event"();



CREATE OR REPLACE TRIGGER "update_subcontractor_availability_updated_at" BEFORE UPDATE ON "public"."subcontractor_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_subcontractor_availability_updated_at"();



ALTER TABLE ONLY "public"."admin_account_reviews"
    ADD CONSTRAINT "admin_account_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admin_account_reviews"
    ADD CONSTRAINT "admin_account_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_review_cases"
    ADD CONSTRAINT "admin_review_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admin_review_cases"
    ADD CONSTRAINT "admin_review_cases_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admin_review_cases"
    ADD CONSTRAINT "admin_review_cases_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_target_job_id_fkey" FOREIGN KEY ("target_job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_target_review_id_fkey" FOREIGN KEY ("target_review_id") REFERENCES "public"."reviews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_post_events"
    ADD CONSTRAINT "job_post_events_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_post_events"
    ADD CONSTRAINT "job_post_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_confirmed_subcontractor_fkey" FOREIGN KEY ("confirmed_subcontractor") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_fulfillment_marked_by_fkey" FOREIGN KEY ("fulfillment_marked_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_selected_subcontractor_fkey" FOREIGN KEY ("selected_subcontractor") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."listing_alert_sends"
    ADD CONSTRAINT "listing_alert_sends_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."previous_work_images"
    ADD CONSTRAINT "previous_work_images_previous_work_id_fkey" FOREIGN KEY ("previous_work_id") REFERENCES "public"."previous_work"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."previous_work"
    ADD CONSTRAINT "previous_work_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_liked_by_user_id_fkey" FOREIGN KEY ("liked_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_liked_user_id_fkey" FOREIGN KEY ("liked_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewed_user_id_fkey" FOREIGN KEY ("viewed_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reliability_events"
    ADD CONSTRAINT "reliability_events_admin_reviewed_by_fkey" FOREIGN KEY ("admin_reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reliability_events"
    ADD CONSTRAINT "reliability_events_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reliability_events"
    ADD CONSTRAINT "reliability_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reliability_events"
    ADD CONSTRAINT "reliability_events_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcontractor_availability"
    ADD CONSTRAINT "subcontractor_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_metrics"
    ADD CONSTRAINT "usage_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_external_profiles"
    ADD CONSTRAINT "user_external_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_rater_user_id_fkey" FOREIGN KEY ("rater_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ratings"
    ADD CONSTRAINT "user_ratings_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_abn_verified_by_fkey" FOREIGN KEY ("abn_verified_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Active trades are readable" ON "public"."trades" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Admins can create audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "admin_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can create review cases" ON "public"."admin_review_cases" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert account reviews" ON "public"."admin_account_reviews" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert admin settings" ON "public"."admin_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read admin settings" ON "public"."admin_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all account reviews" ON "public"."admin_account_reviews" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins can read all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update account reviews" ON "public"."admin_account_reviews" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update admin settings" ON "public"."admin_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update job approval status" ON "public"."jobs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update review cases" ON "public"."admin_review_cases" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update users" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can view all availability" ON "public"."subcontractor_availability" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all reliability events" ON "public"."reliability_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all review cases" ON "public"."admin_review_cases" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all subscription history" ON "public"."subscription_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Anyone can view approved reviews" ON "public"."reviews" FOR SELECT TO "authenticated" USING ((("moderation_status" = 'approved'::"text") OR ("author_id" = "auth"."uid"()) OR ("recipient_id" = "auth"."uid"())));



CREATE POLICY "Anyone can view open jobs" ON "public"."jobs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can read user_ratings" ON "public"."user_ratings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Contractors can create jobs" ON "public"."jobs" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "contractor_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'contractor'::"text"))))));



CREATE POLICY "Contractors can create reliability events" ON "public"."reliability_events" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "contractor_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "reliability_events"."job_id") AND ("jobs"."contractor_id" = "auth"."uid"()))))));



CREATE POLICY "Contractors can delete own jobs" ON "public"."jobs" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "contractor_id") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'contractor'::"text"))))));



CREATE POLICY "Contractors can update applications for their jobs" ON "public"."applications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "jobs"."contractor_id"
   FROM "public"."jobs"
  WHERE ("jobs"."id" = "applications"."job_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "jobs"."contractor_id"
   FROM "public"."jobs"
  WHERE ("jobs"."id" = "applications"."job_id"))));



CREATE POLICY "Contractors can update own jobs" ON "public"."jobs" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "contractor_id") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'contractor'::"text")))))) WITH CHECK ((("auth"."uid"() = "contractor_id") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'contractor'::"text"))))));



CREATE POLICY "Contractors can view events they created" ON "public"."reliability_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "contractor_id"));



CREATE POLICY "Participants can create conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "contractor_id") OR ("auth"."uid"() = "subcontractor_id")));



CREATE POLICY "Participants can create messages in their conversations" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."contractor_id" = "auth"."uid"()) OR ("c"."subcontractor_id" = "auth"."uid"()))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."user_blocks" "ub",
    "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND ("ub"."blocker_id" =
        CASE
            WHEN ("c"."contractor_id" = "auth"."uid"()) THEN "c"."subcontractor_id"
            ELSE "c"."contractor_id"
        END) AND ("ub"."blocked_id" = "auth"."uid"()))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."user_blocks" "ub",
    "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND ("ub"."blocker_id" = "auth"."uid"()) AND ("ub"."blocked_id" =
        CASE
            WHEN ("c"."contractor_id" = "auth"."uid"()) THEN "c"."subcontractor_id"
            ELSE "c"."contractor_id"
        END)))))));



CREATE POLICY "Participants can view messages in their conversations" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."contractor_id" = "auth"."uid"()) OR ("conversations"."subcontractor_id" = "auth"."uid"()))))));



CREATE POLICY "Participants can view their conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "contractor_id") OR ("auth"."uid"() = "subcontractor_id")));



CREATE POLICY "Recipients can reply to reviews" ON "public"."reviews" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "recipient_id")) WITH CHECK (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Service role only for listing_alert_sends" ON "public"."listing_alert_sends" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Subcontractors can create applications" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "subcontractor_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'subcontractor'::"text"))))));



CREATE POLICY "Subcontractors can submit context for own events" ON "public"."reliability_events" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "subcontractor_id") AND ("subcontractor_context" IS NULL) AND ("now"() < "context_window_expires_at"))) WITH CHECK ((("auth"."uid"() = "subcontractor_id") AND ("subcontractor_context" IS NOT NULL)));



CREATE POLICY "Subcontractors can update own applications" ON "public"."applications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "subcontractor_id")) WITH CHECK (("auth"."uid"() = "subcontractor_id"));



CREATE POLICY "Subcontractors can view own reliability events" ON "public"."reliability_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "subcontractor_id"));



CREATE POLICY "Subcontractors can view own review cases" ON "public"."admin_review_cases" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "subcontractor_id"));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can create blocks (blocker must be self)" ON "public"."user_blocks" FOR INSERT TO "authenticated" WITH CHECK (("blocker_id" = "auth"."uid"()));



CREATE POLICY "Users can create reports (reporter must be self)" ON "public"."user_reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Users can create reviews for jobs they participated in" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "author_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "reviews"."job_id") AND (("jobs"."contractor_id" = "auth"."uid"()) OR ("jobs"."confirmed_subcontractor" = "auth"."uid"())))))));



CREATE POLICY "Users can delete own availability" ON "public"."subcontractor_availability" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own locations" ON "public"."user_locations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own blocks" ON "public"."user_blocks" FOR DELETE TO "authenticated" USING (("blocker_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own availability" ON "public"."subcontractor_availability" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own locations" ON "public"."user_locations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can insert own profile during signup" ON "public"."users" FOR INSERT TO "authenticated", "anon" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own rating" ON "public"."user_ratings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "rater_user_id"));



CREATE POLICY "Users can insert their own views" ON "public"."profile_views" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "viewer_user_id"));



CREATE POLICY "Users can read own locations" ON "public"."user_locations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own profile views" ON "public"."profile_views" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "viewed_user_id"));



CREATE POLICY "Users can read their own viewer records" ON "public"."profile_views" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "viewer_user_id"));



CREATE POLICY "Users can update own availability" ON "public"."subcontractor_availability" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own locations" ON "public"."user_locations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view applications for their jobs or their own applica" ON "public"."applications" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "subcontractor_id") OR ("auth"."uid"() IN ( SELECT "jobs"."contractor_id"
   FROM "public"."jobs"
  WHERE ("jobs"."id" = "applications"."job_id")))));



CREATE POLICY "Users can view own availability" ON "public"."subcontractor_availability" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscription history" ON "public"."subscription_history" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own usage metrics" ON "public"."usage_metrics" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own blocks" ON "public"."user_blocks" FOR SELECT TO "authenticated" USING ((("blocker_id" = "auth"."uid"()) OR ("blocked_id" = "auth"."uid"())));



CREATE POLICY "Users can view their own reports" ON "public"."user_reports" FOR SELECT TO "authenticated" USING (("reporter_id" = "auth"."uid"()));



ALTER TABLE "public"."admin_account_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_review_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contractor can delete own closed jobs" ON "public"."jobs" FOR DELETE USING ((("contractor_id" = "auth"."uid"()) AND ("lower"(COALESCE("status", ''::"text")) = 'closed'::"text")));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete own rating" ON "public"."user_ratings" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "insert own rating" ON "public"."user_ratings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "rater_user_id"));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_owner_update" ON "public"."jobs" FOR UPDATE TO "authenticated" USING (("contractor_id" = "auth"."uid"())) WITH CHECK (("contractor_id" = "auth"."uid"()));



ALTER TABLE "public"."listing_alert_sends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."previous_work" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "previous_work_delete_own" ON "public"."previous_work" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."previous_work_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "previous_work_images_delete_own" ON "public"."previous_work_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."previous_work" "pw"
  WHERE (("pw"."id" = "previous_work_images"."previous_work_id") AND ("pw"."user_id" = "auth"."uid"())))));



CREATE POLICY "previous_work_images_insert_own" ON "public"."previous_work_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."previous_work" "pw"
  WHERE (("pw"."id" = "previous_work_images"."previous_work_id") AND ("pw"."user_id" = "auth"."uid"())))));



CREATE POLICY "previous_work_images_select_visible" ON "public"."previous_work_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."previous_work" "pw"
  WHERE (("pw"."id" = "previous_work_images"."previous_work_id") AND (("pw"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users" "u"
          WHERE (("u"."id" = "pw"."user_id") AND ("u"."is_public_profile" IS TRUE)))))))));



CREATE POLICY "previous_work_insert_own" ON "public"."previous_work" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "previous_work_select_visible" ON "public"."previous_work" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "previous_work"."user_id") AND ("u"."is_public_profile" IS TRUE))))));



CREATE POLICY "previous_work_update_own" ON "public"."previous_work" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profile_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_likes_delete_own" ON "public"."profile_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "liked_by_user_id"));



CREATE POLICY "profile_likes_insert_own" ON "public"."profile_likes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "liked_by_user_id") AND ("liked_user_id" <> "liked_by_user_id")));



CREATE POLICY "profile_likes_select_all_authenticated" ON "public"."profile_likes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profile_likes_select_authenticated" ON "public"."profile_likes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read ratings" ON "public"."user_ratings" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."reliability_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcontractor_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update own rating" ON "public"."user_ratings" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."usage_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."accept_quote_request"("p_request_id" "uuid", "p_trade_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_quote_request"("p_request_id" "uuid", "p_trade_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_quote_request"("p_request_id" "uuid", "p_trade_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."block_user_billing_field_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_user_billing_field_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_user_billing_field_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_profile_strength"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_profile_strength"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_profile_strength"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_publish_tender"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_publish_tender"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_publish_tender"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_tender"("p_tender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_tender"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_tender"("p_tender_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_exists"("check_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists"("check_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists"("check_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_tenders"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tenders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tenders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."close_tender"("p_tender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."close_tender"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_tender"("p_tender_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_account_review_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_account_review_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_account_review_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decline_quote_request"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_quote_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_quote_request"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tender"("p_tender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tender"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tender"("p_tender_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_free_tender_quote_cap"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_free_tender_quote_cap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_free_tender_quote_cap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_jobs_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_jobs_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_jobs_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenders_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenders_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenders_visible_to_viewer"("viewer_id" "uuid", "trade_filter" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."haversine_km"("lat1" double precision, "lon1" double precision, "lat2" double precision, "lon2" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."haversine_km"("lat1" double precision, "lon1" double precision, "lat2" double precision, "lon2" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."haversine_km"("lat1" double precision, "lon1" double precision, "lat2" double precision, "lon2" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_premium_discovery"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_premium_discovery"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_premium_discovery"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_premium_user"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_premium_user"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_premium_user"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_tender_owner"("p_tender_id" "uuid", "p_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_tender_owner"("p_tender_id" "uuid", "p_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_tender_owner"("p_tender_id" "uuid", "p_uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."km_distance"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."km_distance"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."km_distance"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_admins_new_account_review"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_admins_new_account_review"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_admins_new_account_review"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_hard_delete_tender_quotes"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_hard_delete_tender_quotes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_hard_delete_tender_quotes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_hard_delete_tenders"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_hard_delete_tenders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_hard_delete_tenders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_tender"("p_tender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_tender"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_tender"("p_tender_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_expired_job_listings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_expired_job_listings"() TO "anon";
GRANT ALL ON FUNCTION "public"."purge_expired_job_listings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_expired_job_listings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."queue_welcome_email_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."queue_welcome_email_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_welcome_email_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_profile_strength"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_profile_strength"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_profile_strength"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reopen_tender"("p_tender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reopen_tender"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reopen_tender"("p_tender_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_to_quote"("p_tender_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."request_to_quote"("p_tender_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_to_quote"("p_tender_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_context_window_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_context_window_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_context_window_expiry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tender_has_valid_coords"("p_lat" double precision, "p_lng" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."tender_has_valid_coords"("p_lat" double precision, "p_lng" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tender_has_valid_coords"("p_lat" double precision, "p_lng" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."tenders_block_reopen_for_free"() TO "anon";
GRANT ALL ON FUNCTION "public"."tenders_block_reopen_for_free"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tenders_block_reopen_for_free"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_last_active_if_stale"("p_user_id" "uuid", "p_now" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."touch_last_active_if_stale"("p_user_id" "uuid", "p_now" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_last_active_if_stale"("p_user_id" "uuid", "p_now" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_users_abn_invariants"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_users_abn_invariants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_users_abn_invariants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_updated_at_on_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_updated_at_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_updated_at_on_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_previous_work_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_previous_work_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_previous_work_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subcontractor_availability_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subcontractor_availability_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subcontractor_availability_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."admin_account_reviews" TO "anon";
GRANT ALL ON TABLE "public"."admin_account_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_account_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."admin_review_cases" TO "anon";
GRANT ALL ON TABLE "public"."admin_review_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_review_cases" TO "service_role";



GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."email_events" TO "anon";
GRANT ALL ON TABLE "public"."email_events" TO "authenticated";
GRANT ALL ON TABLE "public"."email_events" TO "service_role";



GRANT ALL ON TABLE "public"."job_post_events" TO "anon";
GRANT ALL ON TABLE "public"."job_post_events" TO "authenticated";
GRANT ALL ON TABLE "public"."job_post_events" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."listing_alert_sends" TO "anon";
GRANT ALL ON TABLE "public"."listing_alert_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_alert_sends" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."previous_work" TO "anon";
GRANT ALL ON TABLE "public"."previous_work" TO "authenticated";
GRANT ALL ON TABLE "public"."previous_work" TO "service_role";



GRANT ALL ON TABLE "public"."previous_work_images" TO "anon";
GRANT ALL ON TABLE "public"."previous_work_images" TO "authenticated";
GRANT ALL ON TABLE "public"."previous_work_images" TO "service_role";



GRANT ALL ON TABLE "public"."profile_likes" TO "anon";
GRANT ALL ON TABLE "public"."profile_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_likes" TO "service_role";



GRANT ALL ON TABLE "public"."profile_views" TO "anon";
GRANT ALL ON TABLE "public"."profile_views" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_views" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."public_profile_directory" TO "anon";
GRANT ALL ON TABLE "public"."public_profile_directory" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profile_directory" TO "service_role";



GRANT ALL ON TABLE "public"."user_ratings" TO "anon";
GRANT ALL ON TABLE "public"."user_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."user_rating_aggregates" TO "anon";
GRANT ALL ON TABLE "public"."user_rating_aggregates" TO "authenticated";
GRANT ALL ON TABLE "public"."user_rating_aggregates" TO "service_role";



GRANT ALL ON TABLE "public"."public_profile_directory_with_ratings" TO "anon";
GRANT ALL ON TABLE "public"."public_profile_directory_with_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profile_directory_with_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."reliability_events" TO "anon";
GRANT ALL ON TABLE "public"."reliability_events" TO "authenticated";
GRANT ALL ON TABLE "public"."reliability_events" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractor_availability" TO "anon";
GRANT ALL ON TABLE "public"."subcontractor_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractor_availability" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_history" TO "anon";
GRANT ALL ON TABLE "public"."subscription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_history" TO "service_role";



GRANT ALL ON TABLE "public"."trades" TO "anon";
GRANT ALL ON TABLE "public"."trades" TO "authenticated";
GRANT ALL ON TABLE "public"."trades" TO "service_role";



GRANT ALL ON TABLE "public"."usage_metrics" TO "anon";
GRANT ALL ON TABLE "public"."usage_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_external_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_external_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_external_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_locations" TO "anon";
GRANT ALL ON TABLE "public"."user_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_locations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_ratings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_ratings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_ratings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_reports" TO "anon";
GRANT ALL ON TABLE "public"."user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reports" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_ratings" TO "anon";
GRANT ALL ON TABLE "public"."users_with_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_ratings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































