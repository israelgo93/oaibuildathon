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

function createRequest(url: string | undefined): ApiRequest {
  const request = { url } as unknown as ApiRequest
  Object.defineProperty(request, 'query', {
    get() {
      throw new Error('El dispatcher no debe consultar request.query')
    },
  })
  return request
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

async function expectNotFound(handler: ApiHandler, url: string | undefined): Promise<void> {
  const request = createRequest(url)
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
    const meRequest = createRequest('/api/auth/me')
    const meResponse = createResponse().response
    await handleAuthRoute(meRequest, meResponse)
    expect(routeSpies.authMe).toHaveBeenCalledTimes(1)
    const meCall = routeSpies.authMe.mock.calls[0] as unknown as [ApiRequest, ApiResponse]
    expect(meCall[0]).toBe(meRequest)
    expect(meCall[1]).toBe(meResponse)

    const recoveryRequest = createRequest('/api/auth/password-recovery?source=login')
    const recoveryResponse = createResponse().response
    await handleAuthRoute(recoveryRequest, recoveryResponse)
    expect(routeSpies.passwordRecovery).toHaveBeenCalledTimes(1)
    const recoveryCall = routeSpies.passwordRecovery.mock.calls[0] as unknown as [ApiRequest, ApiResponse]
    expect(recoveryCall[0]).toBe(recoveryRequest)
    expect(recoveryCall[1]).toBe(recoveryResponse)
  })

  it('despacha las dos acciones administrativas sin cambiar request ni response', async () => {
    const broadcastsRequest = createRequest('/api/admin/broadcasts')
    const broadcastsResponse = createResponse().response
    await handleAdminRoute(broadcastsRequest, broadcastsResponse)
    expect(routeSpies.broadcasts).toHaveBeenCalledTimes(1)
    const broadcastsCall = routeSpies.broadcasts.mock.calls[0] as unknown as [ApiRequest, ApiResponse]
    expect(broadcastsCall[0]).toBe(broadcastsRequest)
    expect(broadcastsCall[1]).toBe(broadcastsResponse)

    const staffRequest = createRequest('/api/admin/staff-access')
    const staffResponse = createResponse().response
    await handleAdminRoute(staffRequest, staffResponse)
    expect(routeSpies.staffAccess).toHaveBeenCalledTimes(1)
    const staffCall = routeSpies.staffAccess.mock.calls[0] as unknown as [ApiRequest, ApiResponse]
    expect(staffCall[0]).toBe(staffRequest)
    expect(staffCall[1]).toBe(staffResponse)
  })

  it('responde 404 privado para acciones desconocidas o ambiguas', async () => {
    await expectNotFound(handleAuthRoute, '/api/auth/otra')
    await expectNotFound(handleAuthRoute, '/api/admin/me')
    await expectNotFound(handleAdminRoute, '/api/admin/%E0%A4%A')
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
