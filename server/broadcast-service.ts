import type { EmailEnvironment } from './env.js'
import { getEmailEnvironment } from './env.js'
import { writeAuditLog } from './audit.js'
import { getServerSupabase } from './supabase.js'
import {
  ResendBroadcastEmailTransport,
  buildBroadcastEmail,
  type BroadcastDeliveryMessage,
  type BroadcastRecipientDeliveryResult,
} from './broadcast-email.js'
import type {
  BroadcastCampaignStatus,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '../src/types/database.js'

export interface BroadcastTransport {
  send: (messages: BroadcastDeliveryMessage[]) => Promise<BroadcastRecipientDeliveryResult[]>
}

export interface BroadcastRepository {
  claimCampaign: (campaignId: string) => Promise<Tables<'broadcast_campaigns'> | null>
  loadDispatchRecipients: (campaignId: string) => Promise<Tables<'broadcast_recipients'>[]>
  loadDeliveryRecipients: (
    campaignId: string,
    batchNumbers: number[],
  ) => Promise<Tables<'broadcast_recipients'>[]>
  saveDeliveryResults: (
    recipients: Tables<'broadcast_recipients'>[],
    results: BroadcastRecipientDeliveryResult[],
    sentAt: string,
  ) => Promise<void>
  loadAllRecipients: (campaignId: string) => Promise<Tables<'broadcast_recipients'>[]>
  updateCampaign: (
    campaignId: string,
    values: TablesUpdate<'broadcast_campaigns'>,
  ) => Promise<void>
}

export interface BroadcastProcessResult {
  campaignId: string
  dispatchVersion: number
  status: BroadcastCampaignStatus
  sentCount: number
  failedCount: number
}

export interface BroadcastProcessDependencies {
  repository?: BroadcastRepository
  environment?: EmailEnvironment | null
  transport?: BroadcastTransport
  now?: Date
  audit?: (
    actorId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    metadata: Json,
  ) => Promise<void>
}

function recipientInsertValues(
  recipient: Tables<'broadcast_recipients'>,
): TablesInsert<'broadcast_recipients'> {
  return {
    id: recipient.id,
    campaign_id: recipient.campaign_id,
    email: recipient.email,
    batch_number: recipient.batch_number,
    batch_position: recipient.batch_position,
    status: recipient.status,
    attempts: recipient.attempts,
    provider_id: recipient.provider_id,
    last_error_code: recipient.last_error_code,
    last_status_code: recipient.last_status_code,
    retryable: recipient.retryable,
    idempotency_key: recipient.idempotency_key,
    sent_at: recipient.sent_at,
    created_at: recipient.created_at,
    updated_at: recipient.updated_at,
  }
}

export class SupabaseBroadcastRepository implements BroadcastRepository {
  async claimCampaign(campaignId: string): Promise<Tables<'broadcast_campaigns'> | null> {
    const { data: campaignRaw, error } = await getServerSupabase().rpc('resume_broadcast_campaign', {
      p_campaign_id: campaignId,
    })
    if (error) throw new Error('No fue posible reclamar la difusion')
    if (!campaignRaw || !campaignRaw.id) return null
    return campaignRaw as Tables<'broadcast_campaigns'>
  }

  async loadDispatchRecipients(campaignId: string): Promise<Tables<'broadcast_recipients'>[]> {
    const { data, error } = await getServerSupabase()
      .from('broadcast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'processing')
      .order('batch_number')
      .order('batch_position')
    if (error) throw new Error('No fue posible cargar los destinatarios pendientes')
    const recipients: Tables<'broadcast_recipients'>[] = data ?? []
    return recipients
  }

  async loadDeliveryRecipients(
    campaignId: string,
    batchNumbers: number[],
  ): Promise<Tables<'broadcast_recipients'>[]> {
    if (batchNumbers.length === 0) return []
    const { data, error } = await getServerSupabase()
      .from('broadcast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('batch_number', batchNumbers)
      .order('batch_number')
      .order('batch_position')
    if (error) throw new Error('No fue posible reconstruir los lotes de difusion')
    const recipients: Tables<'broadcast_recipients'>[] = data ?? []
    return recipients
  }

  async saveDeliveryResults(
    recipients: Tables<'broadcast_recipients'>[],
    results: BroadcastRecipientDeliveryResult[],
    sentAt: string,
  ): Promise<void> {
    if (recipients.length === 0) return
    const resultsByEmail = new Map(results.map((result) => [result.email, result]))
    const updated: Tables<'broadcast_recipients'>[] = recipients.map((recipient) => {
      const result = resultsByEmail.get(recipient.email)
      if (result?.ok === true) {
        return {
          ...recipient,
          status: 'sent',
          provider_id: result.providerId,
          last_error_code: null,
          last_status_code: null,
          retryable: false,
          sent_at: sentAt,
        }
      }

      return {
        ...recipient,
        status: 'failed',
        provider_id: null,
        last_error_code: (result?.code ?? 'unexpected_response').slice(0, 80),
        last_status_code: result?.ok === false ? result.statusCode : null,
        retryable: result?.ok === false ? isRetryableBroadcastFailure(result) : true,
        sent_at: null,
      }
    })
    const values: TablesInsert<'broadcast_recipients'>[] = updated.map(recipientInsertValues)
    const { error } = await getServerSupabase()
      .from('broadcast_recipients')
      .upsert(values, { onConflict: 'id' })
    if (error) throw new Error('No fue posible guardar el resultado de la difusion')
  }

  async loadAllRecipients(campaignId: string): Promise<Tables<'broadcast_recipients'>[]> {
    const { data, error } = await getServerSupabase()
      .from('broadcast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('batch_number')
      .order('batch_position')
    if (error) throw new Error('No fue posible consolidar la difusion')
    const recipients: Tables<'broadcast_recipients'>[] = data ?? []
    return recipients
  }

  async updateCampaign(
    campaignId: string,
    values: TablesUpdate<'broadcast_campaigns'>,
  ): Promise<void> {
    const { error } = await getServerSupabase()
      .from('broadcast_campaigns')
      .update(values)
      .eq('id', campaignId)
    if (error) throw new Error('No fue posible actualizar la difusion')
  }
}

function failureResults(
  recipients: Tables<'broadcast_recipients'>[],
  code: string,
  message: string,
): BroadcastRecipientDeliveryResult[] {
  return recipients.map((recipient) => ({
    ok: false,
    email: recipient.email,
    code,
    message,
    statusCode: null,
    retryAfter: null,
    batchIndex: recipient.batch_number,
    idempotencyKey: recipient.idempotency_key,
  }))
}

type FailedBroadcastDelivery = Extract<BroadcastRecipientDeliveryResult, { ok: false }>

export function isRetryableBroadcastFailure(result: FailedBroadcastDelivery): boolean {
  if (
    result.code === 'network_error'
    || result.code === 'configuration_missing'
    || result.code === 'processing_error'
    || result.code === 'unexpected_response'
  ) return true
  if (result.code === 'validation_error' || result.code === 'max_attempts') return false
  if (result.statusCode === null) return false
  return result.statusCode === 408
    || result.statusCode === 425
    || result.statusCode === 429
    || result.statusCode >= 500
}

function finalCampaignStatus(
  recipientCount: number,
  sentCount: number,
  failedCount: number,
): BroadcastCampaignStatus {
  if (sentCount === recipientCount) return 'completed'
  if (failedCount === recipientCount) return 'failed'
  return 'partial'
}

export async function processBroadcastCampaign(
  campaignId: string,
  actorId: string,
  dependencies: BroadcastProcessDependencies = {},
): Promise<BroadcastProcessResult | null> {
  const repository = dependencies.repository ?? new SupabaseBroadcastRepository()
  const campaign = await repository.claimCampaign(campaignId)
  if (!campaign) return null

  const processing = await repository.loadDispatchRecipients(campaign.id)
  const batchNumbers = [...new Set(processing.map((recipient) => recipient.batch_number))]
  const deliveryRecipients = await repository.loadDeliveryRecipients(campaign.id, batchNumbers)
  let environment: EmailEnvironment | null

  try {
    environment = dependencies.environment === undefined
      ? getEmailEnvironment()
      : dependencies.environment
  } catch {
    environment = null
  }

  let deliveryResults: BroadcastRecipientDeliveryResult[]
  if (!environment) {
    deliveryResults = failureResults(
      processing,
      'configuration_missing',
      'La configuracion de correo no esta disponible',
    )
  } else {
    try {
      const messages: BroadcastDeliveryMessage[] = deliveryRecipients.map((recipient) => ({
        ...buildBroadcastEmail({
          to: recipient.email,
          subject: campaign.subject,
          message: campaign.message_text,
          cta: campaign.cta_key,
        }, environment),
        batchNumber: recipient.batch_number,
        idempotencyKey: recipient.idempotency_key,
      }))
      const transport = dependencies.transport ?? new ResendBroadcastEmailTransport(environment.apiKey)
      deliveryResults = await transport.send(messages)
    } catch {
      deliveryResults = failureResults(
        processing,
        'processing_error',
        'No fue posible preparar o enviar la difusion',
      )
    }
  }

  await repository.saveDeliveryResults(processing, deliveryResults, (dependencies.now ?? new Date()).toISOString())

  const recipients = await repository.loadAllRecipients(campaign.id)
  const sentCount = recipients.filter((recipient) => recipient.status === 'sent').length
  const failedCount = recipients.filter((recipient) => recipient.status === 'failed').length
  const status = finalCampaignStatus(campaign.recipient_count, sentCount, failedCount)
  const completedAt = (dependencies.now ?? new Date()).toISOString()
  await repository.updateCampaign(campaign.id, {
    status,
    sent_count: sentCount,
    failed_count: failedCount,
    completed_at: completedAt,
  })

  const audit = dependencies.audit ?? writeAuditLog
  await audit(actorId, 'broadcast.dispatched', 'broadcast_campaign', campaign.id, {
    dispatch_version: campaign.dispatch_version,
    recipient_count: campaign.recipient_count,
    processed_count: processing.length,
    sent_count: sentCount,
    failed_count: failedCount,
    status,
  })

  return {
    campaignId: campaign.id,
    dispatchVersion: campaign.dispatch_version,
    status,
    sentCount,
    failedCount,
  }
}

export async function safelyProcessBroadcastCampaign(
  campaignId: string,
  actorId: string,
): Promise<void> {
  try {
    await processBroadcastCampaign(campaignId, actorId)
  } catch {
    // La campana y sus destinatarios conservan el estado durable para un reintento posterior.
  }
}
