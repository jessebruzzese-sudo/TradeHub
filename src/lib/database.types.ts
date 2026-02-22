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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_account_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            foreignKeyName: "admin_review_cases_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contractor_id: string
          created_at: string | null
          id: string
          job_id: string
          subcontractor_id: string
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          id?: string
          job_id: string
          subcontractor_id: string
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          subcontractor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
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
          description: string
          duration: number | null
          fulfilled: boolean | null
          fulfillment_marked_at: string | null
          fulfillment_marked_by: string | null
          id: string
          location: string
          pay_type: string
          postcode: string
          rate: number
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
          description: string
          duration?: number | null
          fulfilled?: boolean | null
          fulfillment_marked_at?: string | null
          fulfillment_marked_by?: string | null
          id?: string
          location: string
          pay_type: string
          postcode: string
          rate: number
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
          description?: string
          duration?: number | null
          fulfilled?: boolean | null
          fulfillment_marked_at?: string | null
          fulfillment_marked_by?: string | null
          id?: string
          location?: string
          pay_type?: string
          postcode?: string
          rate?: number
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
            referencedRelation: "users"
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
            foreignKeyName: "jobs_confirmed_subcontractor_fkey"
            columns: ["confirmed_subcontractor"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "jobs_fulfillment_marked_by_fkey"
            columns: ["fulfillment_marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_selected_subcontractor_fkey"
            columns: ["selected_subcontractor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          conversation_id: string | null
          created_at: string | null
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          viewed_user_id: string
          viewer_user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          viewed_user_id: string
          viewer_user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          viewed_user_id?: string
          viewer_user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_user_id_fkey"
            columns: ["viewed_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          tender_id: string
          trade: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          tender_id: string
          trade?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          tender_id?: string
          trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_quotes: {
        Row: {
          billing_mode: string
          billing_month_key: string
          contractor_id: string
          created_at: string | null
          id: string
          notes: string | null
          price_cents: number
          status: string
          submitted_at: string | null
          tender_id: string
        }
        Insert: {
          billing_mode: string
          billing_month_key: string
          contractor_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          price_cents: number
          status?: string
          submitted_at?: string | null
          tender_id: string
        }
        Update: {
          billing_mode?: string
          billing_month_key?: string
          contractor_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          price_cents?: number
          status?: string
          submitted_at?: string | null
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_quotes_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_trade_requirements: {
        Row: {
          created_at: string | null
          documents: Json | null
          id: string
          links: Json | null
          max_budget_cents: number | null
          min_budget_cents: number | null
          sub_description: string
          tender_id: string
          trade: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          documents?: Json | null
          id?: string
          links?: Json | null
          max_budget_cents?: number | null
          min_budget_cents?: number | null
          sub_description: string
          tender_id: string
          trade: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          documents?: Json | null
          id?: string
          links?: Json | null
          max_budget_cents?: number | null
          min_budget_cents?: number | null
          sub_description?: string
          tender_id?: string
          trade?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_trade_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_trades: {
        Row: {
          id: string
          tender_id: string
          trade_name: string
          trade_slug: string
        }
        Insert: {
          id?: string
          tender_id: string
          trade_name: string
          trade_slug: string
        }
        Update: {
          id?: string
          tender_id?: string
          trade_name?: string
          trade_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_trades_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          admin_notes: string | null
          approval_reason: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          budget_max_cents: number | null
          budget_min_cents: number | null
          builder_id: string
          closes_at: string | null
          created_at: string | null
          desired_end_date: string | null
          desired_start_date: string | null
          id: string
          is_guest_tender: boolean | null
          is_name_hidden: boolean | null
          lat: number
          limited_quotes_enabled: boolean | null
          lng: number
          postcode: string
          project_description: string | null
          project_name: string
          quote_cap_total: number | null
          quote_count_total: number | null
          rejection_reason: string | null
          status: string
          suburb: string
          tier: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_reason?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          builder_id: string
          closes_at?: string | null
          created_at?: string | null
          desired_end_date?: string | null
          desired_start_date?: string | null
          id?: string
          is_guest_tender?: boolean | null
          is_name_hidden?: boolean | null
          lat: number
          limited_quotes_enabled?: boolean | null
          lng: number
          postcode: string
          project_description?: string | null
          project_name: string
          quote_cap_total?: number | null
          quote_count_total?: number | null
          rejection_reason?: string | null
          status?: string
          suburb: string
          tier: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_reason?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          builder_id?: string
          closes_at?: string | null
          created_at?: string | null
          desired_end_date?: string | null
          desired_start_date?: string | null
          id?: string
          is_guest_tender?: boolean | null
          is_name_hidden?: boolean | null
          lat?: number
          limited_quotes_enabled?: boolean | null
          lng?: number
          postcode?: string
          project_description?: string | null
          project_name?: string
          quote_cap_total?: number | null
          quote_count_total?: number | null
          rejection_reason?: string | null
          status?: string
          suburb?: string
          tier?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          abn: string | null
          abn_rejection_reason: string | null
          abn_status:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at: string | null
          abn_updated_at: string
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
          builder_free_trial_tender_used: boolean | null
          builder_plan: string | null
          builder_sub_renews_at: string | null
          builder_sub_status: string | null
          business_name: string | null
          completed_jobs: number | null
          complimentary_premium_until: string | null
          complimentary_reason: string | null
          contractor_plan: string | null
          contractor_sub_renews_at: string | null
          contractor_sub_status: string | null
          created_at: string | null
          email: string
          free_quote_month_key: string | null
          free_quote_used_count: number | null
          id: string
          is_premium: boolean | null
          is_public_profile: boolean
          last_seen_at: string | null
          location: string | null
          location_lat: number | null
          location_lng: number | null
          member_since: string | null
          name: string
          postcode: string | null
          preferred_radius_km: number | null
          premium_until: string | null
          primary_trade: string | null
          radius: number | null
          rating: number | null
          reliability_rating: number | null
          role: string
          search_lat: number | null
          search_lng: number | null
          search_location: string | null
          search_postcode: string | null
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
          trades: Json | null
          trust_status: string
          updated_at: string | null
        }
        Insert: {
          abn?: string | null
          abn_rejection_reason?: string | null
          abn_status?:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at?: string | null
          abn_updated_at?: string
          abn_verified_at?: string | null
          abn_verified_by?: string | null
          account_flagged_for_review?: boolean | null
          account_reviewed?: boolean | null
          account_suspended?: boolean | null
          active_plan?: string | null
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
          builder_free_trial_tender_used?: boolean | null
          builder_plan?: string | null
          builder_sub_renews_at?: string | null
          builder_sub_status?: string | null
          business_name?: string | null
          completed_jobs?: number | null
          complimentary_premium_until?: string | null
          complimentary_reason?: string | null
          contractor_plan?: string | null
          contractor_sub_renews_at?: string | null
          contractor_sub_status?: string | null
          created_at?: string | null
          email: string
          free_quote_month_key?: string | null
          free_quote_used_count?: number | null
          id?: string
          is_premium?: boolean | null
          is_public_profile?: boolean
          last_seen_at?: string | null
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          member_since?: string | null
          name: string
          postcode?: string | null
          preferred_radius_km?: number | null
          premium_until?: string | null
          primary_trade?: string | null
          radius?: number | null
          rating?: number | null
          reliability_rating?: number | null
          role: string
          search_lat?: number | null
          search_lng?: number | null
          search_location?: string | null
          search_postcode?: string | null
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
          trades?: Json | null
          trust_status?: string
          updated_at?: string | null
        }
        Update: {
          abn?: string | null
          abn_rejection_reason?: string | null
          abn_status?:
            | Database["public"]["Enums"]["abn_verification_status"]
            | null
          abn_submitted_at?: string | null
          abn_updated_at?: string
          abn_verified_at?: string | null
          abn_verified_by?: string | null
          account_flagged_for_review?: boolean | null
          account_reviewed?: boolean | null
          account_suspended?: boolean | null
          active_plan?: string | null
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
          builder_free_trial_tender_used?: boolean | null
          builder_plan?: string | null
          builder_sub_renews_at?: string | null
          builder_sub_status?: string | null
          business_name?: string | null
          completed_jobs?: number | null
          complimentary_premium_until?: string | null
          complimentary_reason?: string | null
          contractor_plan?: string | null
          contractor_sub_renews_at?: string | null
          contractor_sub_status?: string | null
          created_at?: string | null
          email?: string
          free_quote_month_key?: string | null
          free_quote_used_count?: number | null
          id?: string
          is_premium?: boolean | null
          is_public_profile?: boolean
          last_seen_at?: string | null
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          member_since?: string | null
          name?: string
          postcode?: string | null
          preferred_radius_km?: number | null
          premium_until?: string | null
          primary_trade?: string | null
          radius?: number | null
          rating?: number | null
          reliability_rating?: number | null
          role?: string
          search_lat?: number | null
          search_lng?: number | null
          search_location?: string | null
          search_postcode?: string | null
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
          trades?: Json | null
          trust_status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: { Args: { check_email: string }; Returns: boolean }
      is_premium_user: { Args: { uid: string }; Returns: boolean }
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
