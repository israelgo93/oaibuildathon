import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { ApiResponse } from './types.js'
import { getServerEnvironment } from './env.js'

const TEAM_COOKIE_NAME = 'buildathon_team_session'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function createTeamToken(): string {
  return randomBytes(32).toString('base64url')
}

export function createRegistrationCode(): string {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
}

export function hashTeamToken(token: string): string {
  const { teamSessionSecret } = getServerEnvironment()
  return createHmac('sha256', teamSessionSecret).update(token).digest('hex')
}

export function secureStringEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function setTeamSessionCookie(response: ApiResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const attributes = [
    `${TEAM_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 30}`,
  ]

  if (isProduction) attributes.push('Secure')
  response.setHeader('Set-Cookie', attributes.join('; '))
}

export function clearTeamSessionCookie(response: ApiResponse): void {
  response.setHeader(
    'Set-Cookie',
    `${TEAM_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
}

export { TEAM_COOKIE_NAME }
