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
})
