                                                                Table "public.users"
                    Column                    |               Type                | Collation | Nullable |                  Default                  
----------------------------------------------+-----------------------------------+-----------+----------+-------------------------------------------
 id                                           | uuid                              |           | not null | gen_random_uuid()
 email                                        | text                              |           | not null | 
 name                                         | text                              |           |          | 
 role                                         | text                              |           | not null | 'subcontractor'::text
 trust_status                                 | text                              |           | not null | 'pending'::text
 avatar                                       | text                              |           |          | 
 bio                                          | text                              |           |          | 
 rating                                       | numeric                           |           |          | 0
 reliability_rating                           | numeric                           |           |          | 
 completed_jobs                               | integer                           |           |          | 0
 member_since                                 | timestamp with time zone          |           |          | now()
 business_name                                | text                              |           |          | 
 abn                                          | text                              |           |          | 
 location                                     | text                              |           |          | 
 radius                                       | integer                           |           |          | 
 availability                                 | jsonb                             |           |          | 
 created_at                                   | timestamp with time zone          |           |          | now()
 updated_at                                   | timestamp with time zone          |           |          | now()
 primary_trade                                | text                              |           |          | 
 builder_plan                                 | text                              |           |          | 'NONE'::text
 builder_sub_status                           | text                              |           |          | 'NONE'::text
 builder_sub_renews_at                        | timestamp with time zone          |           |          | 
 contractor_plan                              | text                              |           |          | 'NONE'::text
 contractor_sub_status                        | text                              |           |          | 'NONE'::text
 contractor_sub_renews_at                     | timestamp with time zone          |           |          | 
 alerts_enabled                               | boolean                           |           |          | false
 alert_channel_email                          | boolean                           |           |          | true
 alert_channel_sms                            | boolean                           |           |          | false
 preferred_radius_km                          | integer                           |           |          | 15
 base_lat                                     | numeric                           |           |          | 
 base_lng                                     | numeric                           |           |          | 
 base_suburb                                  | text                              |           |          | 
 base_postcode                                | text                              |           |          | 
 subcontractor_plan                           | subcontractor_plan_type           |           |          | 'NONE'::subcontractor_plan_type
 subcontractor_sub_status                     | subcontractor_subscription_status |           |          | 'NONE'::subcontractor_subscription_status
 subcontractor_sub_renews_at                  | timestamp with time zone          |           |          | 
 subcontractor_preferred_radius_km            | integer                           |           |          | 15
 subcontractor_alerts_enabled                 | boolean                           |           |          | false
 subcontractor_alert_channel_in_app           | boolean                           |           |          | true
 subcontractor_alert_channel_email            | boolean                           |           |          | false
 subcontractor_alert_channel_sms              | boolean                           |           |          | false
 subcontractor_availability_horizon_days      | integer                           |           |          | 14
 subcontractor_work_alerts_enabled            | boolean                           |           |          | true
 subcontractor_work_alert_in_app              | boolean                           |           |          | true
 subcontractor_work_alert_email               | boolean                           |           |          | true
 subcontractor_work_alert_sms                 | boolean                           |           |          | false
 subcontractor_availability_broadcast_enabled | boolean                           |           |          | false
 sms_opt_in_prompt_shown                      | boolean                           |           |          | false
 sms_opt_in_prompt_dismissed_at               | timestamp with time zone          |           |          | 
 account_flagged_for_review                   | boolean                           |           |          | false
 account_suspended                            | boolean                           |           |          | false
 suspension_ends_at                           | timestamp with time zone          |           |          | 
 active_plan                                  | text                              |           |          | 'NONE'::text
 subscription_status                          | text                              |           |          | 'NONE'::text
 subscription_renews_at                       | timestamp with time zone          |           |          | 
 subscription_started_at                      | timestamp with time zone          |           |          | 
 subscription_canceled_at                     | timestamp with time zone          |           |          | 
 additional_trades                            | text[]                            |           |          | '{}'::text[]
 additional_trades_unlocked                   | boolean                           |           |          | false
 additional_trades_payment_date               | timestamp with time zone          |           |          | 
 complimentary_premium_until                  | timestamp with time zone          |           |          | 
 complimentary_reason                         | text                              |           |          | 
 last_seen_at                                 | timestamp with time zone          |           |          | now()
 availability_description                     | text                              |           |          | 
 postcode                                     | text                              |           |          | 
 location_lat                                 | numeric                           |           |          | 
 location_lng                                 | numeric                           |           |          | 
 search_location                              | text                              |           |          | 
 search_postcode                              | text                              |           |          | 
 search_lat                                   | numeric                           |           |          | 
 search_lng                                   | numeric                           |           |          | 
 account_reviewed                             | boolean                           |           |          | false
 abn_status                                   | abn_verification_status           |           |          | 'UNVERIFIED'::abn_verification_status
 abn_verified_at                              | timestamp with time zone          |           |          | 
 abn_verified_by                              | uuid                              |           |          | 
 abn_rejection_reason                         | text                              |           |          | 
 abn_submitted_at                             | timestamp with time zone          |           |          | 
 abn_updated_at                               | timestamp with time zone          |           | not null | now()
 premium_until                                | timestamp with time zone          |           |          | 
 is_premium                                   | boolean                           |           |          | false
 stripe_customer_id                           | text                              |           |          | 
 stripe_subscription_id                       | text                              |           |          | 
 is_admin                                     | boolean                           |           | not null | false
 is_public_profile                            | boolean                           |           | not null | true
 cover_url                                    | text                              |           |          | 
 website                                      | text                              |           |          | 
 instagram                                    | text                              |           |          | 
 facebook                                     | text                              |           |          | 
 linkedin                                     | text                              |           |          | 
 tiktok                                       | text                              |           |          | 
 youtube                                      | text                              |           |          | 
 show_abn_on_profile                          | boolean                           |           | not null | false
 show_business_name_on_profile                | boolean                           |           | not null | true
 lat                                          | double precision                  |           |          | 
 lng                                          | double precision                  |           |          | 
 abn_verified                                 | boolean                           |           | not null | false
 phone                                        | text                              |           |          | 
 show_phone_on_profile                        | boolean                           |           | not null | false
 show_email_on_profile                        | boolean                           |           | not null | false
 mini_bio                                     | text                              |           |          | 
 deleted_at                                   | timestamp with time zone          |           |          | 
 entity_type                                  | text                              |           |          | 
 abn_last_checked_at                          | timestamp with time zone          |           |          | 
 additional_locations                         | jsonb                             |           |          | '[]'::jsonb
 pricing_type                                 | text                              |           |          | 
 pricing_amount                               | numeric                           |           |          | 
 show_pricing_on_profile                      | boolean                           |           | not null | false
 show_pricing_in_listings                     | boolean                           |           | not null | false
 receive_trade_alerts                         | boolean                           |           |          | false
 plan                                         | text                              |           |          | 'free'::text
 profile_strength_score                       | integer                           |           | not null | 0
 profile_strength_band                        | text                              |           | not null | 'LOW'::text
 profile_likes_count                          | integer                           |           | not null | 0
 website_url                                  | text                              |           |          | 
 instagram_url                                | text                              |           |          | 
 facebook_url                                 | text                              |           |          | 
 linkedin_url                                 | text                              |           |          | 
 google_business_url                          | text                              |           |          | 
 google_rating                                | numeric(2,1)                      |           |          | 
 google_review_count                          | integer                           |           |          | 
 google_rating_verified                       | boolean                           |           | not null | false
 works_completed_count                        | integer                           |           | not null | 0
 jobs_posted_count                            | integer                           |           | not null | 0
 works_uploaded_count                         | integer                           |           | not null | 0
 profile_completion_score                     | integer                           |           | not null | 0
 last_strength_calculated_at                  | timestamp with time zone          |           |          | 
 last_active_at                               | timestamp with time zone          |           |          | now()
 google_business_name                         | text                              |           |          | 
 google_business_address                      | text                              |           |          | 
 google_place_id                              | text                              |           |          | 
 google_business_rating                       | numeric                           |           |          | 
 google_business_review_count                 | integer                           |           |          | 
 google_listing_claimed_by_user               | boolean                           |           | not null | false
 google_listing_verification_status           | text                              |           | not null | 'UNVERIFIED'::text
 google_listing_verified_at                   | timestamp with time zone          |           |          | 
 google_listing_verification_method           | text                              |           |          | 
 google_listing_verified_by                   | uuid                              |           |          | 
 google_listing_rejection_reason              | text                              |           |          | 
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "idx_users_account_reviewed" btree (account_reviewed)
    "idx_users_active_plan" btree (active_plan) WHERE active_plan <> 'NONE'::text
    "idx_users_complimentary_premium" btree (complimentary_premium_until) WHERE complimentary_premium_until IS NOT NULL
    "idx_users_email" btree (email)
    "idx_users_last_active_at" btree (last_active_at)
    "idx_users_last_seen_at" btree (last_seen_at)
    "idx_users_primary_trade" btree (primary_trade)
    "idx_users_role" btree (role)
    "idx_users_subcontractor_plan" btree (subcontractor_plan) WHERE role = 'subcontractor'::text
    "idx_users_subcontractor_sub_status" btree (subcontractor_sub_status) WHERE role = 'subcontractor'::text
    "users_abn_idx" btree (abn)
    "users_abn_status_idx" btree (abn_status)
    "users_deleted_at_idx" btree (deleted_at)
    "users_email_key" UNIQUE CONSTRAINT, btree (email)
    "users_stripe_customer_id_key" UNIQUE CONSTRAINT, btree (stripe_customer_id)
    "users_stripe_subscription_id_key" UNIQUE CONSTRAINT, btree (stripe_subscription_id)
Check constraints:
    "users_active_plan_check" CHECK (active_plan = ANY (ARRAY['NONE'::text, 'BUSINESS_PRO_20'::text, 'SUBCONTRACTOR_PRO_10'::text, 'ALL_ACCESS_PRO_26'::text]))
    "users_google_business_rating_range_check" CHECK (google_business_rating IS NULL OR google_business_rating >= 0::numeric AND google_business_rating <= 5::numeric)
    "users_google_business_review_count_nonnegative_check" CHECK (google_business_review_count IS NULL OR google_business_review_count >= 0)
    "users_google_listing_verification_status_check" CHECK (google_listing_verification_status = ANY (ARRAY['UNVERIFIED'::text, 'SELF_CONFIRMED'::text, 'PENDING_REVIEW'::text, 'VERIFIED'::text, 'REJECTED'::text]))
    "users_plan_check" CHECK (plan = ANY (ARRAY['free'::text, 'premium'::text]))
    "users_pricing_type_check" CHECK (pricing_type = ANY (ARRAY['hourly'::text, 'day'::text, 'from_hourly'::text, 'quote_on_request'::text]))
    "users_profile_strength_band_check" CHECK (profile_strength_band = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'ELITE'::text]))
    "users_role_check" CHECK (role = ANY (ARRAY['contractor'::text, 'subcontractor'::text, 'admin'::text]))
    "users_subscription_status_check" CHECK (subscription_status = ANY (ARRAY['NONE'::text, 'ACTIVE'::text, 'PAST_DUE'::text, 'CANCELED'::text]))
    "users_trust_status_check" CHECK (trust_status = ANY (ARRAY['pending'::text, 'approved'::text, 'verified'::text]))
Referenced by:
    TABLE "admin_account_reviews" CONSTRAINT "admin_account_reviews_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id)
    TABLE "admin_account_reviews" CONSTRAINT "admin_account_reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "admin_review_cases" CONSTRAINT "admin_review_cases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id)
    TABLE "admin_review_cases" CONSTRAINT "admin_review_cases_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id)
    TABLE "admin_review_cases" CONSTRAINT "admin_review_cases_subcontractor_id_fkey" FOREIGN KEY (subcontractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "admin_settings" CONSTRAINT "admin_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id)
    TABLE "applications" CONSTRAINT "applications_subcontractor_id_fkey" FOREIGN KEY (subcontractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "audit_logs" CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "audit_logs" CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    TABLE "conversations" CONSTRAINT "conversations_contractor_id_fkey" FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "conversations" CONSTRAINT "conversations_subcontractor_id_fkey" FOREIGN KEY (subcontractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "email_events" CONSTRAINT "email_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    TABLE "job_post_events" CONSTRAINT "job_post_events_contractor_id_fkey" FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "jobs" CONSTRAINT "jobs_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id)
    TABLE "jobs" CONSTRAINT "jobs_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES users(id)
    TABLE "jobs" CONSTRAINT "jobs_confirmed_subcontractor_fkey" FOREIGN KEY (confirmed_subcontractor) REFERENCES users(id)
    TABLE "jobs" CONSTRAINT "jobs_contractor_id_fkey" FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "jobs" CONSTRAINT "jobs_fulfillment_marked_by_fkey" FOREIGN KEY (fulfillment_marked_by) REFERENCES users(id)
    TABLE "jobs" CONSTRAINT "jobs_selected_subcontractor_fkey" FOREIGN KEY (selected_subcontractor) REFERENCES users(id)
    TABLE "messages" CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "notifications" CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "previous_work" CONSTRAINT "previous_work_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "profile_likes" CONSTRAINT "profile_likes_liked_by_user_id_fkey" FOREIGN KEY (liked_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "profile_likes" CONSTRAINT "profile_likes_liked_user_id_fkey" FOREIGN KEY (liked_user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "profile_views" CONSTRAINT "profile_views_viewed_user_id_fkey" FOREIGN KEY (viewed_user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "profile_views" CONSTRAINT "profile_views_viewer_user_id_fkey" FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "reliability_events" CONSTRAINT "reliability_events_admin_reviewed_by_fkey" FOREIGN KEY (admin_reviewed_by) REFERENCES users(id)
    TABLE "reliability_events" CONSTRAINT "reliability_events_contractor_id_fkey" FOREIGN KEY (contractor_id) REFERENCES users(id)
    TABLE "reliability_events" CONSTRAINT "reliability_events_subcontractor_id_fkey" FOREIGN KEY (subcontractor_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "reviews" CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "reviews" CONSTRAINT "reviews_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "subscription_history" CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "usage_metrics" CONSTRAINT "usage_metrics_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "user_external_profiles" CONSTRAINT "user_external_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "user_locations" CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "user_ratings" CONSTRAINT "user_ratings_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "user_reports" CONSTRAINT "user_reports_reported_id_fkey" FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "user_reports" CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
Policies (row security enabled): (none)
Triggers:
    trg_block_user_billing_field_updates BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION block_user_billing_field_updates()
    trg_users_abn_invariants BEFORE INSERT OR UPDATE OF abn ON users FOR EACH ROW EXECUTE FUNCTION trg_users_abn_invariants()
    trigger_create_account_review AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_account_review_on_signup()
    trigger_queue_welcome_email_event AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION queue_welcome_email_event()

