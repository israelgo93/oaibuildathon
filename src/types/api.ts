import type { SubmissionStatus, Tables, UserRole } from '@/types/database'

export interface PublicEventConfig {
  event: Pick<
    Tables<'events'>,
    | 'id'
    | 'name'
    | 'tagline'
    | 'location'
    | 'starts_at'
    | 'ends_at'
    | 'registration_open'
    | 'submissions_open'
    | 'min_team_size'
    | 'max_team_size'
  >
  challenges: Pick<
    Tables<'challenges'>,
    'id' | 'title' | 'description' | 'requirements' | 'max_teams' | 'sort_order'
  >[]
}

export interface RegistrationMemberInput {
  fullName: string
  email: string
  phone: string
  city: string
  memberRole: string
  isPrimaryContact: boolean
}

export interface RegistrationInput {
  eventId: string
  teamName: string
  organization: string
  city: string
  contactEmail: string
  contactPhone: string
  challengeId: string
  members: RegistrationMemberInput[]
  website: string
  turnstileToken?: string
}

export interface RegistrationResult {
  teamId: string
  teamName: string
  registrationCode: string
}

export interface TeamLoginInput {
  registrationCode: string
  contactEmail: string
}

export interface TeamPortalData {
  event: Pick<Tables<'events'>, 'id' | 'name' | 'submissions_open' | 'submissions_close_at'>
  team: Pick<
    Tables<'teams'>,
    'id' | 'name' | 'organization' | 'city' | 'contact_email' | 'contact_phone' | 'status' | 'registration_code'
  >
  members: Pick<
    Tables<'team_members'>,
    'id' | 'position' | 'full_name' | 'email' | 'phone' | 'city' | 'member_role' | 'is_primary_contact'
  >[]
  challenge: Pick<Tables<'challenges'>, 'id' | 'title' | 'description' | 'requirements'>
  submission: Pick<
    Tables<'project_submissions'>,
    | 'id'
    | 'project_name'
    | 'short_description'
    | 'problem'
    | 'solution'
    | 'tech_stack'
    | 'repository_url'
    | 'demo_url'
    | 'presentation_url'
    | 'video_url'
    | 'status'
    | 'submitted_at'
  >
}

export interface SubmissionInput {
  projectName: string
  shortDescription: string
  problem: string
  solution: string
  techStack: string[]
  repositoryUrl: string
  demoUrl: string
  presentationUrl: string
  videoUrl: string
  submit: boolean
}

export interface ShowcaseProject {
  id: string
  teamName: string
  projectName: string
  shortDescription: string
  challengeTitle: string
  techStack: string[]
  demoUrl: string
  repositoryUrl: string
  publishedAt: string | null
}

export interface AuthenticatedProfile {
  id: string
  role: UserRole
  fullName: string
  email: string
}

export interface AdminDashboardData {
  profile: AuthenticatedProfile
  events: Tables<'events'>[]
  challenges: Tables<'challenges'>[]
  teams: Tables<'teams'>[]
  members: Tables<'team_members'>[]
  teamChallenges: Tables<'team_challenges'>[]
  submissions: Tables<'project_submissions'>[]
  criteria: Tables<'evaluation_criteria'>[]
  profiles: Tables<'profiles'>[]
  judgeAssignments: Tables<'judge_assignments'>[]
  mentorAssignments: Tables<'mentor_assignments'>[]
  evaluations: Tables<'evaluations'>[]
  scores: Tables<'evaluation_scores'>[]
}

export interface JudgeTeamData {
  assignmentId: string
  team: Pick<Tables<'teams'>, 'id' | 'event_id' | 'name' | 'organization' | 'city'>
  challenge: Pick<Tables<'challenges'>, 'id' | 'title'> | null
  submission: Tables<'project_submissions'> | null
  evaluation: Tables<'evaluations'> | null
  scores: Tables<'evaluation_scores'>[]
}

export interface JudgeDashboardData {
  profile: AuthenticatedProfile
  event: Tables<'events'>
  criteria: Tables<'evaluation_criteria'>[]
  teams: JudgeTeamData[]
}

export interface EvaluationScoreInput {
  criterionId: string
  score: number
  comment: string
}

export interface EvaluationInput {
  eventId: string
  teamId: string
  generalFeedback: string
  submit: boolean
  scores: EvaluationScoreInput[]
}

export interface MentorTeamData {
  assignmentId: string
  notes: string
  team: Tables<'teams'>
  members: Tables<'team_members'>[]
  challenge: Pick<Tables<'challenges'>, 'id' | 'title' | 'description' | 'requirements'> | null
  submission: Tables<'project_submissions'> | null
}

export interface MentorDashboardData {
  profile: AuthenticatedProfile
  event: Tables<'events'>
  teams: MentorTeamData[]
}

export type AdminAction =
  | { action: 'update_event'; eventId: string; values: Partial<Pick<Tables<'events'>, 'name' | 'tagline' | 'location' | 'starts_at' | 'ends_at' | 'registration_opens_at' | 'registration_closes_at' | 'submissions_close_at' | 'scoring_opens_at' | 'scoring_closes_at' | 'registration_open' | 'submissions_open' | 'scoring_open' | 'results_public' | 'showcase_enabled' | 'min_team_size' | 'max_team_size'>> }
  | { action: 'create_challenge'; eventId: string; title: string; description: string; requirements: string; maxTeams: number | null }
  | { action: 'update_challenge'; challengeId: string; title: string; description: string; requirements: string; active: boolean; maxTeams: number | null }
  | { action: 'create_criterion'; eventId: string; name: string; description: string; maxScore: number; weight: number }
  | { action: 'update_criterion'; criterionId: string; name: string; description: string; maxScore: number; weight: number; active: boolean }
  | { action: 'set_team_status'; teamId: string; status: Tables<'teams'>['status'] }
  | { action: 'set_submission_status'; submissionId: string; status: SubmissionStatus }
  | { action: 'add_member'; teamId: string; eventId: string; fullName: string; email: string; phone: string; city: string; memberRole: string }
  | { action: 'assign_judge'; eventId: string; judgeId: string; teamId: string }
  | { action: 'assign_mentor'; eventId: string; mentorId: string; teamId: string; notes: string }
  | { action: 'remove_judge_assignment'; assignmentId: string }
  | { action: 'remove_mentor_assignment'; assignmentId: string }

export interface CreateStaffInput {
  fullName: string
  email: string
  password: string
  role: UserRole
}

export interface ApiErrorBody {
  error: string
  details?: string
}
