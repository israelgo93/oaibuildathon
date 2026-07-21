import { isBroadcastRecipientEmail } from './broadcast-recipients.js'

export const CREDIT_RECIPIENT_LIMIT = 500
export const CREDIT_IMPORT_BYTES_LIMIT = 1024 * 1024
export const CREDIT_CODE_MIN_LENGTH = 4
export const CREDIT_CODE_MAX_LENGTH = 120
export const CODEX_CREDIT_URL_MAX_LENGTH = 500

const CREDIT_CODE_PATTERN = /^[\x21-\x7E]+$/

export type CreditRecipientParseErrorCode = 'missing_columns' | 'empty_file' | 'too_many_recipients'

export class CreditRecipientParseError extends Error {
  readonly code: CreditRecipientParseErrorCode

  constructor(code: CreditRecipientParseErrorCode, message: string) {
    super(message)
    this.name = 'CreditRecipientParseError'
    this.code = code
  }
}

export interface CreditRecipient {
  email: string
  apiCredit: string
  codexCredit: string
}

export interface CreditRecipientRowIssue {
  row: number
  reason: string
}

export interface CreditRecipientParseResult {
  recipients: CreditRecipient[]
  invalid: CreditRecipientRowIssue[]
  duplicates: string[]
}

export function isValidCreditCode(value: string): boolean {
  return value.length >= CREDIT_CODE_MIN_LENGTH
    && value.length <= CREDIT_CODE_MAX_LENGTH
    && CREDIT_CODE_PATTERN.test(value)
}

export function isValidCodexCreditUrl(value: string): boolean {
  if (value.length > CODEX_CREDIT_URL_MAX_LENGTH) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
}

function normalizedHeader(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

const EMAIL_HEADERS = new Set(['correo', 'email', 'emails', 'correoelectronico', 'participante'])
const API_CREDIT_HEADERS = new Set(['apicredit', 'creditapi', 'creditoapi', 'apicredito', 'apicreditcode', 'codigoapi'])
const CODEX_CREDIT_HEADERS = new Set(['codexcredit', 'creditcodex', 'creditocodex', 'codexcredito', 'codexurl', 'urlcodex'])

interface CreditColumnMap {
  email: number
  apiCredit: number
  codexCredit: number
}

function creditColumns(header: string[]): CreditColumnMap | null {
  const email = header.findIndex((value) => EMAIL_HEADERS.has(normalizedHeader(value)))
  const apiCredit = header.findIndex((value) => API_CREDIT_HEADERS.has(normalizedHeader(value)))
  const codexCredit = header.findIndex((value) => CODEX_CREDIT_HEADERS.has(normalizedHeader(value)))
  if (email < 0 || apiCredit < 0 || codexCredit < 0) return null
  return { email, apiCredit, codexCredit }
}

export function parseCreditRecipientRows(rows: string[][]): CreditRecipientParseResult {
  const contentRows = rows.filter((row) => row.some((value) => value.trim().length > 0))
  if (contentRows.length === 0) {
    throw new CreditRecipientParseError('empty_file', 'El archivo no contiene filas con datos')
  }

  const columns = creditColumns(contentRows[0])
  if (!columns) {
    throw new CreditRecipientParseError(
      'missing_columns',
      'La primera fila debe incluir las columnas correo, apicredit y codexcredit',
    )
  }

  const recipients: CreditRecipient[] = []
  const invalid: CreditRecipientRowIssue[] = []
  const duplicates: string[] = []
  const seen = new Set<string>()

  for (const [index, row] of contentRows.slice(1).entries()) {
    const rowNumber = index + 2
    const email = (row[columns.email] ?? '').trim().toLowerCase()
    const apiCredit = (row[columns.apiCredit] ?? '').trim()
    const codexCredit = (row[columns.codexCredit] ?? '').trim()

    if (!isBroadcastRecipientEmail(email)) {
      invalid.push({ row: rowNumber, reason: 'El correo no es valido' })
      continue
    }
    if (!isValidCreditCode(apiCredit)) {
      invalid.push({ row: rowNumber, reason: 'El codigo apicredit no es valido' })
      continue
    }
    if (!isValidCodexCreditUrl(codexCredit)) {
      invalid.push({ row: rowNumber, reason: 'La URL codexcredit debe ser HTTPS valida' })
      continue
    }
    if (seen.has(email)) {
      duplicates.push(email)
      continue
    }
    if (recipients.length >= CREDIT_RECIPIENT_LIMIT) {
      throw new CreditRecipientParseError(
        'too_many_recipients',
        `La entrega de creditos admite un maximo de ${CREDIT_RECIPIENT_LIMIT} destinatarios unicos`,
      )
    }

    seen.add(email)
    recipients.push({ email, apiCredit, codexCredit })
  }

  return { recipients, invalid, duplicates }
}
