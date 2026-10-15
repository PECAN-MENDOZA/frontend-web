// Utilidades puras sobre los errores HTTP del backend (sin window ni import.meta: se prueban en Node).

// TemporaryPasswordFilter: al docente le reiniciaron la contraseña y su token ya no sirve para nada
// fuera de /auth/**.
export const PASSWORD_CHANGE_REQUIRED = 'Password change required'

// Motivo que viaja en auth:unauthorized para que el login explique por qué se cerró la sesión.
export const SESSION_END_PASSWORD_RESET = 'password-reset'

export function isPasswordChangeRequired(status, message) {
  return (
    status === 403 && typeof message === 'string' && message.trim() === PASSWORD_CHANGE_REQUIRED
  )
}

// Un id ajeno o inexistente: el backend responde 403 o 404 según el caso, y para el docente las dos
// cosas significan lo mismo ("no es tuyo o no existe"). Un 400 no entra: puede ser otro dato mal
// enviado (p. ej. el periodo), y no debe hacerse pasar por "no existe".
export function isMissingResource(error) {
  return [403, 404].includes(error?.status)
}

// Texto en español según el estado HTTP, para cuando el mensaje del backend (en inglés) no tiene
// traducción conocida. Lo demás cae en el texto propio de cada pantalla.
export function statusMessage(status, fallback) {
  if (status === 403) return 'No tienes acceso a esta información.'
  if (status === 404) return 'No encontramos lo que buscas.'
  return fallback
}
