import { describe, expect, it } from 'vitest'
import type { EmailEnvironment } from './env.js'
import {
  isRetryableBroadcastFailure,
  processBroadcastCampaign,
  type BroadcastProcessDependencies,
  type BroadcastRepository,
  type BroadcastTransport,
} from './broadcast-service.js'
import type {
  Json,
  Tables,
  TablesUpdate,
} from '../src/types/database.js'

const environment: EmailEnvironment = {
  apiKey: 're_test',
  from: 'OpenAI Build Week Manta <noreply@datatensei.ai>',
  replyTo: 'soporte@datatensei.ai',
  appBaseUrl: 'https://oaibuildathon.vercel.app',
}

function campaign(overrides: Partial<Tables<'broadcast_campaigns'>> = {}): Tables<'broadcast_campaigns'> {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    event_id: '20000000-0000-4000-8000-000000000001',
    created_by: '30000000-0000-4000-8000-000000000001',
    request_id: '40000000-0000-4000-8000-000000000001',
    subject: 'Informacion para participantes',
    message_text: 'Completa el registro de tu equipo.',
    cta_key: 'registration',
    kind: 'message',
    status: 'processing',
    dispatch_version: 1,
    recipient_count: 3,
    sent_count: 0,
    failed_count: 0,
    started_at: '2026-07-14T22:00:00.000Z',
    completed_at: null,
    created_at: '2026-07-14T21:00:00.000Z',
    updated_at: '2026-07-14T22:00:00.000Z',
    ...overrides,
  }
}

function recipient(
  index: number,
  overrides: Partial<Tables<'broadcast_recipients'>> = {},
): Tables<'broadcast_recipients'> {
  return {
    id: `50000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    campaign_id: '10000000-0000-4000-8000-000000000001',
    email: `persona${index}@example.com`,
    api_credit_code: null,
    codex_credit_url: null,
    batch_number: 0,
    batch_position: index,
    status: 'processing',
    attempts: 1,
    provider_id: null,
    last_error_code: null,
    last_status_code: null,
    retryable: true,
    idempotency_key: 'broadcast/v2/10000000-0000-4000-8000-000000000001/0',
    sent_at: null,
    created_at: '2026-07-14T21:00:00.000Z',
    updated_at: '2026-07-14T21:00:00.000Z',
    ...overrides,
  }
}

class FakeBroadcastRepository implements BroadcastRepository {
  currentCampaign: Tables<'broadcast_campaigns'> | null
  recipients: Tables<'broadcast_recipients'>[]
  campaignUpdates: TablesUpdate<'broadcast_campaigns'>[] = []

  constructor(currentCampaign: Tables<'broadcast_campaigns'> | null, recipients: Tables<'broadcast_recipients'>[]) {
    this.currentCampaign = currentCampaign
    this.recipients = structuredClone(recipients)
  }

  async claimCampaign(): Promise<Tables<'broadcast_campaigns'> | null> {
    return this.currentCampaign ? structuredClone(this.currentCampaign) : null
  }

  async loadDispatchRecipients(): Promise<Tables<'broadcast_recipients'>[]> {
    return structuredClone(this.recipients.filter((item) => item.status === 'processing'))
  }

  async loadDeliveryRecipients(
    _campaignId: string,
    batchNumbers: number[],
  ): Promise<Tables<'broadcast_recipients'>[]> {
    return structuredClone(this.recipients.filter((item) => batchNumbers.includes(item.batch_number)))
  }

  async saveDeliveryResults(
    recipientsToSave: Tables<'broadcast_recipients'>[],
    results: Awaited<ReturnType<BroadcastTransport['send']>>,
    sentAt: string,
  ): Promise<void> {
    const resultsByEmail = new Map(results.map((result) => [result.email, result]))
    const ids = new Set(recipientsToSave.map((item) => item.id))
    this.recipients = this.recipients.map((item) => {
      if (!ids.has(item.id)) return item
      const result = resultsByEmail.get(item.email)
      return result?.ok === true
        ? { ...item, status: 'sent', provider_id: result.providerId, last_error_code: null, last_status_code: null, retryable: false, sent_at: sentAt }
        : {
            ...item,
            status: 'failed',
            provider_id: null,
            last_error_code: result?.code ?? 'unexpected_response',
            last_status_code: result?.ok === false ? result.statusCode : null,
            retryable: result?.ok === false ? isRetryableBroadcastFailure(result) : true,
            sent_at: null,
          }
    })
  }

  async loadAllRecipients(): Promise<Tables<'broadcast_recipients'>[]> {
    return structuredClone(this.recipients)
  }

  async updateCampaign(
    _campaignId: string,
    values: TablesUpdate<'broadcast_campaigns'>,
  ): Promise<void> {
    this.campaignUpdates.push(values)
  }
}

interface AuditCall {
  actorId: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Json
}

function dependencies(
  repository: BroadcastRepository,
  transport: BroadcastTransport,
  audits: AuditCall[],
  emailEnvironment: EmailEnvironment | null = environment,
): BroadcastProcessDependencies {
  return {
    repository,
    transport,
    environment: emailEnvironment,
    now: new Date('2026-07-14T22:30:00.000Z'),
    audit: async (actorId, action, entityType, entityId, metadata) => {
      audits.push({ actorId, action, entityType, entityId, metadata })
    },
  }
}

describe('processBroadcastCampaign', () => {
  it('reclama, envia con version estable, persiste resultados y consolida parcial', async () => {
    const repository = new FakeBroadcastRepository(campaign(), [recipient(0), recipient(1), recipient(2)])
    const idempotencyKeys: string[] = []
    const transport: BroadcastTransport = {
      send: async (messages) => {
        idempotencyKeys.push(...messages.map((message) => message.idempotencyKey))
        expect(messages.map((message) => message.from)).toEqual([
          environment.from,
          environment.from,
          environment.from,
        ])
        return messages.map((message, index) => index === 1
          ? {
              ok: false,
              email: message.to,
              code: 'rate_limit_exceeded',
              message: 'Limite temporal',
              statusCode: 429,
              retryAfter: '2',
              batchIndex: 0,
              idempotencyKey: message.idempotencyKey,
            }
          : {
              ok: true,
              email: message.to,
              providerId: `provider-${index}`,
              batchIndex: 0,
              idempotencyKey: message.idempotencyKey,
            })
      },
    }
    const audits: AuditCall[] = []

    const result = await processBroadcastCampaign(
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, audits),
    )

    expect(new Set(idempotencyKeys)).toEqual(new Set([
      'broadcast/v2/10000000-0000-4000-8000-000000000001/0',
    ]))
    expect(result).toEqual({
      campaignId: '10000000-0000-4000-8000-000000000001',
      dispatchVersion: 1,
      status: 'partial',
      sentCount: 2,
      failedCount: 1,
    })
    expect(repository.recipients.map((item) => item.attempts)).toEqual([1, 1, 1])
    expect(repository.recipients.map((item) => item.status)).toEqual(['sent', 'failed', 'sent'])
    expect(repository.campaignUpdates.at(-1)).toMatchObject({
      status: 'partial',
      sent_count: 2,
      failed_count: 1,
      completed_at: '2026-07-14T22:30:00.000Z',
    })
    expect(audits).toHaveLength(1)
    expect(audits[0]?.metadata).toMatchObject({
      dispatch_version: 1,
      recipient_count: 3,
      sent_count: 2,
      failed_count: 1,
      status: 'partial',
    })
    const auditText = JSON.stringify(audits)
    expect(auditText).not.toContain('@example.com')
    expect(auditText).not.toContain('Completa el registro')
    expect(auditText).not.toContain('provider-')
  })

  it('marca fallidos cuando falta la configuracion sin invocar el transporte', async () => {
    const repository = new FakeBroadcastRepository(campaign({ recipient_count: 2 }), [recipient(0), recipient(1)])
    let transportCalls = 0
    const transport: BroadcastTransport = {
      send: async () => {
        transportCalls += 1
        return []
      },
    }
    const audits: AuditCall[] = []

    const result = await processBroadcastCampaign(
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, audits, null),
    )

    expect(transportCalls).toBe(0)
    expect(result?.status).toBe('failed')
    expect(result?.failedCount).toBe(2)
    expect(repository.recipients.every((item) => item.last_error_code === 'configuration_missing')).toBe(true)
  })

  it('termina sin efectos cuando otra ejecucion ya reclamo la campana', async () => {
    const repository = new FakeBroadcastRepository(null, [recipient(0)])
    let transportCalls = 0
    const transport: BroadcastTransport = {
      send: async () => {
        transportCalls += 1
        return []
      },
    }

    const result = await processBroadcastCampaign(
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, []),
    )

    expect(result).toBeNull()
    expect(transportCalls).toBe(0)
  })

  it('consolida completed cuando todos los destinatarios son aceptados', async () => {
    const repository = new FakeBroadcastRepository(campaign({ recipient_count: 2 }), [recipient(0), recipient(1)])
    const transport: BroadcastTransport = {
      send: async (messages) => messages.map((message, index) => ({
        ok: true,
        email: message.to,
        providerId: `provider-${index}`,
        batchIndex: 0,
        idempotencyKey: message.idempotencyKey,
      })),
    }

    const result = await processBroadcastCampaign(
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, []),
    )

    expect(result?.status).toBe('completed')
    expect(result?.sentCount).toBe(2)
    expect(result?.failedCount).toBe(0)
  })

  it('reconstruye el lote original completo al reintentar un fallo ambiguo', async () => {
    const alreadySent = recipient(0, {
      status: 'sent',
      retryable: false,
      provider_id: 'provider-cached-0',
      sent_at: '2026-07-14T22:00:00.000Z',
    })
    const retrying = recipient(1, {
      status: 'processing',
      attempts: 2,
      last_error_code: null,
      retryable: true,
    })
    const repository = new FakeBroadcastRepository(
      campaign({ recipient_count: 2, sent_count: 1, dispatch_version: 2 }),
      [alreadySent, retrying],
    )
    const payloads: string[][] = []
    const keys: string[][] = []
    const transport: BroadcastTransport = {
      send: async (messages) => {
        payloads.push(messages.map((message) => message.to))
        keys.push(messages.map((message) => message.idempotencyKey))
        return messages.map((message, index) => ({
          ok: true,
          email: message.to,
          providerId: `provider-cached-${index}`,
          batchIndex: message.batchNumber,
          idempotencyKey: message.idempotencyKey,
        }))
      },
    }

    const result = await processBroadcastCampaign(
      campaign().id,
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, []),
    )

    expect(payloads).toEqual([['persona0@example.com', 'persona1@example.com']])
    expect(new Set(keys[0])).toEqual(new Set([
      'broadcast/v2/10000000-0000-4000-8000-000000000001/0',
    ]))
    expect(repository.recipients[0]).toMatchObject({
      status: 'sent',
      provider_id: 'provider-cached-0',
      sent_at: '2026-07-14T22:00:00.000Z',
    })
    expect(repository.recipients[1]?.status).toBe('sent')
    expect(result?.status).toBe('completed')
  })

  it('envia la plantilla de creditos con el codigo y el enlace de cada destinatario', async () => {
    const creditCampaign = campaign({
      kind: 'credit',
      cta_key: 'none',
      recipient_count: 2,
      subject: 'Tus creditos de OpenAI',
      message_text: 'Gracias por completar tu check-in.',
    })
    const creditRecipients = [
      recipient(0, { api_credit_code: 'PROMO-UNO-0001', codex_credit_url: 'https://chatgpt.com/codex/claim/uno' }),
      recipient(1, { api_credit_code: 'PROMO-DOS-0002', codex_credit_url: 'https://chatgpt.com/codex/claim/dos' }),
    ]
    const repository = new FakeBroadcastRepository(creditCampaign, creditRecipients)
    const htmlBodies: string[] = []
    const transport: BroadcastTransport = {
      send: async (messages) => {
        htmlBodies.push(...messages.map((message) => message.html))
        return messages.map((message, index) => ({
          ok: true,
          email: message.to,
          providerId: `provider-${index}`,
          batchIndex: message.batchNumber,
          idempotencyKey: message.idempotencyKey,
        }))
      },
    }

    const result = await processBroadcastCampaign(
      creditCampaign.id,
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, []),
    )

    expect(result?.status).toBe('completed')
    expect(htmlBodies[0]).toContain('PROMO-UNO-0001')
    expect(htmlBodies[0]).toContain('https://chatgpt.com/codex/claim/uno')
    expect(htmlBodies[0]).not.toContain('PROMO-DOS-0002')
    expect(htmlBodies[1]).toContain('PROMO-DOS-0002')
    expect(htmlBodies[1]).toContain('https://chatgpt.com/codex/claim/dos')
  })

  it('marca la campana de creditos como fallida si un destinatario no tiene codigo', async () => {
    const creditCampaign = campaign({ kind: 'credit', cta_key: 'none', recipient_count: 1 })
    const repository = new FakeBroadcastRepository(creditCampaign, [
      recipient(0, { api_credit_code: null, codex_credit_url: 'https://chatgpt.com/codex/claim/uno' }),
    ])
    let transportCalls = 0
    const transport: BroadcastTransport = {
      send: async () => {
        transportCalls += 1
        return []
      },
    }

    const result = await processBroadcastCampaign(
      creditCampaign.id,
      '30000000-0000-4000-8000-000000000001',
      dependencies(repository, transport, []),
    )

    expect(transportCalls).toBe(0)
    expect(result?.status).toBe('failed')
    expect(repository.recipients[0]?.last_error_code).toBe('processing_error')
  })

  it('separa errores transitorios de fallos permanentes', () => {
    expect(isRetryableBroadcastFailure({
      ok: false,
      email: 'uno@example.com',
      code: 'network_error',
      message: 'timeout',
      statusCode: null,
      retryAfter: null,
      batchIndex: 0,
      idempotencyKey: 'broadcast/v2/campaign/0',
    })).toBe(true)
    expect(isRetryableBroadcastFailure({
      ok: false,
      email: 'uno@example.com',
      code: 'validation_error',
      message: 'invalid',
      statusCode: 400,
      retryAfter: null,
      batchIndex: 0,
      idempotencyKey: 'broadcast/v2/campaign/0',
    })).toBe(false)
  })
})
