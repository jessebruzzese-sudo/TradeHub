export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abn_verifications: {
        Row: {
          abn: string
          business_name: string | null
          created_at: string
          id: string
          provider: string
          provider_reference: string | null
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abn: string
          business_name?: string | null
          created_at?: string
          id?: string
          provider?: string
          provider_reference?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abn?: string
          business_name?: string | null
          created_at?: string
          id?: string
          provider?: string
          provider_reference?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_account_reviews: {
        Row: {
          created_at: string | null
          flag_reason: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_account_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          note: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          note: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          note?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_review_cases: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          reason: string
          reliability_event_count: number | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subcontractor_id: string
          suspension_days: number | null
          suspension_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason: string
          reliability_event_count?: number | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subcontractor_id: string
          suspension_days?: number | null
          suspension_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string
          reliability_event_count?: number | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subcontractor_id?: string
          suspension_days?: number | null
          suspension_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_review_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_cases_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string | null
          id: string
          job_id: string
          message: string | null
          responded_at: string | null
          selected_dates: Json | null
          status: string
          subcontractor_id: string
          updated_at: string | null
          withdrawn_at: string | null
          withdrawn_reason: string | null
        }
        Insert: {
          applied_at?: string | null
          id?: string
          job_id: string
          message?: string | null
          responded_at?: string | null
          selected_dates?: Json | null
          status?: string
          subcontractor_id: string
          updated_at?: string | null
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
        }
        Update: {
          applied_at?: string | null
          id?: string
          job_id?: string
          message?: string | null
          responded_at?: string | null
          selected_dates?: Json | null
          status?: string
          subcontractor_id?: string
          updated_at?: string | null
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: string
          id: string
          metadata: Json | null
          target_job_id: string | null
          target_review_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details: string
          id?: string
          metadata?: Json | null
          target_job_id?: string | null
          target_review_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: string
          id?: string
          metadata?: Json | null
          target_job_id?: string | null
          target_review_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_job_id_fkey"
            columns: ["target_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_review_id_fkey"
            columns: ["target_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contractor_id: string
          created_at: string | null
          id: string
          job_id: string | null
          subcontractor_id: string
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          subcontractor_id: string
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          subcontractor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          confirmed_subcontractor: string | null
          contractor_id: string
          created_at: string | null
          dates: Json
          deleted_at: string | null
          description: string
          duration: number | null
          file_name: string | null
          file_url: string | null
          fulfilled: boolean | null
          fulfillment_marked_at: string | null
          fulfillment_marked_by: string | null
          id: string
          location: string
          location_lat: number | null
          location_lng: number | null
          location_place_id: string | null
          pay_type: string
          postcode: string
          rate: number | null
          reminder_48h_sent: boolean | null
          selected_subcontractor: string | null
          start_date: string | null
          start_time: string | null
          starts_at: string | null
          status: string
          title: string
          trade_category: string
          updated_at: string | null
          was_accepted_or_confirmed_before_cancellation: boolean | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_subcontractor?: string | null
          contractor_id: string
          created_at?: string | null
          dates?: Json
          deleted_at?: string | null
          description: string
          duration?: number | null
          file_name?: string | null
          file_url?: string | null
          fulfilled?: boolean | null
          fulfillment_marked_at?: string | null
          fulfillment_marked_by?: string | null
          id?: string
          location: string
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          pay_type: string
          postcode: string
          rate?: number | null
          reminder_48h_sent?: boolean | null
          selected_subcontractor?: string | null
          start_date?: string | null
          start_time?: string | null
          starts_at?: string | null
          status?: string
          title: string
          trade_category: string
          updated_at?: string | null
          was_accepted_or_confirmed_before_cancellation?: boolean | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_subcontractor?: string | null
          contractor_id?: string
          created_at?: string | null
          dates?: Json
          deleted_at?: string | null
          description?: string
          duration?: number | null
          file_name?: string | null
          file_url?: string | null
          fulfilled?: boolean | null
          fulfillment_marked_at?: string | null
          fulfillment_marked_by?: string | null
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          pay_type?: string
          postcode?: string
          rate?: number | null
          reminder_48h_sent?: boolean | null
          selected_subcontractor?: string | null
          start_date?: string | null
          start_time?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          trade_category?: string
          updated_at?: string | null
          was_accepted_or_confirmed_before_cancellation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_confirmed_subcontractor_fkey"
            columns: ["confirmed_subcontractor"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_confirmed_subcontractor_fkey"
            columns: ["confirmed_subcontractor"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_confirmed_subcontractor_fkey"
            columns: ["confirmed_subcontractor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_confirmed_subcontractor_fkey"
            columns: ["confirmed_subcontractor"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_fulfillment_marked_by_fkey"
            columns: ["fulfillment_marked_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_fulfillment_marked_by_fkey"
            columns: ["fulfillment_marked_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_fulfillment_marked_by_fkey"
            columns: ["fulfillment_marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_fulfillment_marked_by_fkey"
            columns: ["fulfillment_marked_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_selected_subcontractor_fkey"
            columns: ["selected_subcontractor"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_selected_subcontractor_fkey"
            columns: ["selected_subcontractor"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_selected_subcontractor_fkey"
            columns: ["selected_subcontractor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_selected_subcontractor_fkey"
            columns: ["selected_subcontractor"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_alert_sends: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          listing_id: string
          listing_type: string
          provider_message_id: string | null
          recipient_email: string
          recipient_user_id: string
          status: string
          trade_label: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          listing_id: string
          listing_type: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_user_id: string
          status?: string
          trade_label?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          listing_id?: string
          listing_type?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_user_id?: string
          status?: string
          trade_label?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          is_system_message: boolean | null
          sender_id: string
          text: string
        }
        Insert: {
          attachments?: Json | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_system_message?: boolean | null
          sender_id: string
          text: string
        }
        Update: {
          attachments?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_system_message?: boolean | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          data: Json | null
          description: string
          id: string
          job_id: string | null
          link: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          data?: Json | null
          description: string
          id?: string
          job_id?: string | null
          link?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          data?: Json | null
          description?: string
          id?: string
          job_id?: string | null
          link?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      previous_work: {
        Row: {
          caption: string
          created_at: string
          id: string
          location: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption: string
          created_at?: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "previous_work_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previous_work_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previous_work_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previous_work_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      previous_work_images: {
        Row: {
          created_at: string
          id: string
          image_path: string
          previous_work_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          previous_work_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          previous_work_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "previous_work_images_previous_work_id_fkey"
            columns: ["previous_work_id"]
            isOneToOne: false
            referencedRelation: "previous_work"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string | null
          id: string
          viewed_user_id: string
          viewer_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          viewed_user_id: string
          viewer_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          viewed_user_id?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_user_id_fkey"
            columns: ["viewed_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewed_user_id_fkey"
            columns: ["viewed_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewed_user_id_fkey"
            columns: ["viewed_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewed_user_id_fkey"
            columns: ["viewed_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      reliability_events: {
        Row: {
          admin_reviewed: boolean | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          context_window_expires_at: string | null
          contractor_id: string
          contractor_notes: string | null
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          job_id: string
          subcontractor_context: string | null
          subcontractor_context_submitted_at: string | null
          subcontractor_id: string
        }
        Insert: {
          admin_reviewed?: boolean | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          context_window_expires_at?: string | null
          contractor_id: string
          contractor_notes?: string | null
          created_at?: string | null
          event_date?: string
          event_type: string
          id?: string
          job_id: string
          subcontractor_context?: string | null
          subcontractor_context_submitted_at?: string | null
          subcontractor_id: string
        }
        Update: {
          admin_reviewed?: boolean | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          context_window_expires_at?: string | null
          contractor_id?: string
          contractor_notes?: string | null
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          job_id?: string
          subcontractor_context?: string | null
          subcontractor_context_submitted_at?: string | null
          subcontractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reliability_events_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_events_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          communication_score: number | null
          created_at: string | null
          id: string
          is_reliability_review: boolean | null
          job_id: string
          moderation_status: string
          rating: number
          recipient_id: string
          reliability_score: number | null
          reply: Json | null
          text: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          communication_score?: number | null
          created_at?: string | null
          id?: string
          is_reliability_review?: boolean | null
          job_id: string
          moderation_status?: string
          rating: number
          recipient_id: string
          reliability_score?: number | null
          reply?: Json | null
          text: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          communication_score?: number | null
          created_at?: string | null
          id?: string
          is_reliability_review?: boolean | null
          job_id?: string
          moderation_status?: string
          rating?: number
          recipient_id?: string
          reliability_score?: number | null
          reply?: Json | null
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_availability: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          currency: string | null
          event_type: string
          from_plan: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          payment_provider_ref: string | null
          to_plan: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          event_type: string
          from_plan?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_provider_ref?: string | null
          to_plan?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          event_type?: string
          from_plan?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_provider_ref?: string | null
          to_plan?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          lat: number | null
          lng: number | null
          location: string
          postcode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          location: string
          postcode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          location?: string
          postcode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          created_at: string
          id: number
          rater_user_id: string
          target_user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          rater_user_id: string
          target_user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: number
          rater_user_id?: string
          target_user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          category: string
          conversation_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          reported_id: string
          reporter_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          category: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reported_id: string
          reporter_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reported_id?: string
          reporter_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trades: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          trade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          trade: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          trade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          abn: string | null
          abn_last_checked_at: string | null
          abn_rejection_reason: string | null
          abn_status:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at: string | null
          abn_updated_at: string
          abn_verified: boolean
          abn_verified_at: string | null
          abn_verified_by: string | null
          account_flagged_for_review: boolean | null
          account_reviewed: boolean | null
          account_suspended: boolean | null
          active_plan: string | null
          additional_locations: Json | null
          additional_trades: string[] | null
          additional_trades_payment_date: string | null
          additional_trades_unlocked: boolean | null
          alert_channel_email: boolean | null
          alert_channel_sms: boolean | null
          alerts_enabled: boolean | null
          availability: Json | null
          availability_description: string | null
          avatar: string | null
          base_lat: number | null
          base_lng: number | null
          base_postcode: string | null
          base_suburb: string | null
          bio: string | null
          business_name: string | null
          completed_jobs: number | null
          complimentary_premium_until: string | null
          complimentary_reason: string | null
          cover_url: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          entity_type: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_admin: boolean
          is_premium: boolean | null
          is_public_profile: boolean
          last_seen_at: string | null
          lat: number | null
          linkedin: string | null
          lng: number | null
          location: string | null
          location_lat: number | null
          location_lng: number | null
          member_since: string | null
          mini_bio: string | null
          name: string | null
          phone: string | null
          postcode: string | null
          preferred_radius_km: number | null
          premium_until: string | null
          pricing_amount: number | null
          pricing_type: string | null
          primary_trade: string | null
          radius: number | null
          rating: number | null
          receive_trade_alerts: boolean | null
          reliability_rating: number | null
          role: string
          search_lat: number | null
          search_lng: number | null
          search_location: string | null
          search_postcode: string | null
          show_abn_on_profile: boolean
          show_business_name_on_profile: boolean
          show_email_on_profile: boolean
          show_phone_on_profile: boolean
          show_pricing_in_listings: boolean
          show_pricing_on_profile: boolean
          sms_opt_in_prompt_dismissed_at: string | null
          sms_opt_in_prompt_shown: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subcontractor_alert_channel_email: boolean | null
          subcontractor_alert_channel_in_app: boolean | null
          subcontractor_alert_channel_sms: boolean | null
          subcontractor_alerts_enabled: boolean | null
          subcontractor_availability_broadcast_enabled: boolean | null
          subcontractor_availability_horizon_days: number | null
          subcontractor_plan:
            | Database["public"]["Enums"]["subcontractor_plan_type"]
            | null
          subcontractor_preferred_radius_km: number | null
          subcontractor_sub_renews_at: string | null
          subcontractor_sub_status:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subcontractor_work_alert_email: boolean | null
          subcontractor_work_alert_in_app: boolean | null
          subcontractor_work_alert_sms: boolean | null
          subcontractor_work_alerts_enabled: boolean | null
          subscription_canceled_at: string | null
          subscription_renews_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          suspension_ends_at: string | null
          tiktok: string | null
          trades: Json | null
          trust_status: string
          updated_at: string | null
          website: string | null
          youtube: string | null
          profile_strength_score: number
          profile_strength_band: string
          profile_likes_count: number
          website_url: string | null
          instagram_url: string | null
          facebook_url: string | null
          linkedin_url: string | null
          google_business_url: string | null
          google_business_name: string | null
          google_business_address: string | null
          google_place_id: string | null
          google_business_rating: number | null
          google_business_review_count: number | null
          google_rating: number | null
          google_review_count: number | null
          google_rating_verified: boolean
          google_listing_claimed_by_user: boolean
          google_listing_verification_status: string
          google_listing_verified_at: string | null
          google_listing_verification_method: string | null
          google_listing_verified_by: string | null
          google_listing_rejection_reason: string | null
          works_completed_count: number
          jobs_posted_count: number
          works_uploaded_count: number
          profile_completion_score: number
          last_strength_calculated_at: string | null
        }
        Insert: {
          abn?: string | null
          abn_last_checked_at?: string | null
          abn_rejection_reason?: string | null
          abn_status?:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at?: string | null
          abn_updated_at?: string
          abn_verified?: boolean
          abn_verified_at?: string | null
          abn_verified_by?: string | null
          account_flagged_for_review?: boolean | null
          account_reviewed?: boolean | null
          account_suspended?: boolean | null
          active_plan?: string | null
          additional_locations?: Json | null
          additional_trades?: string[] | null
          additional_trades_payment_date?: string | null
          additional_trades_unlocked?: boolean | null
          alert_channel_email?: boolean | null
          alert_channel_sms?: boolean | null
          alerts_enabled?: boolean | null
          availability?: Json | null
          availability_description?: string | null
          avatar?: string | null
          base_lat?: number | null
          base_lng?: number | null
          base_postcode?: string | null
          base_suburb?: string | null
          bio?: string | null
          business_name?: string | null
          completed_jobs?: number | null
          complimentary_premium_until?: string | null
          complimentary_reason?: string | null
          cover_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          entity_type?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_admin?: boolean
          is_premium?: boolean | null
          is_public_profile?: boolean
          last_seen_at?: string | null
          lat?: number | null
          linkedin?: string | null
          lng?: number | null
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          member_since?: string | null
          mini_bio?: string | null
          name?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_radius_km?: number | null
          premium_until?: string | null
          pricing_amount?: number | null
          pricing_type?: string | null
          primary_trade?: string | null
          radius?: number | null
          rating?: number | null
          receive_trade_alerts?: boolean | null
          reliability_rating?: number | null
          role?: string
          search_lat?: number | null
          search_lng?: number | null
          search_location?: string | null
          search_postcode?: string | null
          show_abn_on_profile?: boolean
          show_business_name_on_profile?: boolean
          show_email_on_profile?: boolean
          show_phone_on_profile?: boolean
          show_pricing_in_listings?: boolean
          show_pricing_on_profile?: boolean
          sms_opt_in_prompt_dismissed_at?: string | null
          sms_opt_in_prompt_shown?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subcontractor_alert_channel_email?: boolean | null
          subcontractor_alert_channel_in_app?: boolean | null
          subcontractor_alert_channel_sms?: boolean | null
          subcontractor_alerts_enabled?: boolean | null
          subcontractor_availability_broadcast_enabled?: boolean | null
          subcontractor_availability_horizon_days?: number | null
          subcontractor_plan?:
            | Database["public"]["Enums"]["subcontractor_plan_type"]
            | null
          subcontractor_preferred_radius_km?: number | null
          subcontractor_sub_renews_at?: string | null
          subcontractor_sub_status?:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subcontractor_work_alert_email?: boolean | null
          subcontractor_work_alert_in_app?: boolean | null
          subcontractor_work_alert_sms?: boolean | null
          subcontractor_work_alerts_enabled?: boolean | null
          subscription_canceled_at?: string | null
          subscription_renews_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          suspension_ends_at?: string | null
          tiktok?: string | null
          trades?: Json | null
          trust_status?: string
          updated_at?: string | null
          website?: string | null
          google_business_url?: string | null
          google_business_name?: string | null
          google_business_address?: string | null
          google_place_id?: string | null
          google_business_rating?: number | null
          google_business_review_count?: number | null
          google_rating?: number | null
          google_review_count?: number | null
          google_rating_verified?: boolean
          google_listing_claimed_by_user?: boolean
          google_listing_verification_status?: string
          google_listing_verified_at?: string | null
          google_listing_verification_method?: string | null
          google_listing_verified_by?: string | null
          google_listing_rejection_reason?: string | null
          youtube?: string | null
        }
        Update: {
          abn?: string | null
          abn_last_checked_at?: string | null
          abn_rejection_reason?: string | null
          abn_status?:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at?: string | null
          abn_updated_at?: string
          abn_verified?: boolean
          abn_verified_at?: string | null
          abn_verified_by?: string | null
          account_flagged_for_review?: boolean | null
          account_reviewed?: boolean | null
          account_suspended?: boolean | null
          active_plan?: string | null
          additional_locations?: Json | null
          additional_trades?: string[] | null
          additional_trades_payment_date?: string | null
          additional_trades_unlocked?: boolean | null
          alert_channel_email?: boolean | null
          alert_channel_sms?: boolean | null
          alerts_enabled?: boolean | null
          availability?: Json | null
          availability_description?: string | null
          avatar?: string | null
          base_lat?: number | null
          base_lng?: number | null
          base_postcode?: string | null
          base_suburb?: string | null
          bio?: string | null
          business_name?: string | null
          completed_jobs?: number | null
          complimentary_premium_until?: string | null
          complimentary_reason?: string | null
          cover_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          entity_type?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_admin?: boolean
          is_premium?: boolean | null
          is_public_profile?: boolean
          last_seen_at?: string | null
          lat?: number | null
          linkedin?: string | null
          lng?: number | null
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          member_since?: string | null
          mini_bio?: string | null
          name?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_radius_km?: number | null
          premium_until?: string | null
          pricing_amount?: number | null
          pricing_type?: string | null
          primary_trade?: string | null
          radius?: number | null
          rating?: number | null
          receive_trade_alerts?: boolean | null
          reliability_rating?: number | null
          role?: string
          search_lat?: number | null
          search_lng?: number | null
          search_location?: string | null
          search_postcode?: string | null
          show_abn_on_profile?: boolean
          show_business_name_on_profile?: boolean
          show_email_on_profile?: boolean
          show_phone_on_profile?: boolean
          show_pricing_in_listings?: boolean
          show_pricing_on_profile?: boolean
          sms_opt_in_prompt_dismissed_at?: string | null
          sms_opt_in_prompt_shown?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subcontractor_alert_channel_email?: boolean | null
          subcontractor_alert_channel_in_app?: boolean | null
          subcontractor_alert_channel_sms?: boolean | null
          subcontractor_alerts_enabled?: boolean | null
          subcontractor_availability_broadcast_enabled?: boolean | null
          subcontractor_availability_horizon_days?: number | null
          subcontractor_plan?:
            | Database["public"]["Enums"]["subcontractor_plan_type"]
            | null
          subcontractor_preferred_radius_km?: number | null
          subcontractor_sub_renews_at?: string | null
          subcontractor_sub_status?:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subcontractor_work_alert_email?: boolean | null
          subcontractor_work_alert_in_app?: boolean | null
          subcontractor_work_alert_sms?: boolean | null
          subcontractor_work_alerts_enabled?: boolean | null
          subscription_canceled_at?: string | null
          subscription_renews_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          suspension_ends_at?: string | null
          tiktok?: string | null
          trades?: Json | null
          trust_status?: string
          updated_at?: string | null
          website?: string | null
          google_business_url?: string | null
          google_business_name?: string | null
          google_business_address?: string | null
          google_place_id?: string | null
          google_business_rating?: number | null
          google_business_review_count?: number | null
          google_rating?: number | null
          google_review_count?: number | null
          google_rating_verified?: boolean
          google_listing_claimed_by_user?: boolean
          google_listing_verification_status?: string
          google_listing_verified_at?: string | null
          google_listing_verification_method?: string | null
          google_listing_verified_by?: string | null
          google_listing_rejection_reason?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_profile_directory: {
        Row: {
          abn: string | null
          abn_status:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_verified_at: string | null
          avatar: string | null
          bio: string | null
          business_name: string | null
          completed_jobs: number | null
          complimentary_premium_until: string | null
          cover_url: string | null
          facebook: string | null
          id: string | null
          instagram: string | null
          is_public_profile: boolean | null
          linkedin: string | null
          location: string | null
          member_since: string | null
          mini_bio: string | null
          name: string | null
          postcode: string | null
          premium_expires_at: string | null
          premium_now: boolean | null
          premium_until: string | null
          rating: number | null
          reliability_rating: number | null
          role: string | null
          subcontractor_sub_status:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subscription_status: string | null
          tiktok: string | null
          trades: Json | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          abn?: never
          abn_status?:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_verified_at?: string | null
          avatar?: string | null
          bio?: string | null
          business_name?: never
          completed_jobs?: number | null
          complimentary_premium_until?: string | null
          cover_url?: string | null
          facebook?: string | null
          id?: string | null
          instagram?: string | null
          is_public_profile?: boolean | null
          linkedin?: string | null
          location?: string | null
          member_since?: string | null
          mini_bio?: string | null
          name?: string | null
          postcode?: string | null
          premium_expires_at?: never
          premium_now?: never
          premium_until?: string | null
          rating?: number | null
          reliability_rating?: number | null
          role?: string | null
          subcontractor_sub_status?:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subscription_status?: string | null
          tiktok?: string | null
          trades?: Json | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          abn?: never
          abn_status?:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_verified_at?: string | null
          avatar?: string | null
          bio?: string | null
          business_name?: never
          completed_jobs?: number | null
          complimentary_premium_until?: string | null
          cover_url?: string | null
          facebook?: string | null
          id?: string | null
          instagram?: string | null
          is_public_profile?: boolean | null
          linkedin?: string | null
          location?: string | null
          member_since?: string | null
          mini_bio?: string | null
          name?: string | null
          postcode?: string | null
          premium_expires_at?: never
          premium_now?: never
          premium_until?: string | null
          rating?: number | null
          reliability_rating?: number | null
          role?: string | null
          subcontractor_sub_status?:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subscription_status?: string | null
          tiktok?: string | null
          trades?: Json | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      public_profile_directory_with_ratings: {
        Row: {
          abn: string | null
          abn_status:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_verified_at: string | null
          avatar: string | null
          bio: string | null
          business_name: string | null
          completed_jobs: number | null
          complimentary_premium_until: string | null
          cover_url: string | null
          down_count: number | null
          facebook: string | null
          id: string | null
          instagram: string | null
          is_public_profile: boolean | null
          linkedin: string | null
          location: string | null
          member_since: string | null
          mini_bio: string | null
          name: string | null
          postcode: string | null
          premium_expires_at: string | null
          premium_now: boolean | null
          premium_until: string | null
          rating: number | null
          rating_avg: number | null
          rating_count: number | null
          reliability_rating: number | null
          role: string | null
          subcontractor_sub_status:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subscription_status: string | null
          tiktok: string | null
          trades: Json | null
          up_count: number | null
          website: string | null
          youtube: string | null
        }
        Relationships: []
      }
      user_rating_aggregates: {
        Row: {
          down_count: number | null
          rating_avg: number | null
          rating_count: number | null
          target_user_id: string | null
          up_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_directory_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      users_with_ratings: {
        Row: {
          abn: string | null
          abn_rejection_reason: string | null
          abn_status:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at: string | null
          abn_updated_at: string | null
          abn_verified: boolean | null
          abn_verified_at: string | null
          abn_verified_by: string | null
          account_flagged_for_review: boolean | null
          account_reviewed: boolean | null
          account_suspended: boolean | null
          active_plan: string | null
          additional_trades: string[] | null
          additional_trades_payment_date: string | null
          additional_trades_unlocked: boolean | null
          alert_channel_email: boolean | null
          alert_channel_sms: boolean | null
          alerts_enabled: boolean | null
          availability: Json | null
          availability_description: string | null
          avatar: string | null
          base_lat: number | null
          base_lng: number | null
          base_postcode: string | null
          base_suburb: string | null
          bio: string | null
          business_name: string | null
          completed_jobs: number | null
          complimentary_premium_until: string | null
          complimentary_reason: string | null
          cover_url: string | null
          created_at: string | null
          deleted_at: string | null
          down_count: number | null
          email: string | null
          facebook: string | null
          id: string | null
          instagram: string | null
          is_admin: boolean | null
          is_premium: boolean | null
          is_public_profile: boolean | null
          last_seen_at: string | null
          lat: number | null
          linkedin: string | null
          lng: number | null
          location: string | null
          location_lat: number | null
          location_lng: number | null
          member_since: string | null
          mini_bio: string | null
          name: string | null
          phone: string | null
          postcode: string | null
          preferred_radius_km: number | null
          premium_until: string | null
          primary_trade: string | null
          radius: number | null
          rating: number | null
          rating_avg: number | null
          rating_count: number | null
          reliability_rating: number | null
          role: string | null
          search_lat: number | null
          search_lng: number | null
          search_location: string | null
          search_postcode: string | null
          show_abn_on_profile: boolean | null
          show_business_name_on_profile: boolean | null
          show_email_on_profile: boolean | null
          show_phone_on_profile: boolean | null
          sms_opt_in_prompt_dismissed_at: string | null
          sms_opt_in_prompt_shown: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subcontractor_alert_channel_email: boolean | null
          subcontractor_alert_channel_in_app: boolean | null
          subcontractor_alert_channel_sms: boolean | null
          subcontractor_alerts_enabled: boolean | null
          subcontractor_availability_broadcast_enabled: boolean | null
          subcontractor_availability_horizon_days: number | null
          subcontractor_plan:
            | Database["public"]["Enums"]["subcontractor_plan_type"]
            | null
          subcontractor_preferred_radius_km: number | null
          subcontractor_sub_renews_at: string | null
          subcontractor_sub_status:
            | Database["public"]["Enums"]["subcontractor_subscription_status"]
            | null
          subcontractor_work_alert_email: boolean | null
          subcontractor_work_alert_in_app: boolean | null
          subcontractor_work_alert_sms: boolean | null
          subcontractor_work_alerts_enabled: boolean | null
          subscription_canceled_at: string | null
          subscription_renews_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          suspension_ends_at: string | null
          tiktok: string | null
          trades: Json | null
          trust_status: string | null
          up_count: number | null
          updated_at: string | null
          website: string | null
          youtube: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_email_exists: { Args: { check_email: string }; Returns: boolean }
      get_jobs_visible_to_viewer: {
        Args: {
          limit_count?: number
          offset_count?: number
          trade_filter?: string
          viewer_id: string
        }
        Returns: {
          attachments: Json
          contractor_id: string
          created_at: string
          dates: Json
          description: string
          distance_km: number
          duration: number
          id: string
          location: string
          location_lat: number
          location_lng: number
          pay_type: string
          postcode: string
          rate: number
          start_time: string
          status: string
          title: string
          trade_category: string
          viewer_radius_km: number
        }[]
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_premium_discovery: { Args: { uid: string }; Returns: boolean }
      is_premium_user: { Args: { uid: string }; Returns: boolean }
      km_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      update_user_trades: {
        Args: { p_primary_trade: string; p_trades: string[]; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      abn_verification_status:
        | "UNVERIFIED"
        | "PENDING"
        | "VERIFIED"
        | "REJECTED"
      subcontractor_plan_type: "NONE" | "PRO_10"
      subcontractor_subscription_status:
        | "NONE"
        | "ACTIVE"
        | "PAST_DUE"
        | "CANCELED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      abn_verification_status: [
        "UNVERIFIED",
        "PENDING",
        "VERIFIED",
        "REJECTED",
      ],
      subcontractor_plan_type: ["NONE", "PRO_10"],
      subcontractor_subscription_status: [
        "NONE",
        "ACTIVE",
        "PAST_DUE",
        "CANCELED",
      ],
    },
  },
} as const
