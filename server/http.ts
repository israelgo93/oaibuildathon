import type { ApiErrorBody } from '../src/types/api.js'
import { ZodError } from 'zod'
import type { ApiHandler, ApiRequest, ApiResponse } from './types.js'

export class HttpError extends Error {
  readonly statusCode: number
  readonly publicMessage: string

  constructor(statusCode: number, publicMessage: string) {
    super(publicMessage)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.publicMessage = publicMessage
  }
}

export function requireMethod(request: ApiRequest, allowedMethods: string[]): void {
  const method = request.method ?? 'GET'

  if (!allowedMethods.includes(method)) {
    throw new HttpError(405, 'Metodo no permitido')
  }
}

export function parseJsonBody(request: ApiRequest): unknown {
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body) as unknown
    } catch {
      throw new HttpError(400, 'El cuerpo de la solicitud no contiene JSON valido')
    }
  }

  if (Buffer.isBuffer(request.body)) {
    try {
      return JSON.parse(request.body.toString('utf8')) as unknown
    } catch {
      throw new HttpError(400, 'El cuerpo de la solicitud no contiene JSON valido')
    }
  }

  return request.body
}

export function setPrivateResponse(response: ApiResponse): void {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0')
  response.setHeader('X-Content-Type-Options', 'nosniff')
}

export function setPublicCache(response: ApiResponse, seconds = 60): void {
  response.setHeader('Cache-Control', `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`)
  response.setHeader('X-Content-Type-Options', 'nosniff')
}

function safeErrorDetails(error: unknown): string | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined
  }

  return error instanceof Error ? error.message : 'Error desconocido'
}

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request, response) => {
    try {
      await handler(request, response)
    } catch (error) {
      const statusCode = error instanceof HttpError ? error.statusCode : error instanceof ZodError ? 400 : 500
      const errorBody: ApiErrorBody = {
        error: error instanceof HttpError
          ? error.publicMessage
          : error instanceof ZodError
            ? error.issues[0]?.message ?? 'Los datos enviados no son validos'
            : 'No fue posible completar la solicitud',
      }
      const details = safeErrorDetails(error)

      if (details) {
        errorBody.details = details
      }

      if (!response.headersSent) {
        setPrivateResponse(response)
        response.status(statusCode).json(errorBody)
      }
    }
  }
}

export function getRequestIp(request: ApiRequest): string | null {
  const forwardedFor = request.headers['x-forwarded-for']
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]
  return firstForwarded?.trim() || request.socket.remoteAddress || null
}

export function readCookie(request: ApiRequest, name: string): string | null {
  const directCookie = request.cookies?.[name]
  if (directCookie) return directCookie

  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null

  const pair = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))

  if (!pair) return null
  return decodeURIComponent(pair.slice(name.length + 1))
}
