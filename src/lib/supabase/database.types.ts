export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          name: string | null
          role: string | null
          trust_status: string | null
          avatar: string | null
          bio: string | null
          rating: number | null
          reliability_rating: number | null
          builder_plan: string | null
          builder_free_trial_tender_used: boolean | null
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          role?: string | null
          trust_status?: string | null
          avatar?: string | null
          bio?: string | null
          rating?: number | null
          reliability_rating?: number | null
          builder_plan?: string | null
          builder_free_trial_tender_used?: boolean | null
        }
        Update: {
          email?: string | null
          name?: string | null
          role?: string | null
          trust_status?: string | null
          avatar?: string | null
          bio?: string | null
          rating?: number | null
          reliability_rating?: number | null
          builder_plan?: string | null
          builder_free_trial_tender_used?: boolean | null
        }
        Relationships: []
      }

      tenders: {
        Row: {
          id: string
          builder_id: string
          status: string
          tier: string
          is_name_hidden: boolean
          project_name: string
          project_description: string
          suburb: string
          postcode: string
        }
        Insert: {
          id?: string
          builder_id: string
          status: string
          tier: string
          is_name_hidden: boolean
          project_name: string
          project_description: string
          suburb: string
          postcode: string
        }
        Update: {
          builder_id?: string
          status?: string
          tier?: string
          is_name_hidden?: boolean
          project_name?: string
          project_description?: string
          suburb?: string
          postcode?: string
        }
        Relationships: []
      }

      tender_trade_requirements: {
        Row: {
          id: string
          tender_id: string
          trade: string
          sub_description: string | null
          min_budget_cents: number | null
          max_budget_cents: number | null
        }
        Insert: {
          id?: string
          tender_id: string
          trade: string
          sub_description?: string | null
          min_budget_cents?: number | null
          max_budget_cents?: number | null
        }
        Update: {
          tender_id?: string
          trade?: string
          sub_description?: string | null
          min_budget_cents?: number | null
          max_budget_cents?: number | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
};
