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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_key: string
          dispatch_version: number
          event_id: string
          failed_count: number
          id: string
          kind: string
          message_text: string
          recipient_count: number
          request_id: string
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          cta_key: string
          dispatch_version?: number
          event_id: string
          failed_count?: number
          id?: string
          kind?: string
          message_text: string
          recipient_count: number
          request_id: string
          sent_count?: number
          started_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          cta_key?: string
          dispatch_version?: number
          event_id?: string
          failed_count?: number
          id?: string
          kind?: string
          message_text?: string
          recipient_count?: number
          request_id?: string
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          api_credit_code: string | null
          attempts: number
          batch_number: number
          batch_position: number
          campaign_id: string
          codex_credit_url: string | null
          created_at: string
          email: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_status_code: number | null
          provider_id: string | null
          retryable: boolean
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_credit_code?: string | null
          attempts?: number
          batch_number: number
          batch_position: number
          campaign_id: string
          codex_credit_url?: string | null
          created_at?: string
          email: string
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          last_status_code?: number | null
          provider_id?: string | null
          retryable?: boolean
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_credit_code?: string | null
          attempts?: number
          batch_number?: number
          batch_position?: number
          campaign_id?: string
          codex_credit_url?: string | null
          created_at?: string
          email?: string
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          last_status_code?: number | null
          provider_id?: string | null
          retryable?: boolean
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "broadcast_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          active: boolean
          created_at: string
          description: string
          event_id: string
          id: string
          max_teams: number | null
          requirements: string
          sort_order: number
          submission_deadline_at: string
          suggested_topics: string[]
          thematic_axes: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          event_id: string
          id?: string
          max_teams?: number | null
          requirements?: string
          sort_order?: number
          submission_deadline_at: string
          suggested_topics?: string[]
          thematic_axes?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          max_teams?: number | null
          requirements?: string
          sort_order?: number
          submission_deadline_at?: string
          suggested_topics?: string[]
          thematic_axes?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          active: boolean
          created_at: string
          description: string
          event_id: string
          id: string
          max_score: number
          name: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          event_id: string
          id?: string
          max_score: number
          name: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          max_score?: number
          name?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          comment: string
          created_at: string
          criterion_id: string
          evaluation_id: string
          id: string
          score: number
          updated_at: string
        }
        Insert: {
          comment?: string
          created_at?: string
          criterion_id: string
          evaluation_id: string
          id?: string
          score: number
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          criterion_id?: string
          evaluation_id?: string
          id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          event_id: string
          general_feedback: string
          id: string
          judge_id: string
          submitted: boolean
          submitted_at: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          general_feedback?: string
          id?: string
          judge_id: string
          submitted?: boolean
          submitted_at?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          general_feedback?: string
          id?: string
          judge_id?: string
          submitted?: boolean
          submitted_at?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          location: string
          max_team_size: number
          min_team_size: number
          name: string
          registration_closes_at: string | null
          registration_open: boolean
          registration_opens_at: string | null
          results_public: boolean
          scoring_closes_at: string | null
          scoring_open: boolean
          scoring_opens_at: string | null
          showcase_enabled: boolean
          slug: string
          starts_at: string
          submissions_close_at: string | null
          submissions_open: boolean
          tagline: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          location?: string
          max_team_size?: number
          min_team_size?: number
          name: string
          registration_closes_at?: string | null
          registration_open?: boolean
          registration_opens_at?: string | null
          results_public?: boolean
          scoring_closes_at?: string | null
          scoring_open?: boolean
          scoring_opens_at?: string | null
          showcase_enabled?: boolean
          slug: string
          starts_at: string
          submissions_close_at?: string | null
          submissions_open?: boolean
          tagline?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          location?: string
          max_team_size?: number
          min_team_size?: number
          name?: string
          registration_closes_at?: string | null
          registration_open?: boolean
          registration_opens_at?: string | null
          results_public?: boolean
          scoring_closes_at?: string | null
          scoring_open?: boolean
          scoring_opens_at?: string | null
          showcase_enabled?: boolean
          slug?: string
          starts_at?: string
          submissions_close_at?: string | null
          submissions_open?: boolean
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      judge_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          judge_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          judge_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          judge_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          mentor_id: string
          notes: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          mentor_id: string
          notes?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          mentor_id?: string
          notes?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_assignments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          email_hash: string
          id: string
          ip_hash: string
          outcome: string
          requested_at: string
        }
        Insert: {
          email_hash: string
          id?: string
          ip_hash: string
          outcome?: string
          requested_at?: string
        }
        Update: {
          email_hash?: string
          id?: string
          ip_hash?: string
          outcome?: string
          requested_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_email_attempted_at: string | null
          access_email_error_code: string | null
          access_email_sent_at: string | null
          access_email_status: string
          active: boolean
          created_at: string
          credential_version: number
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          password_changed_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          temporary_password_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_email_attempted_at?: string | null
          access_email_error_code?: string | null
          access_email_sent_at?: string | null
          access_email_status?: string
          active?: boolean
          created_at?: string
          credential_version?: number
          email: string
          full_name: string
          id: string
          must_change_password?: boolean
          password_changed_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          temporary_password_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_email_attempted_at?: string | null
          access_email_error_code?: string | null
          access_email_sent_at?: string | null
          access_email_status?: string
          active?: boolean
          created_at?: string
          credential_version?: number
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          temporary_password_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          created_at: string
          demo_url: string
          event_id: string
          id: string
          presentation_url: string
          problem: string
          project_name: string
          published_at: string | null
          repository_url: string
          short_description: string
          solution: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          team_id: string
          tech_stack: string[]
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          demo_url?: string
          event_id: string
          id?: string
          presentation_url?: string
          problem?: string
          project_name?: string
          published_at?: string | null
          repository_url?: string
          short_description?: string
          solution?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          team_id: string
          tech_stack?: string[]
          updated_at?: string
          video_url?: string
        }
        Update: {
          created_at?: string
          demo_url?: string
          event_id?: string
          id?: string
          presentation_url?: string
          problem?: string
          project_name?: string
          published_at?: string | null
          repository_url?: string
          short_description?: string
          solution?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          team_id?: string
          tech_stack?: string[]
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submissions_team_fk"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "event_id"]
          },
        ]
      }
      registration_email_outbox: {
        Row: {
          attempts: number
          created_at: string
          event_id: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          next_attempt_at: string | null
          notification_type: string
          provider_id: string | null
          sent_at: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id: string
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          next_attempt_at?: string | null
          notification_type?: string
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          next_attempt_at?: string | null
          notification_type?: string
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_email_outbox_team_fk"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "event_id"]
          },
        ]
      }
      submission_ai_analyses: {
        Row: {
          attempts: number
          completed_at: string | null
          confidence: number | null
          context_fingerprint: string | null
          created_at: string
          event_id: string
          evidence_summary: Json | null
          final_report: Json | null
          id: string
          input_tokens: number
          last_error_code: string | null
          lease_expires_at: string | null
          lease_token: string | null
          max_attempts: number
          model: string | null
          next_attempt_at: string | null
          output_tokens: number
          prompt_version: string
          requested_reason: string
          source_content_hash: string
          source_submitted_at: string
          specialist_reports: Json | null
          started_at: string | null
          status: string
          submission_id: string
          suggested_percentage: number | null
          team_id: string
          total_tokens: number
          trace_group_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          confidence?: number | null
          context_fingerprint?: string | null
          created_at?: string
          event_id: string
          evidence_summary?: Json | null
          final_report?: Json | null
          id?: string
          input_tokens?: number
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          max_attempts?: number
          model?: string | null
          next_attempt_at?: string | null
          output_tokens?: number
          prompt_version?: string
          requested_reason: string
          source_content_hash: string
          source_submitted_at: string
          specialist_reports?: Json | null
          started_at?: string | null
          status?: string
          submission_id: string
          suggested_percentage?: number | null
          team_id: string
          total_tokens?: number
          trace_group_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          confidence?: number | null
          context_fingerprint?: string | null
          created_at?: string
          event_id?: string
          evidence_summary?: Json | null
          final_report?: Json | null
          id?: string
          input_tokens?: number
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          max_attempts?: number
          model?: string | null
          next_attempt_at?: string | null
          output_tokens?: number
          prompt_version?: string
          requested_reason?: string
          source_content_hash?: string
          source_submitted_at?: string
          specialist_reports?: Json | null
          started_at?: string | null
          status?: string
          submission_id?: string
          suggested_percentage?: number | null
          team_id?: string
          total_tokens?: number
          trace_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_ai_analyses_submission_fk"
            columns: ["submission_id", "team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "project_submissions"
            referencedColumns: ["id", "team_id", "event_id"]
          },
        ]
      }
      team_challenges: {
        Row: {
          challenge_id: string
          created_at: string
          event_id: string
          team_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          event_id: string
          team_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          event_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_challenges_challenge_fk"
            columns: ["challenge_id", "event_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id", "event_id"]
          },
          {
            foreignKeyName: "team_challenges_team_fk"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "event_id"]
          },
        ]
      }
      team_members: {
        Row: {
          city: string
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          is_primary_contact: boolean
          member_role: string
          phone: string
          position: number
          team_id: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          is_primary_contact?: boolean
          member_role?: string
          phone?: string
          position: number
          team_id: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          is_primary_contact?: boolean
          member_role?: string
          phone?: string
          position?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_fk"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "event_id"]
          },
        ]
      }
      teams: {
        Row: {
          city: string
          contact_email: string
          contact_phone: string
          created_at: string
          event_id: string
          id: string
          management_token_hash: string
          name: string
          organization: string
          registered_at: string
          registration_code: string
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          city?: string
          contact_email: string
          contact_phone?: string
          created_at?: string
          event_id: string
          id?: string
          management_token_hash: string
          name: string
          organization?: string
          registered_at?: string
          registration_code: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          event_id?: string
          id?: string
          management_token_hash?: string
          name?: string
          organization?: string
          registered_at?: string
          registration_code?: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_broadcast_campaign: {
        Args: { p_campaign_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_key: string
          dispatch_version: number
          event_id: string
          failed_count: number
          id: string
          kind: string
          message_text: string
          recipient_count: number
          request_id: string
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "broadcast_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_password_reset_request: {
        Args: {
          p_email_hash: string
          p_email_limit: number
          p_ip_hash: string
          p_ip_limit: number
          p_window_minutes: number
        }
        Returns: string
      }
      claim_submission_ai_analysis: {
        Args: { p_analysis_id?: string }
        Returns: {
          attempts: number
          completed_at: string | null
          confidence: number | null
          context_fingerprint: string | null
          created_at: string
          event_id: string
          evidence_summary: Json | null
          final_report: Json | null
          id: string
          input_tokens: number
          last_error_code: string | null
          lease_expires_at: string | null
          lease_token: string | null
          max_attempts: number
          model: string | null
          next_attempt_at: string | null
          output_tokens: number
          prompt_version: string
          requested_reason: string
          source_content_hash: string
          source_submitted_at: string
          specialist_reports: Json | null
          started_at: string | null
          status: string
          submission_id: string
          suggested_percentage: number | null
          team_id: string
          total_tokens: number
          trace_group_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "submission_ai_analyses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_broadcast_campaign: {
        Args: {
          p_created_by: string
          p_cta_key: string
          p_event_id: string
          p_message_text: string
          p_recipients: Json
          p_request_id: string
          p_subject: string
        }
        Returns: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_key: string
          dispatch_version: number
          event_id: string
          failed_count: number
          id: string
          kind: string
          message_text: string
          recipient_count: number
          request_id: string
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "broadcast_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_credit_broadcast_campaign: {
        Args: {
          p_created_by: string
          p_event_id: string
          p_message_text: string
          p_recipients: Json
          p_request_id: string
          p_subject: string
        }
        Returns: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_key: string
          dispatch_version: number
          event_id: string
          failed_count: number
          id: string
          kind: string
          message_text: string
          recipient_count: number
          request_id: string
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "broadcast_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_team: {
        Args: {
          p_challenge_id: string
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_event_id: string
          p_management_token_hash: string
          p_members: Json
          p_name: string
          p_organization: string
          p_registration_code: string
        }
        Returns: {
          city: string
          contact_email: string
          contact_phone: string
          created_at: string
          event_id: string
          id: string
          management_token_hash: string
          name: string
          organization: string
          registered_at: string
          registration_code: string
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "teams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resume_broadcast_campaign: {
        Args: { p_campaign_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          cta_key: string
          dispatch_version: number
          event_id: string
          failed_count: number
          id: string
          kind: string
          message_text: string
          recipient_count: number
          request_id: string
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "broadcast_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_evaluation: {
        Args: {
          p_event_id: string
          p_general_feedback: string
          p_judge_id: string
          p_scores: Json
          p_submit: boolean
          p_team_id: string
        }
        Returns: {
          created_at: string
          event_id: string
          general_feedback: string
          id: string
          judge_id: string
          submitted: boolean
          submitted_at: string | null
          team_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      submission_status: "draft" | "submitted" | "published"
      team_status: "registered" | "active" | "withdrawn" | "disqualified"
      user_role: "admin" | "judge" | "mentor"
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
      submission_status: ["draft", "submitted", "published"],
      team_status: ["registered", "active", "withdrawn", "disqualified"],
      user_role: ["admin", "judge", "mentor"],
    },
  },
} as const
