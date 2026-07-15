import { createHash } from 'node:crypto'
import type { Tables } from '../src/types/database.js'

export const SUBMISSION_ANALYSIS_PROMPT_VERSION = 'jury-analysis/v1'
export const SUBMISSION_RESUBMIT_COOLDOWN_MS = 30_000

type SubmissionContent = Pick<
  Tables<'project_submissions'>,
  | 'project_name'
  | 'short_description'
  | 'problem'
  | 'solution'
  | 'tech_stack'
  | 'repository_url'
  | 'demo_url'
  | 'presentation_url'
  | 'video_url'
>

export interface SubmissionContentInput {
  projectName: string
  shortDescription: string
  problem: string
  solution: string
  techStack: string[]
  repositoryUrl: string
  demoUrl: string
  presentationUrl: string
  videoUrl: string
}

function canonicalTechnologyStack(values: string[]): string[] {
  return [...values].sort((left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')))
}

function utf8Hex(value: string): string {
  return Buffer.from(value, 'utf8').toString('hex')
}

function submissionContentHashPayload(submission: SubmissionContent): string {
  const technologyPayload = canonicalTechnologyStack(submission.tech_stack).map(utf8Hex).join(',')
  return [
    utf8Hex(submission.project_name),
    utf8Hex(submission.short_description),
    utf8Hex(submission.problem),
    utf8Hex(submission.solution),
    `[${technologyPayload}]`,
    utf8Hex(submission.repository_url),
    utf8Hex(submission.demo_url),
    utf8Hex(submission.presentation_url),
    utf8Hex(submission.video_url),
  ].join(':')
}

function canonicalSubmissionContent(submission: SubmissionContent): object {
  return {
    projectName: submission.project_name,
    shortDescription: submission.short_description,
    problem: submission.problem,
    solution: submission.solution,
    techStack: canonicalTechnologyStack(submission.tech_stack),
    repositoryUrl: submission.repository_url,
    demoUrl: submission.demo_url,
    presentationUrl: submission.presentation_url,
    videoUrl: submission.video_url,
  }
}

function canonicalSubmissionInput(input: SubmissionContentInput): object {
  return {
    projectName: input.projectName,
    shortDescription: input.shortDescription,
    problem: input.problem,
    solution: input.solution,
    techStack: canonicalTechnologyStack(input.techStack),
    repositoryUrl: input.repositoryUrl,
    demoUrl: input.demoUrl,
    presentationUrl: input.presentationUrl,
    videoUrl: input.videoUrl,
  }
}

export function submissionContentMatchesInput(
  submission: SubmissionContent,
  input: SubmissionContentInput,
): boolean {
  return JSON.stringify(canonicalSubmissionContent(submission)) === JSON.stringify(canonicalSubmissionInput(input))
}

export function isSubmissionResubmitCooldownActive(
  submittedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!submittedAt) return false
  const submittedAtMs = new Date(submittedAt).getTime()
  const elapsedMs = now.getTime() - submittedAtMs
  return Number.isFinite(submittedAtMs)
    && elapsedMs >= 0
    && elapsedMs < SUBMISSION_RESUBMIT_COOLDOWN_MS
}

export function createSubmissionContentHash(submission: SubmissionContent): string {
  return createHash('sha256')
    .update(submissionContentHashPayload(submission), 'utf8')
    .digest('hex')
}

interface FingerprintInput {
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
    | 'submitted_at'
  >
  challenge: Pick<
    Tables<'challenges'>,
    'id' | 'title' | 'description' | 'thematic_axes' | 'suggested_topics' | 'requirements'
  >
  criteria: Pick<
    Tables<'evaluation_criteria'>,
    'id' | 'name' | 'description' | 'max_score' | 'weight' | 'active' | 'sort_order'
  >[]
  promptVersion?: string
}

export function createSubmissionAnalysisFingerprint(input: FingerprintInput): string {
  const canonicalCriteria = [...input.criteria]
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
    .map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      maxScore: criterion.max_score,
      weight: criterion.weight,
      active: criterion.active,
      sortOrder: criterion.sort_order,
    }))
  const canonicalValue = {
    promptVersion: input.promptVersion ?? SUBMISSION_ANALYSIS_PROMPT_VERSION,
    submission: {
      id: input.submission.id,
      projectName: input.submission.project_name,
      shortDescription: input.submission.short_description,
      problem: input.submission.problem,
      solution: input.submission.solution,
      techStack: input.submission.tech_stack,
      repositoryUrl: input.submission.repository_url,
      demoUrl: input.submission.demo_url,
      presentationUrl: input.submission.presentation_url,
      videoUrl: input.submission.video_url,
      submittedAt: input.submission.submitted_at,
    },
    challenge: {
      id: input.challenge.id,
      title: input.challenge.title,
      description: input.challenge.description,
      thematicAxes: input.challenge.thematic_axes,
      suggestedTopics: input.challenge.suggested_topics,
      requirements: input.challenge.requirements,
    },
    criteria: canonicalCriteria,
  }

  return createHash('sha256').update(JSON.stringify(canonicalValue), 'utf8').digest('hex')
}
