import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { StatusMessage } from '@/components/system/StatusMessage'
import { RequiredFieldLabel, RequiredFieldsLegend } from '@/components/system/FormFieldLabel'
import { authenticatedApiRequest, errorMessage } from '@/lib/api'
import { parseDelimitedTable } from '@/lib/broadcast-recipients'
import {
  CREDIT_IMPORT_BYTES_LIMIT,
  CREDIT_RECIPIENT_LIMIT,
  CreditRecipientParseError,
  parseCreditRecipientRows,
  type CreditRecipientParseResult,
} from '@/lib/credit-recipients'
import { readXlsxRows, XlsxReadError } from '@/lib/xlsx'
import type { CreateBroadcastResult, CreateCreditBroadcastInput } from '@/types/api'

interface CreditBroadcastSectionProps {
  eventId: string
  onCreated: () => Promise<void>
}

interface Feedback {
  kind: 'error' | 'success' | 'info'
  message: string
}

const OPENAI_PROMOTIONS_PATH = 'platform.openai.com / Settings / Organization / Billing / Promotions'

const DEFAULT_SUBJECT = 'Tus créditos de OpenAI y Codex - OpenAI Build Week'
const DEFAULT_MESSAGE = '¡Felicitaciones! Completaste tu check-in en la OpenAI Build Week. '
  + 'Aquí tienes tus créditos para construir durante la Buildathon: un código de créditos para la API de OpenAI '
  + 'y un enlace personal para reclamar tus créditos de Codex.'

export function CreditBroadcastSection({ eventId, onCreated }: CreditBroadcastSectionProps) {
  const [parseResult, setParseResult] = useState<CreditRecipientParseResult | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(crypto.randomUUID())

  const recipients = useMemo(() => parseResult?.recipients ?? [], [parseResult])
  const canSubmit = confirmed
    && !submitting
    && recipients.length > 0
    && (parseResult?.invalid.length ?? 0) === 0

  const resetConfirmation = () => {
    setConfirmed(false)
    setFeedback(null)
  }

  const loadCreditFile = async (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.currentTarget.files?.[0]
    if (!file) return

    const lowerCaseName = file.name.toLowerCase()
    const isXlsx = lowerCaseName.endsWith('.xlsx')
    if (!isXlsx && !lowerCaseName.endsWith('.csv') && !lowerCaseName.endsWith('.txt')) {
      setFeedback({ kind: 'error', message: 'Selecciona un archivo .xlsx, .csv o .txt.' })
      changeEvent.currentTarget.value = ''
      return
    }
    if (file.size > CREDIT_IMPORT_BYTES_LIMIT) {
      setFeedback({ kind: 'error', message: 'El archivo supera el límite de 1 MiB.' })
      changeEvent.currentTarget.value = ''
      return
    }

    try {
      const rows = isXlsx
        ? await readXlsxRows(new Uint8Array(await file.arrayBuffer()))
        : parseDelimitedTable(await file.text())
      const result = parseCreditRecipientRows(rows)
      setParseResult(result)
      setSelectedFileName(file.name)
      resetConfirmation()
      setFeedback({
        kind: result.invalid.length > 0 ? 'error' : 'info',
        message: result.invalid.length > 0
          ? `Se cargó ${file.name}, pero hay filas con errores. Corrígelas y vuelve a importar.`
          : `Se cargó ${file.name}. Revisa el conteo y la vista previa antes de confirmar.`,
      })
    } catch (error) {
      setParseResult(null)
      setSelectedFileName(null)
      if (error instanceof CreditRecipientParseError || error instanceof XlsxReadError) {
        setFeedback({ kind: 'error', message: error.message })
      } else {
        setFeedback({ kind: 'error', message: `No se pudo leer el archivo: ${errorMessage(error)}` })
      }
      changeEvent.currentTarget.value = ''
    }
  }

  const submitCreditBroadcast = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()

    if (!confirmed) {
      setFeedback({ kind: 'error', message: 'Confirma que revisaste los destinatarios y sus créditos.' })
      return
    }
    if (recipients.length === 0) {
      setFeedback({ kind: 'error', message: 'Importa un archivo con al menos un destinatario válido.' })
      return
    }
    if ((parseResult?.invalid.length ?? 0) > 0) {
      setFeedback({ kind: 'error', message: 'Corrige las filas con errores antes de enviar.' })
      return
    }

    const input: CreateCreditBroadcastInput = {
      kind: 'credit',
      requestId: requestIdRef.current,
      eventId,
      subject: subject.trim(),
      message: message.trim(),
      recipients,
    }

    setSubmitting(true)
    setFeedback({ kind: 'info', message: 'Creando la entrega de créditos y preparando los envíos...' })

    try {
      const result = await authenticatedApiRequest<CreateBroadcastResult>('/api/admin/broadcasts', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setFeedback({
        kind: 'success',
        message: `Entrega de créditos creada para ${result.recipientCount} destinatarios.`,
      })
      setParseResult(null)
      setSelectedFileName(null)
      setSubject(DEFAULT_SUBJECT)
      setMessage(DEFAULT_MESSAGE)
      setConfirmed(false)
      requestIdRef.current = crypto.randomUUID()
      if (fileInputRef.current) fileInputRef.current.value = ''
      await onCreated()
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  const sampleRecipient = recipients[0] ?? null

  return (
    <form
      className="system-card system-form broadcast-form"
      aria-busy={submitting}
      onSubmit={(submitEvent) => void submitCreditBroadcast(submitEvent)}
    >
      <RequiredFieldsLegend />
      <div className="broadcast-layout">
        <div className="broadcast-fields">
          <div className="broadcast-recipient-panel">
            <label className="broadcast-file">
              <RequiredFieldLabel>Importar archivo .xlsx, .csv o .txt</RequiredFieldLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                disabled={submitting}
                onChange={(changeEvent) => void loadCreditFile(changeEvent)}
              />
            </label>
            <p className="broadcast-file-note">
              La primera fila debe tener las columnas <strong>correo</strong>, <strong>apicredit</strong> y{' '}
              <strong>codexcredit</strong>. Máximo {CREDIT_RECIPIENT_LIMIT} destinatarios únicos y 1 MiB.
              {selectedFileName ? ` Archivo cargado: ${selectedFileName}.` : ''}
            </p>
            <div className="broadcast-recipient-meta" aria-live="polite">
              <span><strong>{recipients.length}</strong> válidos</span>
              <span><strong>{parseResult?.duplicates.length ?? 0}</strong> duplicados</span>
              <span className={(parseResult?.invalid.length ?? 0) > 0 ? 'broadcast-count-warning' : undefined}>
                <strong>{parseResult?.invalid.length ?? 0}</strong> con errores
              </span>
            </div>
            {parseResult && parseResult.invalid.length > 0 ? (
              <div className="broadcast-recipient-warning" role="alert">
                <p>Corrige estas filas antes de enviar:</p>
                <ul>
                  {parseResult.invalid.slice(0, 5).map((issue) => (
                    <li key={issue.row}>Fila {issue.row}: {issue.reason}</li>
                  ))}
                </ul>
                {parseResult.invalid.length > 5 ? <small>y {parseResult.invalid.length - 5} más</small> : null}
              </div>
            ) : null}
          </div>

          <label>
            <RequiredFieldLabel>Asunto</RequiredFieldLabel>
            <input
              value={subject}
              maxLength={150}
              required
              disabled={submitting}
              onChange={(changeEvent) => {
                setSubject(changeEvent.currentTarget.value)
                resetConfirmation()
              }}
            />
          </label>

          <label>
            <RequiredFieldLabel>Mensaje de introducción</RequiredFieldLabel>
            <textarea
              value={message}
              rows={6}
              maxLength={5000}
              required
              disabled={submitting}
              onChange={(changeEvent) => {
                setMessage(changeEvent.currentTarget.value)
                resetConfirmation()
              }}
            />
          </label>

          <p className="broadcast-file-note">
            La plantilla agrega automáticamente el código de créditos de la API con los pasos para canjearlo en{' '}
            {OPENAI_PROMOTIONS_PATH}, y un botón personal para reclamar los créditos de Codex.
          </p>
        </div>

        <aside className="broadcast-preview" aria-label="Vista previa del correo de créditos">
          <div className="broadcast-preview-header">
            <span>Vista previa</span>
            <small>{recipients.length} destinatarios</small>
          </div>
          <h3 className="broadcast-preview-subject">{subject.trim() || 'Asunto del mensaje'}</h3>
          <p className="broadcast-preview-message">
            {message.trim() || 'El mensaje de introducción aparecerá aquí.'}
          </p>
          <div className="broadcast-preview-cta">
            <span>Créditos para la API de OpenAI</span>
            <small>{sampleRecipient ? `Código: ${sampleRecipient.apiCredit}` : 'Código personal de cada fila'}</small>
            <small>Canjear en {OPENAI_PROMOTIONS_PATH}</small>
          </div>
          <div className="broadcast-preview-cta">
            <span>Reclamar créditos de Codex</span>
            <small>{sampleRecipient ? sampleRecipient.codexCredit : 'Enlace personal de cada fila'}</small>
          </div>
          <div className="broadcast-preview-recipients">
            <strong>Muestra de destinatarios</strong>
            {recipients.length === 0 ? (
              <p>Aún no hay destinatarios válidos.</p>
            ) : (
              <ul>
                {recipients.slice(0, 5).map((recipient) => <li key={recipient.email}>{recipient.email}</li>)}
              </ul>
            )}
            {recipients.length > 5 ? <small>y {recipients.length - 5} más</small> : null}
          </div>
        </aside>
      </div>

      <label className="broadcast-confirmation">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={submitting}
          onChange={(changeEvent) => setConfirmed(changeEvent.currentTarget.checked)}
        />
        <span>Confirmo que revisé el asunto, el mensaje, los códigos y los enlaces de cada destinatario.</span>
      </label>

      {feedback ? <StatusMessage kind={feedback.kind}>{feedback.message}</StatusMessage> : null}

      <div className="broadcast-actions">
        <button className="system-button system-button-primary broadcast-submit-button" type="submit" disabled={!canSubmit}>
          {submitting ? 'Preparando envío...' : 'Enviar créditos'}
        </button>
        <small>Cada destinatario recibe su propio código de API y su enlace de Codex. No se realizan envíos automáticos.</small>
      </div>
    </form>
  )
}
