import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest extends IncomingMessage {
  body?: unknown
  query: Record<string, string | string[] | undefined>
  cookies?: Record<string, string>
}

export interface ApiResponse extends ServerResponse {
  status: (statusCode: number) => ApiResponse
  json: (body: unknown) => void
  send: (body: string) => void
}

export type ApiHandler = (request: ApiRequest, response: ApiResponse) => Promise<void>
