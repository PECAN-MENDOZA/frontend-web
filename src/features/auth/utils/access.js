export function homeForRole(role) {
  return role === 'RESEARCHER' ? '/research' : '/dashboard'
}

export function canAccessRoute(role, allowedRoles = []) {
  return allowedRoles.length === 0 || allowedRoles.includes(role)
}
