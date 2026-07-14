export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'judge' | 'mentor'
export type TeamStatus = 'registered' | 'active' | 'withdrawn' | 'disqualified'
export type SubmissionStatus = 'draft' | 'submitted' | 'published'
export type RegistrationEmailStatus = 'pending' | 'retry' | 'sent' | 'failed'
export type AccessEmailStatus = 'not_sent' | 'sending' | 'sent' | 'failed'
export type BroadcastCtaKey = 'none' | 'landing' | 'registration' | 'team_portal' | 'staff_login'
export type BroadcastCampaignStatus = 'queued' | 'processing' | 'completed' | 'partial' | 'failed'
export type BroadcastRecipientStatus = 'pending' | 'processing' | 'sent' | 'failed'

export type EventRow = {
  id: string
  slug: string
  name: string
  tagline: string
  location: string
  starts_at: string
  ends_at: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  submissions_close_at: string | null
  scoring_opens_at: string | null
  scoring_closes_at: string | null
  registration_open: boolean
  submissions_open: boolean
  scoring_open: boolean
  results_public: boolean
  showcase_enabled: boolean
  min_team_size: number
  max_team_size: number
  created_at: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  role: UserRole
  full_name: string
  email: string
  active: boolean
  must_change_password: boolean
  temporary_password_expires_at: string | null
  password_changed_at: string | null
  credential_version: number
  access_email_status: AccessEmailStatus
  access_email_attempted_at: string | null
  access_email_sent_at: string | null
  access_email_error_code: string | null
  created_at: string
  updated_at: string
}

export type PasswordResetRequestRow = {
  id: string
  email_hash: string
  ip_hash: string
  outcome: 'ignored' | 'sent' | 'failed' | 'rate_limited'
  requested_at: string
}

export type BroadcastCampaignRow = {
  id: string
  event_id: string
  created_by: string | null
  request_id: string
  subject: string
  message_text: string
  cta_key: BroadcastCtaKey
  status: BroadcastCampaignStatus
  dispatch_version: number
  recipient_count: number
  sent_count: number
  failed_count: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type BroadcastRecipientRow = {
  id: string
  campaign_id: string
  email: string
  batch_number: number
  batch_position: number
  status: BroadcastRecipientStatus
  attempts: number
  provider_id: string | null
  last_error_code: string | null
  last_status_code: number | null
  retryable: boolean
  idempotency_key: string
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type ChallengeRow = {
  id: string
  event_id: string
  title: string
  description: string
  thematic_axes: string[]
  suggested_topics: string[]
  requirements: string
  active: boolean
  max_teams: number | null
  submission_deadline_at: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type RegistrationEmailOutboxRow = {
  id: string
  team_id: string
  event_id: string
  notification_type: 'team_registration'
  idempotency_key: string
  status: RegistrationEmailStatus
  attempts: number
  next_attempt_at: string | null
  provider_id: string | null
  last_error_code: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type TeamRow = {
  id: string
  event_id: string
  name: string
  organization: string
  city: string
  contact_email: string
  contact_phone: string
  status: TeamStatus
  registration_code: string
  management_token_hash: string
  registered_at: string
  created_at: string
  updated_at: string
}

export type TeamMemberRow = {
  id: string
  team_id: string
  event_id: string
  position: number
  full_name: string
  email: string
  phone: string
  city: string
  member_role: string
  is_primary_contact: boolean
  created_at: string
  updated_at: string
}

export type TeamChallengeRow = {
  team_id: string
  challenge_id: string
  event_id: string
  created_at: string
}

export type ProjectSubmissionRow = {
  id: string
  team_id: string
  event_id: string
  project_name: string
  short_description: string
  problem: string
  solution: string
  tech_stack: string[]
  repository_url: string
  demo_url: string
  presentation_url: string
  video_url: string
  status: SubmissionStatus
  submitted_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type EvaluationCriterionRow = {
  id: string
  event_id: string
  name: string
  description: string
  max_score: number
  weight: number
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type JudgeAssignmentRow = {
  id: string
  event_id: string
  judge_id: string
  team_id: string
  created_at: string
}

export type EvaluationRow = {
  id: string
  event_id: string
  team_id: string
  judge_id: string
  general_feedback: string
  submitted: boolean
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type EvaluationScoreRow = {
  id: string
  evaluation_id: string
  criterion_id: string
  score: number
  comment: string
  created_at: string
  updated_at: string
}

export type MentorAssignmentRow = {
  id: string
  event_id: string
  mentor_id: string
  team_id: string
  notes: string
  created_at: string
  updated_at: string
}

export type AuditLogRow = {
  id: number
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Json
  created_at: string
}

type InsertRow<Row, RequiredKeys extends keyof Row> = Partial<Row> & Pick<Row, RequiredKeys>
type TableDefinition<Row, Insert> = {
  Row: Row
  Insert: Insert
  Update: Partial<Row>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      events: TableDefinition<EventRow, InsertRow<EventRow, 'slug' | 'name' | 'starts_at' | 'ends_at'>>
      profiles: TableDefinition<ProfileRow, InsertRow<ProfileRow, 'id' | 'role' | 'full_name' | 'email'>>
      challenges: TableDefinition<ChallengeRow, InsertRow<ChallengeRow, 'event_id' | 'title' | 'description' | 'thematic_axes' | 'suggested_topics' | 'submission_deadline_at'>>
      teams: TableDefinition<TeamRow, InsertRow<TeamRow, 'event_id' | 'name' | 'contact_email' | 'registration_code' | 'management_token_hash'>>
      team_members: TableDefinition<TeamMemberRow, InsertRow<TeamMemberRow, 'team_id' | 'event_id' | 'position' | 'full_name' | 'email'>>
      team_challenges: TableDefinition<TeamChallengeRow, InsertRow<TeamChallengeRow, 'team_id' | 'challenge_id' | 'event_id'>>
      project_submissions: TableDefinition<ProjectSubmissionRow, InsertRow<ProjectSubmissionRow, 'team_id' | 'event_id'>>
      evaluation_criteria: TableDefinition<EvaluationCriterionRow, InsertRow<EvaluationCriterionRow, 'event_id' | 'name' | 'description' | 'max_score'>>
      judge_assignments: TableDefinition<JudgeAssignmentRow, InsertRow<JudgeAssignmentRow, 'event_id' | 'judge_id' | 'team_id'>>
      evaluations: TableDefinition<EvaluationRow, InsertRow<EvaluationRow, 'event_id' | 'team_id' | 'judge_id'>>
      evaluation_scores: TableDefinition<EvaluationScoreRow, InsertRow<EvaluationScoreRow, 'evaluation_id' | 'criterion_id' | 'score'>>
      mentor_assignments: TableDefinition<MentorAssignmentRow, InsertRow<MentorAssignmentRow, 'event_id' | 'mentor_id' | 'team_id'>>
      audit_logs: TableDefinition<AuditLogRow, InsertRow<AuditLogRow, 'action' | 'entity_type'>>
      registration_email_outbox: TableDefinition<RegistrationEmailOutboxRow, InsertRow<RegistrationEmailOutboxRow, 'team_id' | 'event_id' | 'idempotency_key'>>
      password_reset_requests: TableDefinition<PasswordResetRequestRow, InsertRow<PasswordResetRequestRow, 'email_hash' | 'ip_hash'>>
      broadcast_campaigns: TableDefinition<BroadcastCampaignRow, InsertRow<BroadcastCampaignRow, 'event_id' | 'request_id' | 'subject' | 'message_text' | 'cta_key' | 'recipient_count'>>
      broadcast_recipients: TableDefinition<BroadcastRecipientRow, InsertRow<BroadcastRecipientRow, 'campaign_id' | 'email' | 'batch_number' | 'batch_position'>>
    }
    Views: Record<never, never>
    Functions: {
      register_team: {
        Args: {
          p_event_id: string
          p_name: string
          p_organization: string
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_registration_code: string
          p_management_token_hash: string
          p_challenge_id: string
          p_members: Json
        }
        Returns: TeamRow
      }
      submit_evaluation: {
        Args: {
          p_event_id: string
          p_team_id: string
          p_judge_id: string
          p_general_feedback: string
          p_submit: boolean
          p_scores: Json
        }
        Returns: EvaluationRow
      }
      create_broadcast_campaign: {
        Args: {
          p_event_id: string
          p_created_by: string
          p_request_id: string
          p_subject: string
          p_message_text: string
          p_cta_key: BroadcastCtaKey
          p_recipients: Json
        }
        Returns: BroadcastCampaignRow
      }
      claim_broadcast_campaign: {
        Args: { p_campaign_id: string }
        Returns: BroadcastCampaignRow
      }
      resume_broadcast_campaign: {
        Args: { p_campaign_id: string }
        Returns: BroadcastCampaignRow
      }
      claim_password_reset_request: {
        Args: {
          p_email_hash: string
          p_ip_hash: string
          p_window_minutes: number
          p_email_limit: number
          p_ip_limit: number
        }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      team_status: TeamStatus
      submission_status: SubmissionStatus
    }
    CompositeTypes: Record<never, never>
  }
}

export type Tables<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Row']

export type TablesInsert<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Insert']

export type TablesUpdate<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Update']
