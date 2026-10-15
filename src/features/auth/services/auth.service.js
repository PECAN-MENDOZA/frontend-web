import { api, TOKEN_KEY } from '@/shared/services/api'
import { displayNameFor, loginErrorMessage, normalizeEmail } from '@/features/auth/utils/access'

const USER_KEY = 'florisboard_user'
const EXPIRATION_KEY = 'florisboard_token_expiration'
const ROLE_LABELS = { TEACHER: 'Docente', RESEARCHER: 'Investigador' }

export async function signIn(credentials) {
  const email = normalizeEmail(credentials.email)
  const response = await getStaffSession({ email, password: credentials.password })

  if (!ROLE_LABELS[response.role]) {
    throw new Error('Tu cuenta no tiene un rol habilitado para este portal.')
  }

  const session = {
    token: response.token,
    expiresAt: response.expiresAt,
    user: {
      id: response.userId,
      name: displayNameFor(response.displayName, email),
      email,
      role: response.role,
      roleLabel: ROLE_LABELS[response.role] ?? response.role,
      mustChangePassword: Boolean(response.mustChangePassword),
    },
  }

  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  localStorage.setItem(EXPIRATION_KEY, session.expiresAt)

  return session
}

async function getStaffSession(credentials) {
  try {
    return await api.post('/auth/staff/login', credentials, {
      skipUnauthorizedEvent: true,
    })
  } catch (error) {
    throw new Error(loginErrorMessage(error?.status), { cause: error })
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
    const user = JSON.parse(storedUser)

    if (!ROLE_LABELS[user.role]) {
      clearSession()
      return null
    }

    return { token, expiresAt, user }
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

// Sirve al docente y al investigador, sea el cambio obligatorio (contraseña temporal) o voluntario.
export function changePassword({ currentPassword, newPassword }) {
  // Un 401 aquí es "contraseña actual incorrecta", no una sesión vencida: no debe disparar
  // auth:unauthorized (y con ello signOut()), o dejaríamos al usuario fuera sin poder reintentar.
  return api.post(
    '/auth/staff/change-password',
    { currentPassword, newPassword },
    { skipUnauthorizedEvent: true },
  )
}

export function markPasswordChanged(user) {
  const updated = { ...user, mustChangePassword: false }
  localStorage.setItem(USER_KEY, JSON.stringify(updated))
  return updated
}
