import { api, TOKEN_KEY } from '@/shared/services/api'

const USER_KEY = 'florisboard_user'
const EXPIRATION_KEY = 'florisboard_token_expiration'

export async function signIn(credentials) {
  const response = await getTeacherSession(credentials)
  const session = {
    token: response.token,
    expiresAt: response.expiresAt,
    user: {
      id: response.userId,
      name: getNameFromEmail(credentials.email),
      email: credentials.email,
      role: response.role,
      roleLabel: 'Docente',
    },
  }

  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  localStorage.setItem(EXPIRATION_KEY, session.expiresAt)

  return session
}

async function getTeacherSession(credentials) {
  try {
    return await api.post('/auth/teachers/login', credentials, {
      skipUnauthorizedEvent: true,
    })
  } catch {
    throw new Error('No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.')
  }
}

export function restoreSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  const storedUser = localStorage.getItem(USER_KEY)
  const expiresAt = localStorage.getItem(EXPIRATION_KEY)

  if (!token || !storedUser || !expiresAt || new Date(expiresAt) <= new Date()) {
    clearSession()
    return null
  }

  try {
    return { token, expiresAt, user: JSON.parse(storedUser) }
  } catch {
    clearSession()
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRATION_KEY)
}

function getNameFromEmail(email) {
  return email
    .split('@')[0]
    .split('.')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
