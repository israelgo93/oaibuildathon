import type { ApiErrorBody } from '@/types/api'
import { getBrowserSupabase } from '@/lib/supabase'

export class ApiClientError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (response.status === 204) return null
  return contentType.includes('application/json') ? response.json() : response.text()
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string'
}

export async function apiRequest<Result>(path: string, init?: RequestInit): Promise<Result> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  const body = await readResponseBody(response)

  if (!response.ok) {
    throw new ApiClientError(response.status, isApiErrorBody(body) ? body.error : 'No fue posible completar la solicitud')
  }

  if (response.status !== 204 && !contentType.includes('application/json')) {
    throw new ApiClientError(502, 'La API no esta disponible en este entorno')
  }

  return body as Result
}

export async function authenticatedApiRequest<Result>(path: string, init?: RequestInit): Promise<Result> {
  const { data: sessionData, error } = await getBrowserSupabase().auth.getSession()
  if (error || !sessionData.session) throw new ApiClientError(401, 'Debes iniciar sesion')

  return apiRequest<Result>(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  })
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrio un error inesperado'
}
