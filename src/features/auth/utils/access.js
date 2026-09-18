export function homeForRole(role) {
  return role === 'RESEARCHER' ? '/research' : '/dashboard'
}

export function canAccessRoute(role, allowedRoles = []) {
  return allowedRoles.length === 0 || allowedRoles.includes(role)
}

// Solo los docentes reciben contraseñas temporales; la ruta change-password es exclusiva de
// ese rol, así que exigirla a un investigador lo dejaría rebotando entre /research y esta.
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

export function changePasswordErrorMessage(status) {
  if (status === 401) return 'La contraseña actual no es correcta.'
  if (status === 400) return 'La contraseña nueva debe ser distinta de la actual.'
  return 'No pudimos cambiar la contraseña. Inténtalo nuevamente.'
}
