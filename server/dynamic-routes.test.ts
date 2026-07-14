import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiHandler, ApiRequest, ApiResponse } from './types.js'

const routeSpies = vi.hoisted(() => ({
  authMe: vi.fn(async () => undefined),
  passwordRecovery: vi.fn(async () => undefined),
  broadcasts: vi.fn(async () => undefined),
  staffAccess: vi.fn(async () => undefined),
}))

vi.mock('./routes/auth-me.js', () => ({ default: routeSpies.authMe }))
vi.mock('./routes/auth-password-recovery.js', () => ({ default: routeSpies.passwordRecovery }))
vi.mock('./routes/admin-broadcasts.js', () => ({ default: routeSpies.broadcasts }))
vi.mock('./routes/admin-staff-access.js', () => ({ default: routeSpies.staffAccess }))

import handleAdminRoute from '../api/admin/[action].js'
import handleAuthRoute from '../api/auth/[action].js'

function createRequest(action: string | string[] | undefined): ApiRequest {
  return { query: { action } } as unknown as ApiRequest
}

function createResponse() {
  const setHeader = vi.fn()
  const json = vi.fn()
  let response!: ApiResponse
  const status = vi.fn((statusCode: number) => {
    void statusCode
    return response
  })
  response = {
    headersSent: false,
    setHeader,
    status,
    json,
  } as unknown as ApiResponse

  return { response, setHeader, status, json }
}

function collectApiEntrypoints(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) return collectApiEntrypoints(absolutePath)
    return /\.(?:[cm]?[jt]s)$/.test(entry.name) ? [absolutePath] : []
  })
}

async function expectNotFound(handler: ApiHandler, action: string | string[] | undefined): Promise<void> {
  const request = createRequest(action)
  const { response, setHeader, status, json } = createResponse()

  await handler(request, response)

  expect(status).toHaveBeenCalledWith(404)
  expect(json).toHaveBeenCalledWith({ error: 'Ruta no encontrada' })
  expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store, max-age=0')
}

describe('dispatchers dinamicos de Vercel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('despacha las dos acciones de autenticacion sin cambiar request ni response', async () => {
    const meRequest = createRequest('me')
    const meResponse = createResponse().response
    await handleAuthRoute(meRequest, meResponse)
    expect(routeSpies.authMe).toHaveBeenCalledWith(meRequest, meResponse)

    const recoveryRequest = createRequest('password-recovery')
    const recoveryResponse = createResponse().response
    await handleAuthRoute(recoveryRequest, recoveryResponse)
    expect(routeSpies.passwordRecovery).toHaveBeenCalledWith(recoveryRequest, recoveryResponse)
  })

  it('despacha las dos acciones administrativas sin cambiar request ni response', async () => {
    const broadcastsRequest = createRequest('broadcasts')
    const broadcastsResponse = createResponse().response
    await handleAdminRoute(broadcastsRequest, broadcastsResponse)
    expect(routeSpies.broadcasts).toHaveBeenCalledWith(broadcastsRequest, broadcastsResponse)

    const staffRequest = createRequest('staff-access')
    const staffResponse = createResponse().response
    await handleAdminRoute(staffRequest, staffResponse)
    expect(routeSpies.staffAccess).toHaveBeenCalledWith(staffRequest, staffResponse)
  })

  it('responde 404 privado para acciones desconocidas o ambiguas', async () => {
    await expectNotFound(handleAuthRoute, 'otra')
    await expectNotFound(handleAuthRoute, ['me', 'otra'])
    await expectNotFound(handleAdminRoute, undefined)
    expect(routeSpies.authMe).not.toHaveBeenCalled()
    expect(routeSpies.passwordRecovery).not.toHaveBeenCalled()
    expect(routeSpies.broadcasts).not.toHaveBeenCalled()
    expect(routeSpies.staffAccess).not.toHaveBeenCalled()
  })

  it('mantiene el proyecto Hobby en doce entrypoints de Functions', () => {
    const apiDirectory = join(process.cwd(), 'api')
    const entrypoints = collectApiEntrypoints(apiDirectory)
      .map((path) => relative(apiDirectory, path).replaceAll('\\', '/'))
      .sort()

    expect(entrypoints).toHaveLength(12)
    expect(entrypoints).toContain('admin/[action].ts')
    expect(entrypoints).toContain('auth/[action].ts')
    expect(entrypoints).not.toContain('admin/broadcasts.ts')
    expect(entrypoints).not.toContain('admin/staff-access.ts')
    expect(entrypoints).not.toContain('auth/me.ts')
    expect(entrypoints).not.toContain('auth/password-recovery.ts')
  })
})
