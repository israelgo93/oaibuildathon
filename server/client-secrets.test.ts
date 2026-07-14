import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('secretos del cliente', () => {
  it('no referencia RESEND_API_KEY desde el codigo que Vite empaqueta', () => {
    const sourceRoot = join(process.cwd(), 'src')
    const bundledSources = sourceFiles(sourceRoot).filter((path) => ['.ts', '.tsx'].includes(extname(path)))
    const references = bundledSources.filter((path) => readFileSync(path, 'utf8').includes('RESEND_API_KEY'))
    expect(references).toEqual([])
  })
})
