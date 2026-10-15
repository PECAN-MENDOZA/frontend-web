export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_RESET_NOTICE =
  'Tu contraseña fue reiniciada. Entra con la contraseña temporal que te dieron.'

const PASSWORD_LENGTH_MESSAGE = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`

export function homeForRole(role) {
  return role === 'RESEARCHER' ? '/research' : '/dashboard'
}

export function canAccessRoute(role, allowedRoles = []) {
  return allowedRoles.length === 0 || allowedRoles.includes(role)
}

// Solo los docentes reciben contraseñas temporales. La ruta change-password admite también al
// investigador (cambio voluntario), pero exigírsela lo dejaría rebotando entre /research y esta.
export function requiresPasswordChange(user, routeName) {
  return (
    user?.role === 'TEACHER' && Boolean(user.mustChangePassword) && routeName !== 'change-password'
  )
}

// Tras cambiar la contraseña se vuelve al enlace profundo que traía el docente, si es una ruta
// interna distinta de la propia pantalla de cambio; si no, a su inicio.
export function nextRouteAfterPasswordChange(redirect, role) {
  const isInternalPath =
    typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')

  if (!isInternalPath || redirect.startsWith('/change-password')) return homeForRole(role)

  return redirect
}

// 400 "New password must be different" se distingue del 400 de validación (8–72 caracteres).
export function changePasswordErrorMessage(status, message = '') {
  if (status === 401) return 'La contraseña actual no es correcta.'
  if (status === 400) {
    return /different/i.test(message ?? '')
      ? 'La contraseña nueva debe ser distinta de la actual.'
      : PASSWORD_LENGTH_MESSAGE
  }
  return 'No pudimos cambiar la contraseña. Inténtalo nuevamente.'
}

// Validación local del formulario de cambio de contraseña: '' si se puede enviar.
export function changePasswordFormError({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword) return 'Escribe tu contraseña actual.'

  const length = (newPassword ?? '').length
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) return PASSWORD_LENGTH_MESSAGE

  if (newPassword !== confirmPassword) return 'Las contraseñas no coinciden.'

  return ''
}

export function loginErrorMessage(status) {
  if (status === 429) {
    return 'Demasiados intentos. Espera 15 minutos o pide al administrador que reinicie tu contraseña.'
  }
  return 'No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.'
}

// El backend compara el correo sin distinguir mayúsculas; se envía ya normalizado.
export function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase()
}

// Nombre de la barra superior: el que da el login (displayName) o, si no hay, uno derivado del
// correo ("ana.qa@…" → "Ana Qa").
export function displayNameFor(displayName, email) {
  const name = typeof displayName === 'string' ? displayName.trim() : ''
  if (name) return name

  return (email ?? '')
    .split('@')[0]
    .split('.')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
