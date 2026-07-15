import { describe, expect, it } from 'vitest'
import {
  calculateSuggestedPercentage,
  redactSubmissionAiGeneratedReport,
  redactSubmissionAiSpecialistReport,
  submissionAiReportSchema,
  validateSubmissionAnalysisReport,
  type AnalysisRubricCriterion,
  type SubmissionAiGeneratedReport,
  type SubmissionAiSpecialistReport,
} from './submission-analysis-agents.js'

const criterion: AnalysisRubricCriterion = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Impacto',
  description: 'Valor demostrado por la solucion',
  maxScore: 10,
  weight: 2,
}

function validReport(): SubmissionAiGeneratedReport {
  return {
    executiveSummary: 'Resumen sustentado.',
    challengeAlignment: 'Alineacion sustentada.',
    problemAnalysis: 'Problema sustentado.',
    solutionAnalysis: 'Solucion sustentada.',
    deploymentAnalysis: 'Despliegue sustentado.',
    codeAnalysis: 'Codigo sustentado.',
    aiIntegrationAnalysis: 'Integracion sustentada.',
    risks: [],
    strengths: ['Fortaleza'],
    recommendations: ['Pregunta'],
    rubricSuggestions: [{
      criterionId: criterion.id,
      criterionName: criterion.name,
      score: 7.5,
      maxScore: criterion.maxScore,
      weight: criterion.weight,
      rationale: 'La evidencia publica respalda parcialmente el criterio.',
      evidenceIds: ['submission:content'],
    }],
    limitations: ['No se ejecuto codigo externo.'],
    confidence: 0.7,
  }
}

describe('contrato de agentes para analisis de entregas', () => {
  it('calcula la ponderacion sugerida sin convertirla en calificacion humana', () => {
    const report = validReport()
    validateSubmissionAnalysisReport(report, [criterion], ['submission:content'])
    expect(calculateSuggestedPercentage(report)).toBe(75)
  })

  it('rechaza criterios alterados, puntajes fuera de rango y evidencia inventada', () => {
    const alteredCriterion = validReport()
    alteredCriterion.rubricSuggestions[0].criterionName = 'Otro criterio'
    expect(() => validateSubmissionAnalysisReport(alteredCriterion, [criterion], ['submission:content'])).toThrow()

    const excessiveScore = validReport()
    excessiveScore.rubricSuggestions[0].score = 11
    expect(() => validateSubmissionAnalysisReport(excessiveScore, [criterion], ['submission:content'])).toThrow()

    const inventedEvidence = validReport()
    inventedEvidence.rubricSuggestions[0].evidenceIds = ['repository:invented']
    expect(() => validateSubmissionAnalysisReport(inventedEvidence, [criterion], ['submission:content'])).toThrow()
  })

  it('exige salida estructurada y confianza dentro de cero y uno', () => {
    const report = validReport()
    report.confidence = 1.2
    expect(submissionAiReportSchema.safeParse(report).success).toBe(false)
  })

  it('vuelve a redactar los textos generados antes de que puedan persistirse', () => {
    const specialist: SubmissionAiSpecialistReport = {
      specialty: 'code',
      summary: ['El README mostro ghs', '1234567890abcdefghijklmnop'].join('_'),
      strengths: [],
      concerns: ['Authorization: Bearer abcdefghijklmnopqrstuvwxyz'],
      recommendations: [],
      limitations: [],
      findings: [{
        evidenceId: 'submission:content',
        observation: 'DATABASE_URL=postgresql://jury:unsafe-password@db.example/project',
        impact: 'risk',
      }],
    }
    const report = validReport()
    report.executiveSummary = ['Se observo xoxb', '1234567890', 'abcdefghijklmnop'].join('-')
    report.rubricSuggestions[0].rationale = 'client_secret: plain-text-secret-value'

    const persistedText = JSON.stringify({
      specialist: redactSubmissionAiSpecialistReport(specialist),
      report: redactSubmissionAiGeneratedReport(report),
    })

    for (const exposedValue of [
      'ghs_1234567890',
      'abcdefghijklmnopqrstuvwxyz',
      'unsafe-password',
      'xoxb-1234567890',
      'plain-text-secret-value',
    ]) expect(persistedText).not.toContain(exposedValue)
    expect(persistedText).toContain('[REDACTED_')
  })
})
