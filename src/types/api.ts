import type { BroadcastCtaKey, SubmissionStatus, Tables, UserRole } from './database.js'

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
    | 'submissions_close_at'
    | 'min_team_size'
    | 'max_team_size'
  >
  challenges: Pick<
    Tables<'challenges'>,
    'id' | 'title' | 'description' | 'thematic_axes' | 'suggested_topics' | 'requirements' | 'max_teams' | 'sort_order' | 'submission_deadline_at'
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
  challenge: Pick<Tables<'challenges'>, 'id' | 'title' | 'description' | 'thematic_axes' | 'suggested_topics' | 'requirements' | 'submission_deadline_at'>
  submissionDeadlineAt: string
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
  eventId: string
  eventName: string
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
  mustChangePassword: boolean
  temporaryPasswordExpiresAt: string | null
}

export type SubmissionAiAnalysisStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stale' | 'unavailable'

export type SubmissionAiEvidenceSource = 'submission' | 'challenge' | 'demo' | 'repository'

export type SubmissionAiEvidenceStatus = 'verified' | 'partial' | 'unavailable'

export interface SubmissionAiAnalysisSummary {
  analysisId: string | null
  submissionId: string
  status: SubmissionAiAnalysisStatus
  requestedAt: string | null
  completedAt: string | null
  sourceSubmittedAt: string | null
  model: string | null
  suggestedPercentage: number | null
  confidence: number | null
  errorCode: string | null
  canRetry: boolean
}

export interface SubmissionAiEvidenceSummary {
  id: string
  source: SubmissionAiEvidenceSource
  title: string
  summary: string
  status: SubmissionAiEvidenceStatus
}

export interface SubmissionAiRubricSuggestion {
  criterionId: string
  criterionName: string
  score: number
  maxScore: number
  weight: number
  rationale: string
  evidenceIds: string[]
}

export interface SubmissionAiAnalysisReport {
  executiveSummary: string
  challengeAlignment: string
  problemAnalysis: string
  solutionAnalysis: string
  deploymentAnalysis: string
  codeAnalysis: string
  aiIntegrationAnalysis: string
  risks: string[]
  strengths: string[]
  recommendations: string[]
  rubricSuggestions: SubmissionAiRubricSuggestion[]
  limitations: string[]
}

export interface SubmissionAiAnalysisDetail extends SubmissionAiAnalysisSummary {
  report: SubmissionAiAnalysisReport | null
  evidenceSummary: SubmissionAiEvidenceSummary[]
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
  registrationEmailOutbox: Tables<'registration_email_outbox'>[]
  submissionAnalyses: SubmissionAiAnalysisSummary[]
}

export interface JudgeTeamData {
  assignmentId: string
  team: Pick<Tables<'teams'>, 'id' | 'event_id' | 'name' | 'organization' | 'city'>
  challenge: Pick<Tables<'challenges'>, 'id' | 'title' | 'submission_deadline_at'> | null
  deadlineAt: string
  submissionStatus: SubmissionStatus
  submission: Tables<'project_submissions'> | null
  evaluation: Tables<'evaluations'> | null
  scores: Tables<'evaluation_scores'>[]
}

export interface JudgeDashboardData {
  profile: AuthenticatedProfile
  event: Tables<'events'>
  criteria: Tables<'evaluation_criteria'>[]
  teams: JudgeTeamData[]
  submissionAnalyses: SubmissionAiAnalysisSummary[]
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
  challenge: Pick<Tables<'challenges'>, 'id' | 'title' | 'description' | 'thematic_axes' | 'suggested_topics' | 'requirements'> | null
  submission: Tables<'project_submissions'> | null
}

export interface MentorDashboardData {
  profile: AuthenticatedProfile
  event: Tables<'events'>
  teams: MentorTeamData[]
}

export type AdminAction =
  | { action: 'create_event'; name: string; tagline: string; location: string; startsAt: string; endsAt: string; submissionsCloseAt: string | null; minTeamSize: number; maxTeamSize: number; copyCriteriaFromEventId: string | null }
  | { action: 'update_event'; eventId: string; values: Partial<Pick<Tables<'events'>, 'name' | 'tagline' | 'location' | 'starts_at' | 'ends_at' | 'registration_opens_at' | 'registration_closes_at' | 'submissions_close_at' | 'scoring_opens_at' | 'scoring_closes_at' | 'registration_open' | 'submissions_open' | 'scoring_open' | 'results_public' | 'showcase_enabled' | 'min_team_size' | 'max_team_size'>> }
  | { action: 'create_challenge'; eventId: string; title: string; description: string; thematicAxes: string[]; suggestedTopics: string[]; requirements: string; maxTeams: number | null; submissionDeadlineAt: string }
  | { action: 'update_challenge'; challengeId: string; title: string; description: string; thematicAxes: string[]; suggestedTopics: string[]; requirements: string; active: boolean; maxTeams: number | null; submissionDeadlineAt: string }
  | { action: 'create_criterion'; eventId: string; name: string; description: string; maxScore: number; weight: number }
  | { action: 'update_criterion'; criterionId: string; name: string; description: string; maxScore: number; weight: number; active: boolean }
  | { action: 'set_team_status'; teamId: string; status: Tables<'teams'>['status'] }
  | { action: 'set_submission_status'; submissionId: string; status: SubmissionStatus }
  | { action: 'add_member'; teamId: string; eventId: string; fullName: string; email: string; phone: string; city: string; memberRole: string }
  | { action: 'assign_judge'; eventId: string; judgeId: string; teamId: string }
  | { action: 'assign_mentor'; eventId: string; mentorId: string; teamId: string; notes: string }
  | { action: 'randomize_judge_assignments'; eventId: string }
  | { action: 'randomize_mentor_assignments'; eventId: string }
  | { action: 'remove_judge_assignment'; assignmentId: string }
  | { action: 'remove_mentor_assignment'; assignmentId: string }
  | { action: 'retry_registration_email'; outboxId: string }

export interface CreateStaffInput {
  fullName: string
  email: string
  password?: string
  role: UserRole
}

export interface CreateStaffResult {
  id: string
  fullName: string
  email: string
  role: UserRole
  emailSent: boolean
}

export type StaffAccessAction =
  | { action: 'notify_one'; profileId: string }
  | { action: 'notify_unnotified'; confirmation: 'NOTIFICAR' }
  | { action: 'notify_all'; confirmation: 'ROTAR CLAVES' }

export interface StaffAccessResult {
  total: number
  sent: number
  failed: number
}

export interface PasswordRecoveryInput {
  email: string
}

export interface AuthProfileResult {
  profile: AuthenticatedProfile
}

export interface CreateBroadcastInput {
  requestId: string
  eventId: string
  subject: string
  message: string
  ctaKey: BroadcastCtaKey
  recipients: string
}

export interface CreateBroadcastResult {
  campaignId: string
  recipientCount: number
  duplicateCount: number
  status: Tables<'broadcast_campaigns'>['status']
}

export type BroadcastResumeKind = 'start' | 'recover' | 'retry'

export type BroadcastCampaignSummary = Tables<'broadcast_campaigns'> & {
  retryableFailedCount: number
  permanentFailedCount: number
  resumable: boolean
  resumeKind: BroadcastResumeKind | null
  resumableAt: string | null
}

export interface BroadcastListResult {
  campaigns: BroadcastCampaignSummary[]
}

export interface RetryBroadcastInput {
  action: 'resume'
  campaignId: string
}

export interface RetryBroadcastResult {
  campaignId: string
  eligibleCount: number
  status: 'scheduled'
  resumeKind: BroadcastResumeKind
}

export interface AnalysisWorkerRunResult {
  processed: number
  capacity: number
}

export interface ApiErrorBody {
  error: string
  details?: string
}
