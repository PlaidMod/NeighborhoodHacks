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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_queue: {
        Row: {
          id: string
          item_id: string | null
          rule: string
          scheduled_for: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id?: string | null
          rule: string
          scheduled_for: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string | null
          rule?: string
          scheduled_for?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts_sent: {
        Row: {
          id: string
          item_id: string | null
          rule: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id?: string | null
          rule: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string | null
          rule?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_sent_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_sent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ballot_offices: {
        Row: {
          body_id: string | null
          holder_name: string | null
          id: string
          next_election_date: string | null
          office_name: string | null
          source_url: string | null
        }
        Insert: {
          body_id?: string | null
          holder_name?: string | null
          id?: string
          next_election_date?: string | null
          office_name?: string | null
          source_url?: string | null
        }
        Update: {
          body_id?: string | null
          holder_name?: string | null
          id?: string
          next_election_date?: string | null
          office_name?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ballot_offices_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      bodies: {
        Row: {
          category: string
          description_en: string | null
          description_es: string | null
          elected_or_appointed: string | null
          id: string
          impact_rank: number | null
          meeting_info_url: string | null
          name: string
          operations_by_body_id: string | null
          operator_name: string | null
          regulated_by: string | null
          sms_eligible: boolean
          tax_set_by_body_id: string | null
          type: string | null
        }
        Insert: {
          category: string
          description_en?: string | null
          description_es?: string | null
          elected_or_appointed?: string | null
          id: string
          impact_rank?: number | null
          meeting_info_url?: string | null
          name: string
          operations_by_body_id?: string | null
          operator_name?: string | null
          regulated_by?: string | null
          sms_eligible?: boolean
          tax_set_by_body_id?: string | null
          type?: string | null
        }
        Update: {
          category?: string
          description_en?: string | null
          description_es?: string | null
          elected_or_appointed?: string | null
          id?: string
          impact_rank?: number | null
          meeting_info_url?: string | null
          name?: string
          operations_by_body_id?: string | null
          operator_name?: string | null
          regulated_by?: string | null
          sms_eligible?: boolean
          tax_set_by_body_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bodies_operations_by_body_id_fkey"
            columns: ["operations_by_body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bodies_tax_set_by_body_id_fkey"
            columns: ["tax_set_by_body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      boundaries: {
        Row: {
          body_id: string
          geom: unknown
          id: string
        }
        Insert: {
          body_id: string
          geom: unknown
          id?: string
        }
        Update: {
          body_id?: string
          geom?: unknown
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boundaries_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          body_id: string | null
          date: string | null
          id: string
          source_url: string | null
          type: string | null
        }
        Insert: {
          body_id?: string | null
          date?: string | null
          id?: string
          source_url?: string | null
          type?: string | null
        }
        Update: {
          body_id?: string | null
          date?: string | null
          id?: string
          source_url?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_cache: {
        Row: {
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          key: string
          payload: Json
          updated_at?: string
        }
        Update: {
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content_hash: string | null
          fetched_at: string
          id: string
          kind: string | null
          meeting_external_id: string | null
          raw: string | null
          source_id: string | null
          url: string | null
        }
        Insert: {
          content_hash?: string | null
          fetched_at?: string
          id?: string
          kind?: string | null
          meeting_external_id?: string | null
          raw?: string | null
          source_id?: string | null
          url?: string | null
        }
        Update: {
          content_hash?: string | null
          fetched_at?: string
          id?: string
          kind?: string | null
          meeting_external_id?: string | null
          raw?: string | null
          source_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          body_id: string | null
          date: string | null
          id: string
          registered_voters: number | null
          result: string | null
          source_url: string | null
          type: string | null
          votes_cast: number | null
        }
        Insert: {
          body_id?: string | null
          date?: string | null
          id?: string
          registered_voters?: number | null
          result?: string | null
          source_url?: string | null
          type?: string | null
          votes_cast?: number | null
        }
        Update: {
          body_id?: string | null
          date?: string | null
          id?: string
          registered_voters?: number | null
          result?: string | null
          source_url?: string | null
          type?: string | null
          votes_cast?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elections_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      hcad_jurisdictions: {
        Row: {
          account: string
          hcad_code: string
        }
        Insert: {
          account: string
          hcad_code: string
        }
        Update: {
          account?: string
          hcad_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "hcad_jurisdictions_account_fkey"
            columns: ["account"]
            isOneToOne: false
            referencedRelation: "hcad_parcels"
            referencedColumns: ["account"]
          },
        ]
      }
      hcad_parcels: {
        Row: {
          account: string
          centroid: unknown
          legal_description: string | null
          site_address_norm: string
        }
        Insert: {
          account: string
          centroid?: unknown
          legal_description?: string | null
          site_address_norm: string
        }
        Update: {
          account?: string
          centroid?: unknown
          legal_description?: string | null
          site_address_norm?: string
        }
        Relationships: []
      }
      hoa_corrections: {
        Row: {
          created_at: string
          id: string
          subdivision_name: string | null
          suggested_hoa_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          subdivision_name?: string | null
          suggested_hoa_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          subdivision_name?: string | null
          suggested_hoa_name?: string | null
        }
        Relationships: []
      }
      hoa_matches: {
        Row: {
          filing_date: string | null
          hoa_body_id: string | null
          id: string
          last_checked: string | null
          master_hoa_body_id: string | null
          source_url: string | null
          subdivision_name: string
          verified: boolean
        }
        Insert: {
          filing_date?: string | null
          hoa_body_id?: string | null
          id?: string
          last_checked?: string | null
          master_hoa_body_id?: string | null
          source_url?: string | null
          subdivision_name: string
          verified?: boolean
        }
        Update: {
          filing_date?: string | null
          hoa_body_id?: string | null
          id?: string
          last_checked?: string | null
          master_hoa_body_id?: string | null
          source_url?: string | null
          subdivision_name?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hoa_matches_hoa_body_id_fkey"
            columns: ["hoa_body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoa_matches_master_hoa_body_id_fkey"
            columns: ["master_hoa_body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      item_perspectives: {
        Row: {
          articles_hash: string
          dropped_count: number
          extract_model: string | null
          frozen_at: string
          generated_at: string
          groups: Json
          item_id: string
          judge_model: string | null
          one_sided: boolean
          outlet_count: number
          sources: Json
          state: string
        }
        Insert: {
          articles_hash: string
          dropped_count?: number
          extract_model?: string | null
          frozen_at: string
          generated_at?: string
          groups?: Json
          item_id: string
          judge_model?: string | null
          one_sided?: boolean
          outlet_count?: number
          sources?: Json
          state: string
        }
        Update: {
          articles_hash?: string
          dropped_count?: number
          extract_model?: string | null
          frozen_at?: string
          generated_at?: string
          groups?: Json
          item_id?: string
          judge_model?: string | null
          one_sided?: boolean
          outlet_count?: number
          sources?: Json
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_perspectives_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          action: string | null
          agenda_number: string | null
          amounts: Json
          attachments: Json
          body_id: string | null
          contains_private_person: boolean
          content_hash: string | null
          description: string | null
          external_id: string
          first_seen_at: string
          id: string
          is_demo: boolean
          item_type: string | null
          matter_type: string | null
          meeting_body_id: string | null
          meeting_id: string | null
          needs_story: boolean
          quote_verified: boolean | null
          removed_at: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_fired: string | null
          section: string | null
          source_id: string
          source_quote: string | null
          source_url: string
          status: string
          story_en: Json | null
          story_es: Json | null
          story_source: string | null
          tier: string | null
          title: string
          vote_result: string | null
        }
        Insert: {
          action?: string | null
          agenda_number?: string | null
          amounts?: Json
          attachments?: Json
          body_id?: string | null
          contains_private_person?: boolean
          content_hash?: string | null
          description?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          is_demo?: boolean
          item_type?: string | null
          matter_type?: string | null
          meeting_body_id?: string | null
          meeting_id?: string | null
          needs_story?: boolean
          quote_verified?: boolean | null
          removed_at?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_fired?: string | null
          section?: string | null
          source_id: string
          source_quote?: string | null
          source_url: string
          status: string
          story_en?: Json | null
          story_es?: Json | null
          story_source?: string | null
          tier?: string | null
          title: string
          vote_result?: string | null
        }
        Update: {
          action?: string | null
          agenda_number?: string | null
          amounts?: Json
          attachments?: Json
          body_id?: string | null
          contains_private_person?: boolean
          content_hash?: string | null
          description?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          is_demo?: boolean
          item_type?: string | null
          matter_type?: string | null
          meeting_body_id?: string | null
          meeting_id?: string | null
          needs_story?: boolean
          quote_verified?: boolean | null
          removed_at?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_fired?: string | null
          section?: string | null
          source_id?: string
          source_quote?: string | null
          source_url?: string
          status?: string
          story_en?: Json | null
          story_es?: Json | null
          story_source?: string | null
          tier?: string | null
          title?: string
          vote_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_meeting_body_id_fkey"
            columns: ["meeting_body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_map: {
        Row: {
          body_id: string
          hcad_code: string
        }
        Insert: {
          body_id: string
          hcad_code: string
        }
        Update: {
          body_id?: string
          hcad_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisdiction_map_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda_url: string | null
          body_id: string | null
          comment_rules_text: string | null
          content_hash: string | null
          date: string
          end_date: string | null
          external_id: string
          id: string
          is_demo: boolean
          last_results_check: string | null
          minutes_url: string | null
          previous_date: string | null
          source_id: string
          source_url_es: string | null
          status: string
          type: string | null
          video_url: string | null
        }
        Insert: {
          agenda_url?: string | null
          body_id?: string | null
          comment_rules_text?: string | null
          content_hash?: string | null
          date: string
          end_date?: string | null
          external_id: string
          id?: string
          is_demo?: boolean
          last_results_check?: string | null
          minutes_url?: string | null
          previous_date?: string | null
          source_id: string
          source_url_es?: string | null
          status?: string
          type?: string | null
          video_url?: string | null
        }
        Update: {
          agenda_url?: string | null
          body_id?: string | null
          comment_rules_text?: string | null
          content_hash?: string | null
          date?: string
          end_date?: string | null
          external_id?: string
          id?: string
          is_demo?: boolean
          last_results_check?: string | null
          minutes_url?: string | null
          previous_date?: string | null
          source_id?: string
          source_url_es?: string | null
          status?: string
          type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_mention_bodies: {
        Row: {
          body_id: string
          mention_id: string
        }
        Insert: {
          body_id: string
          mention_id: string
        }
        Update: {
          body_id?: string
          mention_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_mention_bodies_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_mention_bodies_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "news_mentions"
            referencedColumns: ["id"]
          },
        ]
      }
      news_mention_items: {
        Row: {
          item_id: string
          linked_at: string
          mention_id: string
          score: number | null
        }
        Insert: {
          item_id: string
          linked_at?: string
          mention_id: string
          score?: number | null
        }
        Update: {
          item_id?: string
          linked_at?: string
          mention_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_mention_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_mention_items_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "news_mentions"
            referencedColumns: ["id"]
          },
        ]
      }
      news_mentions: {
        Row: {
          external_id: string
          fetched_at: string
          forward_looking: boolean | null
          headline: string | null
          id: string
          matched_terms: string[] | null
          outlet: string | null
          published_at: string | null
          url: string | null
        }
        Insert: {
          external_id: string
          fetched_at?: string
          forward_looking?: boolean | null
          headline?: string | null
          id?: string
          matched_terms?: string[] | null
          outlet?: string | null
          published_at?: string | null
          url?: string | null
        }
        Update: {
          external_id?: string
          fetched_at?: string
          forward_looking?: boolean | null
          headline?: string | null
          id?: string
          matched_terms?: string[] | null
          outlet?: string | null
          published_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      p2_notices: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body_id: string | null
          created_at: string
          id: string
          item_id: string | null
          kind: string
          payload: Json | null
          source_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          kind: string
          payload?: Json | null
          source_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          kind?: string
          payload?: Json | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2_notices_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2_notices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2_notices_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          actual_types: string[]
          created_at: string
          id: string
          selected_types: string[]
        }
        Insert: {
          actual_types: string[]
          created_at?: string
          id?: string
          selected_types: string[]
        }
        Update: {
          actual_types?: string[]
          created_at?: string
          id?: string
          selected_types?: string[]
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      registration_methods: {
        Row: {
          agenda_only: boolean | null
          body_id: string
          channel: string
          closes_rule: Json | null
          confirmation_type: string | null
          email: string | null
          handouts_accepted: boolean | null
          id: string
          last_verified: string | null
          meeting_type: string | null
          minutes_per_speaker: number | null
          opens_rule: Json | null
          phone: string | null
          policy_url: string | null
          priority_groups: string[] | null
          reduced_minutes_rule: Json | null
          remote_allowed: boolean | null
          required_fields: Json
          translation_request_rule: string | null
          url: string | null
          word_limit_subject: number | null
        }
        Insert: {
          agenda_only?: boolean | null
          body_id: string
          channel: string
          closes_rule?: Json | null
          confirmation_type?: string | null
          email?: string | null
          handouts_accepted?: boolean | null
          id?: string
          last_verified?: string | null
          meeting_type?: string | null
          minutes_per_speaker?: number | null
          opens_rule?: Json | null
          phone?: string | null
          policy_url?: string | null
          priority_groups?: string[] | null
          reduced_minutes_rule?: Json | null
          remote_allowed?: boolean | null
          required_fields?: Json
          translation_request_rule?: string | null
          url?: string | null
          word_limit_subject?: number | null
        }
        Update: {
          agenda_only?: boolean | null
          body_id?: string
          channel?: string
          closes_rule?: Json | null
          confirmation_type?: string | null
          email?: string | null
          handouts_accepted?: boolean | null
          id?: string
          last_verified?: string | null
          meeting_type?: string | null
          minutes_per_speaker?: number | null
          opens_rule?: Json | null
          phone?: string | null
          policy_url?: string | null
          priority_groups?: string[] | null
          reduced_minutes_rule?: Json | null
          remote_allowed?: boolean | null
          required_fields?: Json
          translation_request_rule?: string | null
          url?: string | null
          word_limit_subject?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_methods_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          adapter: string
          body_id: string | null
          comment_rules_hash: string | null
          comment_rules_text: string | null
          config: Json
          expected_max_gap_days: number | null
          id: string
          last_checked: string | null
          last_error: string | null
          last_flags: string[]
          last_success: string | null
          results_max_days: number
        }
        Insert: {
          adapter: string
          body_id?: string | null
          comment_rules_hash?: string | null
          comment_rules_text?: string | null
          config?: Json
          expected_max_gap_days?: number | null
          id: string
          last_checked?: string | null
          last_error?: string | null
          last_flags?: string[]
          last_success?: string | null
          results_max_days?: number
        }
        Update: {
          adapter?: string
          body_id?: string | null
          comment_rules_hash?: string | null
          comment_rules_text?: string | null
          config?: Json
          expected_max_gap_days?: number | null
          id?: string
          last_checked?: string | null
          last_error?: string | null
          last_flags?: string[]
          last_success?: string | null
          results_max_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "sources_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          adopted_rate: number | null
          body_id: string
          last_vote_date: string | null
          no_new_revenue_rate: number | null
          source_url: string | null
          voter_approval_rate: number | null
          year: number
        }
        Insert: {
          adopted_rate?: number | null
          body_id: string
          last_vote_date?: string | null
          no_new_revenue_rate?: number | null
          source_url?: string | null
          voter_approval_rate?: number | null
          year: number
        }
        Update: {
          adopted_rate?: number | null
          body_id?: string
          last_vote_date?: string | null
          no_new_revenue_rate?: number | null
          source_url?: string | null
          voter_approval_rate?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bodies: {
        Row: {
          body_id: string
          user_id: string
        }
        Insert: {
          body_id: string
          user_id: string
        }
        Update: {
          body_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bodies_body_id_fkey"
            columns: ["body_id"]
            isOneToOne: false
            referencedRelation: "bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bodies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address_point: unknown
          id: string
          is_minor: boolean
          language: string
          parent_consent: boolean
          phone: string | null
          phone_verified: boolean
          push_auth: string | null
          push_endpoint: string | null
          push_p256dh: string | null
          sms_opted_out: boolean
          stakes: string[]
        }
        Insert: {
          address_point?: unknown
          id?: string
          is_minor?: boolean
          language?: string
          parent_consent?: boolean
          phone?: string | null
          phone_verified?: boolean
          push_auth?: string | null
          push_endpoint?: string | null
          push_p256dh?: string | null
          sms_opted_out?: boolean
          stakes?: string[]
        }
        Update: {
          address_point?: unknown
          id?: string
          is_minor?: boolean
          language?: string
          parent_consent?: boolean
          phone?: string | null
          phone_verified?: boolean
          push_auth?: string | null
          push_endpoint?: string | null
          push_p256dh?: string | null
          sms_opted_out?: boolean
          stakes?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_rate_limit: {
        Args: { p_key: string; p_window_start: string }
        Returns: number
      }
      load_hcad_batch: {
        Args: { p_jurisdictions: Json; p_parcels: Json }
        Returns: undefined
      }
      lookup_boundary_bodies: {
        Args: { p_latitude: number; p_longitude: number }
        Returns: {
          body_id: string
        }[]
      }
      lookup_hcad_parcel: {
        Args: { p_site_address_norm: string }
        Returns: {
          account: string
          jurisdiction_codes: string[]
          latitude: number
          legal_description: string
          longitude: number
        }[]
      }
      lookup_hoa_candidates: {
        Args: { p_subdivision: string }
        Returns: {
          hoa_body_id: string
          master_hoa_body_id: string
          match_score: number
          source_url: string
          subdivision_name: string
          verified: boolean
        }[]
      }
      replace_hcad_boundary_layer: {
        Args: { p_body_ids: string[]; p_boundaries: Json }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
