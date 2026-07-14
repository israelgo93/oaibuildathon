import { waitUntil } from '@vercel/functions'
import type {
  BroadcastCampaignSummary,
  BroadcastListResult,
  BroadcastResumeKind,
  CreateBroadcastInput,
  CreateBroadcastResult,
  RetryBroadcastInput,
  RetryBroadcastResult,
} from '../../src/types/api.js'
import type { Json, Tables } from '../../src/types/database.js'
import { writeAuditLog } from '../audit.js'
import { requireRole } from '../auth.js'
import { BroadcastRecipientParseError, parseBroadcastRecipients } from '../broadcast-email.js'
import { safelyProcessBroadcastCampaign } from '../broadcast-service.js'
import { HttpError, parseJsonBody, requireMethod, setPrivateResponse, withErrorHandling } from '../http.js'
import { getServerSupabase } from '../supabase.js'
import { broadcastSchema, retryBroadcastSchema } from '../validation.js'

function scheduleBroadcast(campaignId: string, actorId: string): void {
  const task = safelyProcessBroadcastCampaign(campaignId, actorId)
  try {
    waitUntil(task)
  } catch {
    void task
  }
}

type BroadcastRecipientState = Pick<
  Tables<'broadcast_recipients'>,
  'campaign_id' | 'status' | 'retryable' | 'attempts'
>

const PROCESSING_RECOVERY_DELAY_MS = 15 * 60 * 1000

function summarizeCampaign(
  campaign: Tables<'broadcast_campaigns'>,
  recipientStates: BroadcastRecipientState[],
  now: Date,
): BroadcastCampaignSummary {
  const retryableFailedCount = recipientStates.filter((recipient) => (
    recipient.status === 'failed' && recipient.retryable && recipient.attempts < 20
  )).length
  const permanentFailedCount = recipientStates.filter((recipient) => (
    recipient.status === 'failed' && (!recipient.retryable || recipient.attempts >= 20)
  )).length
  let eligibleCount = 0
  let resumeKind: BroadcastResumeKind | null = null
  let resumableAt: string | null = null

  switch (campaign.status) {
    case 'queued':
      eligibleCount = recipientStates.filter((recipient) => (
        recipient.status === 'pending' && recipient.retryable && recipient.attempts < 20
      )).length
      resumeKind = eligibleCount > 0 ? 'start' : null
      break
    case 'processing': {
      const recoveryTime = new Date(new Date(campaign.updated_at).getTime() + PROCESSING_RECOVERY_DELAY_MS)
      resumableAt = recoveryTime.toISOString()
      if (now.getTime() >= recoveryTime.getTime()) {
        eligibleCount = recipientStates.filter((recipient) => (
          recipient.status === 'processing' && recipient.retryable && recipient.attempts < 20
        )).length
        resumeKind = eligibleCount > 0 ? 'recover' : null
      }
      break
    }
    case 'partial':
    case 'failed':
      eligibleCount = retryableFailedCount
      resumeKind = eligibleCount > 0 ? 'retry' : null
      break
    case 'completed':
      break
    default: {
      const exhaustiveCheck: never = campaign.status
      return exhaustiveCheck
    }
  }

  return {
    ...campaign,
    retryableFailedCount,
    permanentFailedCount,
    resumable: eligibleCount > 0 && resumeKind !== null,
    resumeKind,
    resumableAt,
  }
}

async function listBroadcasts(now = new Date()): Promise<BroadcastListResult> {
  const { data, error } = await getServerSupabase()
    .from('broadcast_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new HttpError(500, 'No fue posible cargar las difusiones')
  const campaigns: Tables<'broadcast_campaigns'>[] = data ?? []
  if (campaigns.length === 0) return { campaigns: [] }

  const { data: recipientStateRaw, error: recipientStateError } = await getServerSupabase()
    .from('broadcast_recipients')
    .select('campaign_id,status,retryable,attempts')
    .in('campaign_id', campaigns.map((campaign) => campaign.id))
  if (recipientStateError) throw new HttpError(500, 'No fue posible cargar el estado de las difusiones')
  const recipientStates = (recipientStateRaw ?? []) as BroadcastRecipientState[]

  return {
    campaigns: campaigns.map((campaign) => summarizeCampaign(
      campaign,
      recipientStates.filter((recipient) => recipient.campaign_id === campaign.id),
      now,
    )),
  }
}

async function createBroadcast(
  body: unknown,
  actorId: string,
): Promise<CreateBroadcastResult> {
  const input: CreateBroadcastInput = broadcastSchema.parse(body)
  let parsed: ReturnType<typeof parseBroadcastRecipients>
  try {
    parsed = parseBroadcastRecipients(input.recipients)
  } catch (error) {
    if (error instanceof BroadcastRecipientParseError) throw new HttpError(400, error.message)
    throw error
  }

  if (parsed.invalid.length > 0) {
    throw new HttpError(400, `El listado contiene ${parsed.invalid.length} correo(s) no valido(s)`)
  }
  if (parsed.emails.length === 0) {
    throw new HttpError(400, 'Agrega al menos un correo valido')
  }

  const recipients: Json = parsed.emails
  const { data: campaignRaw, error } = await getServerSupabase().rpc('create_broadcast_campaign', {
    p_event_id: input.eventId,
    p_created_by: actorId,
    p_request_id: input.requestId,
    p_subject: input.subject,
    p_message_text: input.message,
    p_cta_key: input.ctaKey,
    p_recipients: recipients,
  })
  if (error || !campaignRaw) throw new HttpError(400, 'No fue posible crear la difusion')
  const campaign = campaignRaw as Tables<'broadcast_campaigns'>

  await writeAuditLog(actorId, 'broadcast.created', 'broadcast_campaign', campaign.id, {
    recipient_count: campaign.recipient_count,
    duplicate_count: parsed.duplicates.length,
    cta_key: campaign.cta_key,
  })
  scheduleBroadcast(campaign.id, actorId)

  return {
    campaignId: campaign.id,
    recipientCount: campaign.recipient_count,
    duplicateCount: parsed.duplicates.length,
    status: campaign.status,
  }
}

async function resumeBroadcast(body: unknown, actorId: string): Promise<RetryBroadcastResult> {
  const input: RetryBroadcastInput = retryBroadcastSchema.parse(body)
  const supabase = getServerSupabase()
  const { data: campaignRaw, error: campaignError } = await supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('id', input.campaignId)
    .single()
  if (campaignError || !campaignRaw) throw new HttpError(404, 'La difusion no existe')
  const campaign = campaignRaw as Tables<'broadcast_campaigns'>

  const { data: recipientStateRaw, error: recipientStateError } = await supabase
    .from('broadcast_recipients')
    .select('campaign_id,status,retryable,attempts')
    .eq('campaign_id', campaign.id)
  if (recipientStateError) throw new HttpError(500, 'No fue posible preparar la reanudacion')
  const recipientStates = (recipientStateRaw ?? []) as BroadcastRecipientState[]
  const summary = summarizeCampaign(campaign, recipientStates, new Date())
  if (!summary.resumable || !summary.resumeKind) {
    throw new HttpError(409, 'La difusion no tiene envios recuperables en este momento')
  }
  const eligibleCount = summary.resumeKind === 'retry'
    ? summary.retryableFailedCount
    : recipientStates.filter((recipient) => (
        recipient.retryable
        && recipient.attempts < 20
        && recipient.status === (summary.resumeKind === 'start' ? 'pending' : 'processing')
      )).length

  await writeAuditLog(actorId, 'broadcast.resume_requested', 'broadcast_campaign', campaign.id, {
    eligible_count: eligibleCount,
    resume_kind: summary.resumeKind,
    current_status: campaign.status,
    dispatch_version: campaign.dispatch_version,
  })
  scheduleBroadcast(campaign.id, actorId)
  return {
    campaignId: campaign.id,
    eligibleCount,
    status: 'scheduled',
    resumeKind: summary.resumeKind,
  }
}

export default withErrorHandling(async (request, response) => {
  const method = request.method ?? 'GET'
  requireMethod(request, ['GET', 'POST', 'PATCH'])
  const { profile } = await requireRole(request, ['admin'])

  if (method === 'GET') {
    const result = await listBroadcasts()
    setPrivateResponse(response)
    response.status(200).json(result)
    return
  }

  if (method === 'POST') {
    const result = await createBroadcast(parseJsonBody(request), profile.id)
    setPrivateResponse(response)
    response.status(202).json(result)
    return
  }

  const result = await resumeBroadcast(parseJsonBody(request), profile.id)
  setPrivateResponse(response)
  response.status(202).json(result)
})
