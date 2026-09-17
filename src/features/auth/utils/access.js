export function homeForRole(role) {
  return role === 'RESEARCHER' ? '/research' : '/dashboard'
}

export function canAccessRoute(role, allowedRoles = []) {
  return allowedRoles.length === 0 || allowedRoles.includes(role)
}

export function requiresPasswordChange(user, routeName) {
  return Boolean(user?.mustChangePassword) && routeName !== 'change-password'
}

export function changePasswordErrorMessage(status) {
  if (status === 401) return 'La contraseña actual no es correcta.'
  if (status === 400) return 'La contraseña nueva debe ser distinta de la actual.'
  return 'No pudimos cambiar la contraseña. Inténtalo nuevamente.'
}
