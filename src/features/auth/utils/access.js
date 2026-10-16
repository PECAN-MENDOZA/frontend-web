import { TEACHER_DEACTIVATED } from '../../../shared/utils/http.js'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_RESET_NOTICE =
  'Tu contraseña fue reiniciada. Entra con la contraseña temporal que te dieron.'

export const DEACTIVATED_NOTICE =
  'Tu cuenta fue dada de baja. Si crees que es un error, habla con el administrador del panel.'

// Un 401 que cierra una sesión abierta (token vencido o revocado) sin otro motivo que explicar.
export const SESSION_EXPIRED_NOTICE = 'Tu sesión terminó. Vuelve a ingresar.'

export const LOGIN_EMPTY_MESSAGE = 'Escribe tu correo y tu contraseña.'

export const PASSWORD_RULE_TEXT = `La nueva contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`

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

// Con contraseña temporal el campo se llama "Contraseña temporal": los mensajes la nombran igual.
function currentPasswordName(temporary) {
  return temporary ? 'contraseña temporal' : 'contraseña actual'
}

// 400 "New password must be different" se distingue del 400 de validación (8–72 caracteres).
export function changePasswordErrorMessage(status, message = '', { temporary = false } = {}) {
  if (status === 401) return `La ${currentPasswordName(temporary)} no es correcta.`
  if (status === 400) {
    return /different/i.test(message ?? '')
      ? `La contraseña nueva debe ser distinta de la ${temporary ? 'temporal' : 'actual'}.`
      : PASSWORD_LENGTH_MESSAGE
  }
  return 'No pudimos cambiar la contraseña. Inténtalo nuevamente.'
}

// Validación local del formulario de cambio de contraseña: '' si se puede enviar.
export function changePasswordFormError(
  { currentPassword, newPassword, confirmPassword },
  { temporary = false } = {},
) {
  if (!currentPassword) return `Escribe tu ${currentPasswordName(temporary)}.`

  const length = (newPassword ?? '').length
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) return PASSWORD_LENGTH_MESSAGE

  if (newPassword !== confirmPassword) return 'Las contraseñas no coinciden.'

  return ''
}

// Correo y contraseña correctos de una cuenta dada de baja: 401 con su propio mensaje, que se
// explica tal cual. Cualquier otro fallo queda genérico (no se revela si el correo existe).
export function loginErrorMessage(status, message) {
  if (status === 401 && typeof message === 'string' && message.trim() === TEACHER_DEACTIVATED) {
    return DEACTIVATED_NOTICE
  }
  return 'No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.'
}

// Validación local del login: con algún campo vacío no se llama al servidor.
export function loginFormError({ email, password }) {
  return (email ?? '').trim() && password ? '' : LOGIN_EMPTY_MESSAGE
}

// El backend compara el correo sin distinguir mayúsculas; se envía ya normalizado.
export function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase()
}

// Nombre de la barra superior: el que da el login (displayName) o, si no hay, el correo tal cual
// (un nombre inventado a partir del correo, "Investigador", parecía un nombre real).
export function displayNameFor(displayName, email) {
  const name = typeof displayName === 'string' ? displayName.trim() : ''
  return name || (email ?? '').trim()
}
