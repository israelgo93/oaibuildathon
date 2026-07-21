// Lector minimo de XLSX para listados tabulares pequenos (una hoja, celdas de texto).
// Evita dependencias externas: descomprime con DecompressionStream y extrae el XML con expresiones acotadas.

export type XlsxReadErrorCode = 'invalid_zip' | 'missing_worksheet' | 'unsupported_compression'

export class XlsxReadError extends Error {
  readonly code: XlsxReadErrorCode

  constructor(code: XlsxReadErrorCode, message: string) {
    super(message)
    this.name = 'XlsxReadError'
    this.code = code
  }
}

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  localHeaderOffset: number
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)) + bytes[offset + 3] * 0x1000000
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minimumOffset = Math.max(0, bytes.length - 65_557)
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (
      bytes[offset] === 0x50
      && bytes[offset + 1] === 0x4b
      && bytes[offset + 2] === 0x05
      && bytes[offset + 3] === 0x06
    ) {
      return offset
    }
  }
  throw new XlsxReadError('invalid_zip', 'El archivo no es un XLSX valido')
}

function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(bytes)
  const entryCount = readUint16(bytes, eocdOffset + 10)
  let offset = readUint32(bytes, eocdOffset + 16)
  const entries: ZipEntry[] = []
  const decoder = new TextDecoder('utf-8')

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(bytes, offset) !== 0x02014b50) {
      throw new XlsxReadError('invalid_zip', 'El directorio del XLSX esta danado')
    }
    const method = readUint16(bytes, offset + 10)
    const compressedSize = readUint32(bytes, offset + 20)
    const nameLength = readUint16(bytes, offset + 28)
    const extraLength = readUint16(bytes, offset + 30)
    const commentLength = readUint16(bytes, offset + 32)
    const localHeaderOffset = readUint32(bytes, offset + 42)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    entries.push({ name, method, compressedSize, localHeaderOffset })
    offset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.slice().buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

async function extractEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  if (readUint32(bytes, entry.localHeaderOffset) !== 0x04034b50) {
    throw new XlsxReadError('invalid_zip', 'Una entrada del XLSX esta danada')
  }
  const nameLength = readUint16(bytes, entry.localHeaderOffset + 26)
  const extraLength = readUint16(bytes, entry.localHeaderOffset + 28)
  const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength
  const compressed = bytes.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.method === 0) return new TextDecoder('utf-8').decode(compressed)
  if (entry.method === 8) return new TextDecoder('utf-8').decode(await inflateRaw(compressed))
  throw new XlsxReadError('unsupported_compression', 'El XLSX usa una compresion no soportada')
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (match, entity: string) => {
    if (entity === 'amp') return '&'
    if (entity === 'lt') return '<'
    if (entity === 'gt') return '>'
    if (entity === 'quot') return '"'
    if (entity === 'apos') return "'"
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    return match
  })
}

function textRuns(fragment: string): string {
  let text = ''
  const runPattern = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g
  let run: RegExpExecArray | null
  while ((run = runPattern.exec(fragment)) !== null) {
    text += decodeXmlEntities(run[1])
  }
  return text
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = []
  const itemPattern = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g
  let item: RegExpExecArray | null
  while ((item = itemPattern.exec(xml)) !== null) {
    strings.push(textRuns(item[1]))
  }
  return strings
}

function columnIndexFromReference(reference: string): number | null {
  const letters = reference.match(/^[A-Z]+/)?.[0]
  if (!letters) return null
  let index = 0
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }
  return index - 1
}

function cellValue(attributes: string, inner: string, sharedStrings: string[]): string {
  const type = /\st="([^"]+)"/.exec(attributes)?.[1] ?? ''
  if (type === 'inlineStr') return textRuns(inner)
  const rawValue = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(inner)?.[1]
  if (rawValue === undefined) return ''
  if (type === 's') {
    const sharedIndex = Number.parseInt(decodeXmlEntities(rawValue), 10)
    return Number.isNaN(sharedIndex) ? '' : sharedStrings[sharedIndex] ?? ''
  }
  return decodeXmlEntities(rawValue)
}

function parseWorksheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = []
  const rowPattern = /<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const cells: string[] = []
    const cellPattern = /<c((?:\s[^>]*)?)(?:\/>|>([\s\S]*?)<\/c>)/g
    let cellMatch: RegExpExecArray | null
    let fallbackColumn = 0

    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      const attributes = cellMatch[1] ?? ''
      const reference = /\sr="([^"]+)"/.exec(attributes)?.[1]
      const column = reference ? columnIndexFromReference(reference) ?? fallbackColumn : fallbackColumn
      while (cells.length < column) cells.push('')
      cells[column] = cellValue(attributes, cellMatch[2] ?? '', sharedStrings).trim()
      fallbackColumn = column + 1
    }

    if (cells.some((value) => value.length > 0)) rows.push(cells)
  }

  return rows
}

export async function readXlsxRows(bytes: Uint8Array): Promise<string[][]> {
  const entries = readCentralDirectory(bytes)
  const worksheet = entries
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))[0]
  if (!worksheet) {
    throw new XlsxReadError('missing_worksheet', 'El XLSX no contiene hojas de calculo')
  }

  const sharedStringsEntry = entries.find((entry) => entry.name === 'xl/sharedStrings.xml')
  const sharedStrings = sharedStringsEntry
    ? parseSharedStrings(await extractEntry(bytes, sharedStringsEntry))
    : []

  return parseWorksheetRows(await extractEntry(bytes, worksheet), sharedStrings)
}
