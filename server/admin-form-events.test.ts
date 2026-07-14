import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const adminPage = readFileSync(join(process.cwd(), 'src', 'pages', 'AdminPage.tsx'), 'utf8')

describe('eventos de formularios administrativos', () => {
  it('conserva el formulario antes de esperar operaciones asincronas', () => {
    expect(adminPage).not.toMatch(/currentTarget\.reset\(\)/)
    expect(adminPage.match(/const formElement = \w+\.currentTarget/g)).toHaveLength(5)
    expect(adminPage.match(/formElement\.reset\(\)/g)).toHaveLength(5)
  })
})
