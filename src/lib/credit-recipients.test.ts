import { describe, expect, it } from 'vitest'
import { parseDelimitedTable } from './broadcast-recipients.js'
import {
  CREDIT_RECIPIENT_LIMIT,
  CreditRecipientParseError,
  isValidCodexCreditUrl,
  isValidCreditCode,
  parseCreditRecipientRows,
} from './credit-recipients.js'
import { readXlsxRows, XlsxReadError } from './xlsx.js'

function expectParseError(action: () => unknown, code: CreditRecipientParseError['code']): void {
  try {
    action()
    throw new Error('La operacion debio fallar')
  } catch (error) {
    expect(error).toBeInstanceOf(CreditRecipientParseError)
    if (!(error instanceof CreditRecipientParseError)) return
    expect(error.code).toBe(code)
  }
}

function zipStoredEntry(name: string, content: string): { name: string; data: Uint8Array } {
  return { name, data: new TextEncoder().encode(content) }
}

function buildStoredZip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  const writeUint16 = (view: DataView, position: number, value: number) => view.setUint16(position, value, true)
  const writeUint32 = (view: DataView, position: number, value: number) => view.setUint32(position, value, true)

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    writeUint32(localView, 0, 0x04034b50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 8, 0)
    writeUint32(localView, 18, entry.data.length)
    writeUint32(localView, 22, entry.data.length)
    writeUint16(localView, 26, nameBytes.length)
    localHeader.set(nameBytes, 30)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    writeUint32(centralView, 0, 0x02014b50)
    writeUint16(centralView, 10, 0)
    writeUint32(centralView, 20, entry.data.length)
    writeUint32(centralView, 24, entry.data.length)
    writeUint16(centralView, 28, nameBytes.length)
    writeUint32(centralView, 42, offset)
    centralHeader.set(nameBytes, 46)

    localParts.push(localHeader, entry.data)
    centralParts.push(centralHeader)
    offset += localHeader.length + entry.data.length
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  writeUint32(eocdView, 0, 0x06054b50)
  writeUint16(eocdView, 8, entries.length)
  writeUint16(eocdView, 10, entries.length)
  writeUint32(eocdView, 12, centralSize)
  writeUint32(eocdView, 16, offset)

  const parts = [...localParts, ...centralParts, eocd]
  const total = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let cursor = 0
  for (const part of parts) {
    total.set(part, cursor)
    cursor += part.length
  }
  return total
}

describe('validadores de creditos', () => {
  it('acepta codigos ASCII imprimibles sin espacios entre 4 y 120 caracteres', () => {
    expect(isValidCreditCode('PROMO-1234')).toBe(true)
    expect(isValidCreditCode('abc')).toBe(false)
    expect(isValidCreditCode('con espacios')).toBe(false)
    expect(isValidCreditCode('a'.repeat(121))).toBe(false)
  })

  it('acepta solo URLs HTTPS sin credenciales embebidas', () => {
    expect(isValidCodexCreditUrl('https://chatgpt.com/codex/claim/abc')).toBe(true)
    expect(isValidCodexCreditUrl('http://chatgpt.com/codex')).toBe(false)
    expect(isValidCodexCreditUrl('https://user:pass@chatgpt.com/codex')).toBe(false)
    expect(isValidCodexCreditUrl('no-es-url')).toBe(false)
  })
})

describe('parseCreditRecipientRows', () => {
  it('mapea columnas por encabezado, normaliza correos y deduplica', () => {
    const result = parseCreditRecipientRows([
      ['Correo', 'ApiCredit', 'CodexCredit'],
      ['ANA@Example.com', 'PROMO-ANA-1', 'https://chatgpt.com/codex/claim/ana'],
      ['bob@example.com', 'PROMO-BOB-2', 'https://chatgpt.com/codex/claim/bob'],
      ['ana@example.com', 'PROMO-ANA-3', 'https://chatgpt.com/codex/claim/ana2'],
    ])

    expect(result.recipients).toEqual([
      { email: 'ana@example.com', apiCredit: 'PROMO-ANA-1', codexCredit: 'https://chatgpt.com/codex/claim/ana' },
      { email: 'bob@example.com', apiCredit: 'PROMO-BOB-2', codexCredit: 'https://chatgpt.com/codex/claim/bob' },
    ])
    expect(result.duplicates).toEqual(['ana@example.com'])
    expect(result.invalid).toEqual([])
  })

  it('acepta variantes de encabezado con acentos, espacios y guiones', () => {
    const result = parseCreditRecipientRows([
      ['Correo electrónico', 'Crédito API', 'Codex URL'],
      ['ana@example.com', 'PROMO-1234', 'https://chatgpt.com/codex/claim/ana'],
    ])

    expect(result.recipients).toHaveLength(1)
  })

  it('reporta filas con correo, codigo o URL invalidos sin descartar el resto', () => {
    const result = parseCreditRecipientRows([
      ['correo', 'apicredit', 'codexcredit'],
      ['no-es-correo', 'PROMO-1234', 'https://chatgpt.com/codex/claim/x'],
      ['ana@example.com', 'ab', 'https://chatgpt.com/codex/claim/ana'],
      ['bob@example.com', 'PROMO-5678', 'http://inseguro.com'],
      ['carla@example.com', 'PROMO-9012', 'https://chatgpt.com/codex/claim/carla'],
    ])

    expect(result.recipients).toEqual([
      { email: 'carla@example.com', apiCredit: 'PROMO-9012', codexCredit: 'https://chatgpt.com/codex/claim/carla' },
    ])
    expect(result.invalid).toEqual([
      { row: 2, reason: 'El correo no es valido' },
      { row: 3, reason: 'El codigo apicredit no es valido' },
      { row: 4, reason: 'La URL codexcredit debe ser HTTPS valida' },
    ])
  })

  it('exige las tres columnas en la primera fila', () => {
    expectParseError(
      () => parseCreditRecipientRows([['correo', 'apicredit'], ['ana@example.com', 'PROMO-1234']]),
      'missing_columns',
    )
  })

  it('rechaza archivos sin datos', () => {
    expectParseError(() => parseCreditRecipientRows([]), 'empty_file')
  })

  it('rechaza mas de 500 destinatarios unicos', () => {
    const rows = [
      ['correo', 'apicredit', 'codexcredit'],
      ...Array.from({ length: CREDIT_RECIPIENT_LIMIT + 1 }, (_, index) => [
        `persona${index}@example.com`,
        `PROMO-${index}-XYZ`,
        `https://chatgpt.com/codex/claim/${index}`,
      ]),
    ]

    expectParseError(() => parseCreditRecipientRows(rows), 'too_many_recipients')
  })

  it('procesa un CSV completo usando parseDelimitedTable', () => {
    const rows = parseDelimitedTable(
      'correo,apicredit,codexcredit\r\nana@example.com,PROMO-1234,https://chatgpt.com/codex/claim/ana',
    )
    const result = parseCreditRecipientRows(rows)

    expect(result.recipients).toEqual([
      { email: 'ana@example.com', apiCredit: 'PROMO-1234', codexCredit: 'https://chatgpt.com/codex/claim/ana' },
    ])
  })
})

describe('readXlsxRows', () => {
  it('lee celdas inline, compartidas y numericas de la primera hoja', async () => {
    const sharedStrings = '<?xml version="1.0"?><sst><si><t>correo</t></si><si><r><t>api</t></r><r><t>credit</t></r></si><si><t>ana@example.com</t></si></sst>'
    const sheet = '<?xml version="1.0"?><worksheet><sheetData>'
      + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>codexcredit</t></is></c></row>'
      + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="inlineStr"><is><t>PROMO-1234</t></is></c><c r="C2" t="inlineStr"><is><t>https://chatgpt.com/codex/claim/ana?x=1&amp;y=2</t></is></c></row>'
      + '</sheetData></worksheet>'
    const bytes = buildStoredZip([
      zipStoredEntry('xl/sharedStrings.xml', sharedStrings),
      zipStoredEntry('xl/worksheets/sheet1.xml', sheet),
    ])

    const rows = await readXlsxRows(bytes)

    expect(rows).toEqual([
      ['correo', 'apicredit', 'codexcredit'],
      ['ana@example.com', 'PROMO-1234', 'https://chatgpt.com/codex/claim/ana?x=1&y=2'],
    ])
  })

  it('rellena columnas omitidas usando la referencia de celda', async () => {
    const sheet = '<worksheet><sheetData>'
      + '<row r="1"><c r="A1" t="inlineStr"><is><t>correo</t></is></c><c r="C1" t="inlineStr"><is><t>codexcredit</t></is></c></row>'
      + '</sheetData></worksheet>'
    const bytes = buildStoredZip([zipStoredEntry('xl/worksheets/sheet1.xml', sheet)])

    const rows = await readXlsxRows(bytes)

    expect(rows).toEqual([['correo', '', 'codexcredit']])
  })

  it('rechaza archivos que no son ZIP', async () => {
    await expect(readXlsxRows(new TextEncoder().encode('no es un zip'))).rejects.toBeInstanceOf(XlsxReadError)
  })

  it('rechaza un ZIP sin hojas de calculo', async () => {
    const bytes = buildStoredZip([zipStoredEntry('xl/workbook.xml', '<workbook />')])
    await expect(readXlsxRows(bytes)).rejects.toMatchObject({ code: 'missing_worksheet' })
  })
})
