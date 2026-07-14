import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generateTemporaryPassword,
  staffAccessIdempotencyKey,
  TEMPORARY_PASSWORD_LENGTH,
  temporaryPasswordMeetsRequirements,
} from './staff-credentials.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('credenciales temporales de staff', () => {
  it('genera contrasenas criptograficas de 16 caracteres con todas las categorias', () => {
    const passwords = Array.from({ length: 100 }, () => generateTemporaryPassword())

    for (const password of passwords) {
      expect(password).toHaveLength(TEMPORARY_PASSWORD_LENGTH)
      expect(temporaryPasswordMeetsRequirements(password)).toBe(true)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[!@#$%&*+\-=?]/)
    }

    expect(new Set(passwords).size).toBeGreaterThan(95)
  })

  it('no depende de Math.random', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random no debe ejecutarse')
    })

    expect(() => generateTemporaryPassword()).not.toThrow()
  })

  it('construye una clave de idempotencia estable por perfil y version', () => {
    expect(staffAccessIdempotencyKey(' profile-123 ', 4)).toBe('staff-access/v1/profile-123/4')
    expect(staffAccessIdempotencyKey('profile-123', 5)).not.toBe(staffAccessIdempotencyKey('profile-123', 4))
    expect(() => staffAccessIdempotencyKey('', 1)).toThrow('El perfil es obligatorio')
    expect(() => staffAccessIdempotencyKey('profile-123', 0)).toThrow('La version de credencial no es valida')
  })
})
