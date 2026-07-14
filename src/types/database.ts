export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'judge' | 'mentor'
export type TeamStatus = 'registered' | 'active' | 'withdrawn' | 'disqualified'
export type SubmissionStatus = 'draft' | 'submitted' | 'published'
export type RegistrationEmailStatus = 'pending' | 'retry' | 'sent' | 'failed'

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
