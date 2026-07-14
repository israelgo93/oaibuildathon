import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714131805_complete_submission_deadlines_and_email_outbox.sql',
)
const migration = readFileSync(migrationPath, 'utf8')

const assignmentTriggerMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714132323_fix_assignment_role_trigger.sql',
)
const assignmentTriggerMigration = readFileSync(assignmentTriggerMigrationPath, 'utf8')

const challengeThemesMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714205820_add_challenge_themes.sql',
)
const challengeThemesMigration = readFileSync(challengeThemesMigrationPath, 'utf8')

const staffAccessMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714223749_add_staff_access_and_broadcasts.sql',
)
const staffAccessMigration = readFileSync(staffAccessMigrationPath, 'utf8')

const broadcastIndexMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714224056_index_broadcast_campaign_foreign_keys.sql',
)
const broadcastIndexMigration = readFileSync(broadcastIndexMigrationPath, 'utf8')

const broadcastHardeningMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714230812_harden_broadcast_retry_and_idempotency.sql',
)
const broadcastHardeningMigration = readFileSync(broadcastHardeningMigrationPath, 'utf8')

const staffRecoveryHardeningMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260714230821_harden_staff_access_and_password_recovery.sql',
)
const staffRecoveryHardeningMigration = readFileSync(staffRecoveryHardeningMigrationPath, 'utf8')

describe('contrato SQL de la iteracion', () => {
  it('crea deadline por reto y el outbox dentro de register_team', () => {
    expect(migration).toContain('add column submission_deadline_at timestamptz')
    expect(migration).toContain('create table public.registration_email_outbox')
    expect(migration).toContain("'team-registration/v1/' || created_team.id::text")
  })

  it('refuerza entrega final y conserva submitted_at al publicar', () => {
    expect(migration).toContain('project_submissions_final_complete')
    expect(migration).toContain('new.submitted_at := old.submitted_at')
    expect(migration).toContain("status in ('submitted', 'published')")
  })

  it('habilita RLS y revoca acceso directo al outbox', () => {
    expect(migration).toContain('alter table public.registration_email_outbox enable row level security')
    expect(migration).toContain('revoke all on table public.registration_email_outbox from public, anon, authenticated')
  })

  it('resuelve el perfil de cada asignacion sin leer columnas de la otra tabla', () => {
    expect(assignmentTriggerMigration).toContain("tg_table_name = 'judge_assignments'")
    expect(assignmentTriggerMigration).toContain("to_jsonb(new) ->> 'judge_id'")
    expect(assignmentTriggerMigration).toContain("tg_table_name = 'mentor_assignments'")
    expect(assignmentTriggerMigration).toContain("to_jsonb(new) ->> 'mentor_id'")
    expect(assignmentTriggerMigration).not.toContain('new.judge_id')
    expect(assignmentTriggerMigration).not.toContain('new.mentor_id')
  })

  it('agrega ejes y temas sugeridos con limites para cada reto', () => {
    expect(challengeThemesMigration).toContain('add column thematic_axes text[] not null')
    expect(challengeThemesMigration).toContain('add column suggested_topics text[] not null')
    expect(challengeThemesMigration).toContain('challenges_thematic_axes_count')
    expect(challengeThemesMigration).toContain('challenges_suggested_topics_count')
    expect(challengeThemesMigration).toContain('Skills reutilizables')
    expect(challengeThemesMigration).toContain('Pesca y economia costera')
  })

  it('agrega acceso temporal sin borrar ni desactivar usuarios existentes', () => {
    expect(staffAccessMigration).toContain('add column must_change_password boolean not null default false')
    expect(staffAccessMigration).toContain('add column credential_version integer not null default 0')
    expect(staffAccessMigration).toContain('create trigger auth_user_password_changed')
    expect(staffAccessMigration).not.toMatch(/delete\s+from\s+(auth\.users|public\.profiles)/i)
    expect(staffAccessMigration).not.toMatch(/update\s+public\.profiles[\s\S]*active\s*=\s*false/i)
  })

  it('protege rate limits y difusiones del acceso directo del navegador', () => {
    expect(staffAccessMigration).toContain('create table public.password_reset_requests')
    expect(staffAccessMigration).toContain('create table public.broadcast_campaigns')
    expect(staffAccessMigration).toContain('create table public.broadcast_recipients')
    expect(staffAccessMigration).toContain('alter table public.broadcast_campaigns enable row level security')
    expect(staffAccessMigration).toContain('revoke all on table public.broadcast_recipients from public, anon, authenticated')
    expect(staffAccessMigration).toContain('create or replace function public.claim_broadcast_campaign')
    expect(broadcastIndexMigration).toContain('broadcast_campaigns_event_idx')
    expect(broadcastIndexMigration).toContain('broadcast_campaigns_created_by_idx')
  })

  it('reanuda difusiones atomicamente con idempotencia estable y fallos clasificables', () => {
    expect(broadcastHardeningMigration).toContain('add column retryable boolean not null default true')
    expect(broadcastHardeningMigration).toContain('add column idempotency_key text')
    expect(broadcastHardeningMigration).toContain("'broadcast/v2/' || v_campaign.id::text")
    expect(broadcastHardeningMigration).toContain('create or replace function public.resume_broadcast_campaign')
    expect(broadcastHardeningMigration).toContain("updated_at <= now() - interval '15 minutes'")
    expect(broadcastHardeningMigration).toContain('and retryable')
    expect(broadcastHardeningMigration).toContain('and attempts < 20')
    expect(broadcastHardeningMigration).toContain('pg_catalog.pg_advisory_xact_lock')
    expect(broadcastHardeningMigration).toContain('from public, anon, authenticated')
    expect(broadcastHardeningMigration).toContain('to service_role')
  })

  it('reclama la cuota de recuperacion de forma atomica y solo desde servidor', () => {
    expect(staffRecoveryHardeningMigration).toContain('create or replace function public.claim_password_reset_request')
    expect(staffRecoveryHardeningMigration).toContain('pg_catalog.pg_advisory_xact_lock')
    expect(staffRecoveryHardeningMigration).toContain('if v_email_count >= p_email_limit or v_ip_count >= p_ip_limit')
    expect(staffRecoveryHardeningMigration).toContain('return null;')
    expect(staffRecoveryHardeningMigration).toContain('from public, anon, authenticated')
    expect(staffRecoveryHardeningMigration).toContain('to service_role')
  })

  it('conserva el cambio obligatorio durante la activacion de una clave enviada', () => {
    expect(staffRecoveryHardeningMigration).toContain("when access_email_status = 'sending'")
    expect(staffRecoveryHardeningMigration).toContain("access_email_attempted_at >= now() - interval '15 minutes'")
    expect(staffRecoveryHardeningMigration).toContain('then true')
  })
})
