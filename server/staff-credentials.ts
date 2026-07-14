import { randomInt } from 'node:crypto'

export const TEMPORARY_PASSWORD_LENGTH = 16

const UPPERCASE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE_CHARACTERS = 'abcdefghijkmnopqrstuvwxyz'
const NUMBER_CHARACTERS = '23456789'
const SYMBOL_CHARACTERS = '!@#$%&*+-=?'
const ALL_PASSWORD_CHARACTERS = [
  UPPERCASE_CHARACTERS,
  LOWERCASE_CHARACTERS,
  NUMBER_CHARACTERS,
  SYMBOL_CHARACTERS,
].join('')

function randomCharacter(characters: string): string {
  return characters[randomInt(characters.length)] ?? ''
}

function secureShuffle(characters: string[]): string[] {
  const shuffled = [...characters]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const replacementIndex = randomInt(index + 1)
    const current = shuffled[index]
    const replacement = shuffled[replacementIndex]

    if (current === undefined || replacement === undefined) {
      throw new Error('No fue posible generar una contrasena temporal')
    }

    shuffled[index] = replacement
    shuffled[replacementIndex] = current
  }

  return shuffled
}

export function temporaryPasswordMeetsRequirements(password: string): boolean {
  return password.length === TEMPORARY_PASSWORD_LENGTH
    && [...password].some((character) => UPPERCASE_CHARACTERS.includes(character))
    && [...password].some((character) => LOWERCASE_CHARACTERS.includes(character))
    && [...password].some((character) => NUMBER_CHARACTERS.includes(character))
    && [...password].some((character) => SYMBOL_CHARACTERS.includes(character))
}

export function generateTemporaryPassword(): string {
  const characters = [
    randomCharacter(UPPERCASE_CHARACTERS),
    randomCharacter(LOWERCASE_CHARACTERS),
    randomCharacter(NUMBER_CHARACTERS),
    randomCharacter(SYMBOL_CHARACTERS),
  ]

  while (characters.length < TEMPORARY_PASSWORD_LENGTH) {
    characters.push(randomCharacter(ALL_PASSWORD_CHARACTERS))
  }

  const password = secureShuffle(characters).join('')
  if (!temporaryPasswordMeetsRequirements(password)) {
    throw new Error('No fue posible generar una contrasena temporal')
  }

  return password
}

export function staffAccessIdempotencyKey(profileId: string, credentialVersion: number): string {
  const normalizedProfileId = profileId.trim()
  if (!normalizedProfileId) throw new Error('El perfil es obligatorio')
  if (!Number.isSafeInteger(credentialVersion) || credentialVersion < 1) {
    throw new Error('La version de credencial no es valida')
  }

  return `staff-access/v1/${normalizedProfileId}/${credentialVersion}`
}
