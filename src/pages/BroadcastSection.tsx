import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { StatusMessage } from '@/components/system/StatusMessage'
import { RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { authenticatedApiRequest, errorMessage } from '@/lib/api'
import {
  BROADCAST_IMPORT_BYTES_LIMIT,
  BROADCAST_RECIPIENT_LIMIT,
  BroadcastRecipientParseError,
  parseBroadcastRecipients,
} from '@/lib/broadcast-recipients'
import { formatEcuadorDateTime } from '@/lib/dates'
import { CreditBroadcastSection } from '@/pages/CreditBroadcastSection'
import type {
  BroadcastCampaignSummary,
  BroadcastListResult,
  CreateBroadcastInput,
  CreateBroadcastResult,
  RetryBroadcastInput,
  RetryBroadcastResult,
} from '@/types/api'

interface BroadcastSectionProps {
  eventId: string
}

interface RecipientSummary {
  uniqueEmails: string[]
  duplicateCount: number
  invalidCount: number
  limitError: string | null
}

interface Feedback {
  kind: 'error' | 'success' | 'info'
  message: string
}

type BroadcastCampaign = BroadcastCampaignSummary
type BroadcastStatus = BroadcastCampaign['status']
type BroadcastCtaKey = CreateBroadcastInput['ctaKey']
type BroadcastKind = BroadcastCampaign['kind']

const CTA_OPTIONS: readonly { value: BroadcastCtaKey; label: string; path: string }[] = [
  { value: 'none', label: 'Sin botón', path: '' },
  { value: 'landing', label: 'Ver OpenAI Build Week Manta', path: '/' },
  { value: 'registration', label: 'Registrar equipo', path: '/registro' },
  { value: 'team_portal', label: 'Abrir portal del equipo', path: '/equipo' },
  { value: 'staff_login', label: 'Iniciar sesión', path: '/login' },
]

function analyzeRecipients(value: string): RecipientSummary {
  try {
    const result = parseBroadcastRecipients(value)
    return {
      uniqueEmails: result.emails,
      duplicateCount: result.duplicates.length,
      invalidCount: result.invalid.length,
      limitError: null,
    }
  } catch (error) {
    if (error instanceof BroadcastRecipientParseError) {
      return { uniqueEmails: [], duplicateCount: 0, invalidCount: 0, limitError: error.message }
    }
    throw error
  }
}

function ctaKeyFromValue(value: string): BroadcastCtaKey {
  const option = CTA_OPTIONS.find((candidate) => candidate.value === value)
  return option?.value ?? 'none'
}

function ctaLabel(ctaKey: BroadcastCtaKey): string {
  switch (ctaKey) {
    case 'none':
      return 'Sin botón'
    case 'landing':
      return 'Landing del evento'
    case 'registration':
      return 'Registro de equipo'
    case 'team_portal':
      return 'Portal del equipo'
    case 'staff_login':
      return 'Inicio de sesión'
    default: {
      const exhaustiveCheck: never = ctaKey
      return exhaustiveCheck
    }
  }
}

function campaignKindLabel(kind: BroadcastKind): string {
  switch (kind) {
    case 'message':
      return 'Mensaje general'
    case 'credit':
      return 'Entrega de créditos'
    default: {
      const exhaustiveCheck: never = kind
      return exhaustiveCheck
    }
  }
}

function campaignStatusLabel(status: BroadcastStatus): string {
  switch (status) {
    case 'queued':
      return 'En cola'
    case 'processing':
      return 'Enviando'
    case 'completed':
      return 'Completada'
    case 'partial':
      return 'Parcial'
    case 'failed':
      return 'Fallida'
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function resumeActionLabel(campaign: BroadcastCampaign): string {
  switch (campaign.resumeKind) {
    case 'start':
      return 'Reanudar envio'
    case 'recover':
      return 'Recuperar envio'
    case 'retry':
      return `Reintentar ${campaign.retryableFailedCount}`
    case null:
      return 'Sin acciones'
    default: {
      const exhaustiveCheck: never = campaign.resumeKind
      return exhaustiveCheck
    }
  }
}

export function BroadcastSection({ eventId }: BroadcastSectionProps) {
  const [mode, setMode] = useState<BroadcastKind>('message')
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [ctaKey, setCtaKey] = useState<BroadcastCtaKey>('none')
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [confirmingRetryId, setConfirmingRetryId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(crypto.randomUUID())

  const recipientSummary = useMemo(() => analyzeRecipients(recipients), [recipients])
  const selectedCta = CTA_OPTIONS.find((option) => option.value === ctaKey) ?? CTA_OPTIONS[0]
  const busy = submitting || retryingId !== null
  const canSubmit = confirmed
    && !busy
    && recipientSummary.uniqueEmails.length > 0
    && recipientSummary.uniqueEmails.length <= BROADCAST_RECIPIENT_LIMIT
    && recipientSummary.invalidCount === 0
    && recipientSummary.limitError === null

  const loadCampaigns = useCallback(async () => {
    setLoadingHistory(true)
    setHistoryError(null)

    try {
      const result = await authenticatedApiRequest<BroadcastListResult>('/api/admin/broadcasts')
      setCampaigns(result.campaigns)
    } catch (error) {
      setHistoryError(errorMessage(error))
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  const resetDraftConfirmation = () => {
    setConfirmed(false)
    setFeedback(null)
  }

  const updateRecipients = (value: string) => {
    setRecipients(value)
    setSelectedFileName(null)
    resetDraftConfirmation()
  }

  const loadRecipientFile = async (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.currentTarget.files?.[0]
    if (!file) return

    const lowerCaseName = file.name.toLowerCase()
    if (!lowerCaseName.endsWith('.txt') && !lowerCaseName.endsWith('.csv')) {
      setFeedback({ kind: 'error', message: 'Selecciona un archivo .txt o .csv.' })
      changeEvent.currentTarget.value = ''
      return
    }
    if (file.size > BROADCAST_IMPORT_BYTES_LIMIT) {
      setFeedback({ kind: 'error', message: 'El archivo supera el límite de 256 KiB.' })
      changeEvent.currentTarget.value = ''
      return
    }

    try {
      const fileContents = await file.text()
      setRecipients(fileContents)
      setSelectedFileName(file.name)
      resetDraftConfirmation()
      setFeedback({ kind: 'info', message: `Se cargó ${file.name}. Revisa el conteo antes de confirmar.` })
    } catch (error) {
      setFeedback({ kind: 'error', message: `No se pudo leer el archivo: ${errorMessage(error)}` })
      changeEvent.currentTarget.value = ''
    }
  }

  const submitBroadcast = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()

    if (!confirmed) {
      setFeedback({ kind: 'error', message: 'Confirma que revisaste el contenido y los destinatarios.' })
      return
    }
    if (recipientSummary.uniqueEmails.length === 0) {
      setFeedback({ kind: 'error', message: 'Agrega al menos un correo válido.' })
      return
    }
    if (recipientSummary.invalidCount > 0) {
      setFeedback({ kind: 'error', message: 'Corrige los correos no válidos antes de enviar.' })
      return
    }
    if (recipientSummary.limitError) {
      setFeedback({ kind: 'error', message: recipientSummary.limitError })
      return
    }
    if (recipientSummary.uniqueEmails.length > BROADCAST_RECIPIENT_LIMIT) {
      setFeedback({ kind: 'error', message: `El máximo permitido es de ${BROADCAST_RECIPIENT_LIMIT} destinatarios por envío.` })
      return
    }

    const input: CreateBroadcastInput = {
      requestId: requestIdRef.current,
      eventId,
      subject: subject.trim(),
      message: message.trim(),
      ctaKey,
      recipients,
    }

    setSubmitting(true)
    setFeedback({ kind: 'info', message: 'Creando la difusión y preparando los envíos...' })

    try {
      const result = await authenticatedApiRequest<CreateBroadcastResult>('/api/admin/broadcasts', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const duplicateDetail = result.duplicateCount > 0
        ? ` Se omitieron ${result.duplicateCount} duplicados.`
        : ''
      setFeedback({
        kind: 'success',
        message: `Difusión creada para ${result.recipientCount} destinatarios.${duplicateDetail}`,
      })
      setRecipients('')
      setSubject('')
      setMessage('')
      setCtaKey('none')
      setSelectedFileName(null)
      setConfirmed(false)
      requestIdRef.current = crypto.randomUUID()
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadCampaigns()
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  const retryBroadcast = async (campaignId: string) => {
    const input: RetryBroadcastInput = { action: 'resume', campaignId }
    setRetryingId(campaignId)
    setConfirmingRetryId(null)
    setFeedback({ kind: 'info', message: 'Preparando la reanudacion segura de la difusion...' })

    try {
      const result = await authenticatedApiRequest<RetryBroadcastResult>('/api/admin/broadcasts', {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
      setFeedback({
        kind: 'success',
        message: `Se programaron ${result.eligibleCount} destinatarios recuperables.`,
      })
      await loadCampaigns()
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <section className="broadcast-section" aria-labelledby="broadcast-title">
      <header className="broadcast-section-heading">
        <div>
          <p className="system-eyebrow">Difusión</p>
          <h2 id="broadcast-title">Comunicaciones a participantes</h2>
        </div>
        <p>Importa destinatarios, revisa el mensaje y confirma cada envío antes de ponerlo en cola.</p>
      </header>

      <div className="broadcast-mode-switch" role="tablist" aria-label="Tipo de difusión">
        <button
          className={`system-button${mode === 'message' ? ' system-button-primary' : ''}`}
          type="button"
          role="tab"
          aria-selected={mode === 'message'}
          disabled={busy}
          onClick={() => setMode('message')}
        >
          Mensaje general
        </button>
        <button
          className={`system-button${mode === 'credit' ? ' system-button-primary' : ''}`}
          type="button"
          role="tab"
          aria-selected={mode === 'credit'}
          disabled={busy}
          onClick={() => setMode('credit')}
        >
          Entrega de créditos
        </button>
      </div>

      {mode === 'credit' ? (
        <CreditBroadcastSection eventId={eventId} onCreated={loadCampaigns} />
      ) : (
      <form
        className="system-card system-form broadcast-form"
        aria-busy={busy}
        onSubmit={(submitEvent) => void submitBroadcast(submitEvent)}
      >
        <RequiredFieldsLegend />
        <div className="broadcast-layout">
          <div className="broadcast-fields">
            <label>
              <RequiredFieldLabel>Correos de destinatarios</RequiredFieldLabel>
              <textarea
                value={recipients}
                rows={8}
                maxLength={BROADCAST_IMPORT_BYTES_LIMIT}
                placeholder={'persona@ejemplo.com\notra@ejemplo.com'}
                required
                disabled={busy}
                aria-invalid={recipientSummary.invalidCount > 0}
                aria-describedby="broadcast-recipient-help broadcast-recipient-count"
                onChange={(changeEvent) => updateRecipients(changeEvent.currentTarget.value)}
              />
            </label>

            <div className="broadcast-recipient-panel">
              <label className="broadcast-file">
                Importar archivo .txt o .csv
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  disabled={busy}
                  onChange={(changeEvent) => void loadRecipientFile(changeEvent)}
                />
              </label>
              <p id="broadcast-recipient-help" className="broadcast-file-note">
                Máximo 256 KiB y 500 correos únicos. Para CSV usa una columna titulada email o correo; tambien puedes pegar una direccion por linea.
                {selectedFileName ? ` Archivo cargado: ${selectedFileName}.` : ''}
              </p>
              <div id="broadcast-recipient-count" className="broadcast-recipient-meta" aria-live="polite">
                <span><strong>{recipientSummary.uniqueEmails.length}</strong> válidos</span>
                <span><strong>{recipientSummary.duplicateCount}</strong> duplicados</span>
                <span className={recipientSummary.invalidCount > 0 ? 'broadcast-count-warning' : undefined}>
                  <strong>{recipientSummary.invalidCount}</strong> no válidos
                </span>
              </div>
              {recipientSummary.invalidCount > 0 ? (
                <p className="broadcast-recipient-warning" role="alert">Corrige los correos no válidos antes de enviar.</p>
              ) : null}
              {recipientSummary.limitError ? (
                <p className="broadcast-recipient-warning" role="alert">{recipientSummary.limitError}</p>
              ) : null}
              {recipientSummary.uniqueEmails.length > BROADCAST_RECIPIENT_LIMIT ? (
                <p className="broadcast-recipient-warning" role="alert">Reduce la lista a un máximo de {BROADCAST_RECIPIENT_LIMIT} correos únicos.</p>
              ) : null}
            </div>

            <label>
              <RequiredFieldLabel>Asunto</RequiredFieldLabel>
              <input
                value={subject}
                maxLength={150}
                required
                disabled={busy}
                placeholder="Información importante de la Buildathon"
                onChange={(changeEvent) => {
                  setSubject(changeEvent.currentTarget.value)
                  resetDraftConfirmation()
                }}
              />
            </label>

            <label>
              <RequiredFieldLabel>Mensaje</RequiredFieldLabel>
              <textarea
                value={message}
                rows={10}
                maxLength={5000}
                required
                disabled={busy}
                placeholder="Explica el siguiente paso y la información que deben revisar."
                onChange={(changeEvent) => {
                  setMessage(changeEvent.currentTarget.value)
                  resetDraftConfirmation()
                }}
              />
            </label>

            <label>
              Botón de acción
              <select
                value={ctaKey}
                disabled={busy}
                onChange={(changeEvent) => {
                  setCtaKey(ctaKeyFromValue(changeEvent.currentTarget.value))
                  resetDraftConfirmation()
                }}
              >
                {CTA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <aside className="broadcast-preview" aria-label="Vista previa del correo">
            <div className="broadcast-preview-header">
              <span>Vista previa</span>
              <small>{recipientSummary.uniqueEmails.length} destinatarios</small>
            </div>
            <h3 className="broadcast-preview-subject">{subject.trim() || 'Asunto del mensaje'}</h3>
            <p className="broadcast-preview-message">
              {message.trim() || 'El contenido del mensaje aparecerá aquí para que puedas revisarlo antes del envío.'}
            </p>
            {selectedCta.value === 'none' ? (
              <p className="broadcast-preview-no-cta">Este correo no incluirá un botón de acción.</p>
            ) : (
              <div className="broadcast-preview-cta">
                <span>{selectedCta.label}</span>
                <small>{selectedCta.path}</small>
              </div>
            )}
            <div className="broadcast-preview-recipients">
              <strong>Muestra de destinatarios</strong>
              {recipientSummary.uniqueEmails.length === 0 ? (
                <p>Aun no hay correos validos.</p>
              ) : (
                <ul>
                  {recipientSummary.uniqueEmails.slice(0, 5).map((email) => <li key={email}>{email}</li>)}
                </ul>
              )}
              {recipientSummary.uniqueEmails.length > 5
                ? <small>y {recipientSummary.uniqueEmails.length - 5} más</small>
                : null}
            </div>
          </aside>
        </div>

        <label className="broadcast-confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy}
            onChange={(changeEvent) => setConfirmed(changeEvent.currentTarget.checked)}
          />
          <span>Confirmo que revisé el asunto, el mensaje, el enlace y la lista de destinatarios.</span>
        </label>

        {feedback ? <StatusMessage kind={feedback.kind}>{feedback.message}</StatusMessage> : null}

        <div className="broadcast-actions">
          <button className="system-button system-button-primary broadcast-submit-button" type="submit" disabled={!canSubmit}>
            {submitting ? 'Preparando envío...' : 'Enviar difusión'}
          </button>
          <small>El envío solo comienza después de esta confirmación. No se realizan envíos automáticos.</small>
        </div>
      </form>
      )}

      <section className="system-card broadcast-history" aria-labelledby="broadcast-history-title">
        <header className="broadcast-history-heading">
          <div>
            <p className="system-eyebrow">Historial</p>
            <h2 id="broadcast-history-title">Difusiones recientes</h2>
          </div>
          <button className="system-button" type="button" disabled={busy || loadingHistory} onClick={() => void loadCampaigns()}>
            {loadingHistory ? 'Actualizando...' : 'Actualizar'}
          </button>
        </header>

        {historyError ? <StatusMessage kind="error">{historyError}</StatusMessage> : null}
        {loadingHistory ? <p className="broadcast-history-state">Cargando historial...</p> : null}
        {!loadingHistory && !historyError && campaigns.length === 0 ? (
          <div className="broadcast-empty">
            <strong>Aún no hay difusiones</strong>
            <p>Cuando confirmes el primer envio, su progreso y resultados apareceran aqui.</p>
          </div>
        ) : null}

        {!loadingHistory && campaigns.length > 0 ? (
          <div className="responsive-table broadcast-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Mensaje</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Entrega</th>
                  <th scope="col">Creada</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.subject}</strong>
                      <small>{campaign.kind === 'credit' ? campaignKindLabel(campaign.kind) : ctaLabel(campaign.cta_key)}</small>
                    </td>
                    <td>
                      <span className={`status-pill broadcast-status broadcast-status-${campaign.status}`}>
                        {campaignStatusLabel(campaign.status)}
                      </span>
                    </td>
                    <td>
                      <div className="broadcast-counts">
                        <strong>{campaign.sent_count} enviados</strong>
                        <span>{campaign.failed_count} fallidos</span>
                        {campaign.retryableFailedCount > 0 ? (
                          <small>{campaign.retryableFailedCount} recuperables</small>
                        ) : null}
                        {campaign.permanentFailedCount > 0 ? (
                          <small>{campaign.permanentFailedCount} permanentes o agotados</small>
                        ) : null}
                        {campaign.status === 'processing' && !campaign.resumable && campaign.resumableAt ? (
                          <small>Recuperable desde {formatEcuadorDateTime(campaign.resumableAt)}</small>
                        ) : null}
                        <small>{campaign.recipient_count} total</small>
                      </div>
                    </td>
                    <td>{formatEcuadorDateTime(campaign.created_at)}</td>
                    <td>
                      {campaign.resumable && campaign.resumeKind ? (
                        confirmingRetryId === campaign.id ? (
                          <div className="broadcast-retry-confirm">
                            <button
                              className="system-button system-button-primary broadcast-retry-button"
                              type="button"
                              disabled={busy}
                              onClick={() => void retryBroadcast(campaign.id)}
                            >
                              Confirmar {resumeActionLabel(campaign).toLowerCase()}
                            </button>
                            <button
                              className="system-button broadcast-retry-button"
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmingRetryId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            className="system-button"
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmingRetryId(campaign.id)}
                          >
                            {resumeActionLabel(campaign)}
                          </button>
                        )
                      ) : (
                        <span className="broadcast-no-action">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  )
}
