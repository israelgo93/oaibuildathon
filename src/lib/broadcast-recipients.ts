export const BROADCAST_RECIPIENT_LIMIT = 500
export const BROADCAST_IMPORT_BYTES_LIMIT = 256 * 1024
export const BROADCAST_EMAIL_LENGTH_LIMIT = 254

export type BroadcastRecipientParseErrorCode = 'input_too_large' | 'too_many_recipients'

export class BroadcastRecipientParseError extends Error {
  readonly code: BroadcastRecipientParseErrorCode

  constructor(code: BroadcastRecipientParseErrorCode, message: string) {
    super(message)
    this.name = 'BroadcastRecipientParseError'
    this.code = code
  }
}

export interface BroadcastRecipientParseResult {
  emails: string[]
  invalid: string[]
  duplicates: string[]
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_HEADERS = new Set(['email', 'e-mail', 'correo', 'correo electronico'])

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function isBroadcastRecipientEmail(value: string): boolean {
  return value.length <= BROADCAST_EMAIL_LENGTH_LIMIT && EMAIL_PATTERN.test(value)
}

function normalizedHeader(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function firstLogicalLine(source: string): string {
  let insideQuotes = false
  let line = ''

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (insideQuotes && source[index + 1] === '"') {
        line += '""'
        index += 1
        continue
      }
      insideQuotes = !insideQuotes
      line += character
      continue
    }
    if (!insideQuotes && (character === '\r' || character === '\n')) break
    line += character
  }

  return line
}

function delimiterFor(source: string): ',' | ';' | '\t' | null {
  const firstLine = firstLogicalLine(source)
  const counts: { delimiter: ',' | ';' | '\t'; count: number }[] = [
    { delimiter: ',', count: 0 },
    { delimiter: ';', count: 0 },
    { delimiter: '\t', count: 0 },
  ]
  let insideQuotes = false

  for (let index = 0; index < firstLine.length; index += 1) {
    const character = firstLine[index]
    if (character === '"') {
      if (insideQuotes && firstLine[index + 1] === '"') {
        index += 1
        continue
      }
      insideQuotes = !insideQuotes
      continue
    }
    if (insideQuotes) continue
    const match = counts.find((candidate) => candidate.delimiter === character)
    if (match) match.count += 1
  }

  const selected = counts.sort((left, right) => right.count - left.count)[0]
  return selected && selected.count > 0 ? selected.delimiter : null
}

function parseDelimitedRows(source: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let insideQuotes = false

  const pushField = () => {
    row.push(field.trim())
    field = ''
  }
  const pushRow = () => {
    pushField()
    if (row.some((value) => value.length > 0)) rows.push(row)
    row = []
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (insideQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        insideQuotes = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"' && field.trim().length === 0) {
      insideQuotes = true
    } else if (character === delimiter) {
      pushField()
    } else if (character === '\r' || character === '\n') {
      pushRow()
      if (character === '\r' && source[index + 1] === '\n') index += 1
    } else {
      field += character
    }
  }

  if (field.length > 0 || row.length > 0) pushRow()
  return rows
}

function recipientEntries(source: string): string[] {
  const delimiter = delimiterFor(source)
  if (!delimiter) return source.split(/[;,\t\r\n]+/).map((entry) => entry.trim().replace(/^"|"$/g, ''))

  const rows = parseDelimitedRows(source, delimiter)
  const header = rows[0] ?? []
  const emailColumn = header.findIndex((value) => EMAIL_HEADERS.has(normalizedHeader(value)))
  if (emailColumn >= 0) {
    return rows.slice(1).map((row) => row[emailColumn]?.trim() ?? '')
  }

  return rows.flatMap((row) => row.map((entry) => entry.trim()))
}

export function parseBroadcastRecipients(source: string): BroadcastRecipientParseResult {
  if (utf8ByteLength(source) > BROADCAST_IMPORT_BYTES_LIMIT) {
    throw new BroadcastRecipientParseError(
      'input_too_large',
      `El listado no puede superar ${BROADCAST_IMPORT_BYTES_LIMIT} bytes`,
    )
  }

  const entries = recipientEntries(source.replace(/^\uFEFF/, ''))
  const emails: string[] = []
  const invalid: string[] = []
  const duplicates: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const normalized = entry.trim().toLowerCase()
    if (!normalized || EMAIL_HEADERS.has(normalizedHeader(normalized))) continue
    if (!isBroadcastRecipientEmail(normalized)) {
      invalid.push(entry)
      continue
    }
    if (seen.has(normalized)) {
      duplicates.push(normalized)
      continue
    }
    if (emails.length >= BROADCAST_RECIPIENT_LIMIT) {
      throw new BroadcastRecipientParseError(
        'too_many_recipients',
        `La difusion admite un maximo de ${BROADCAST_RECIPIENT_LIMIT} destinatarios unicos`,
      )
    }

    seen.add(normalized)
    emails.push(normalized)
  }

  return { emails, invalid, duplicates }
}
