const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function teacherFormErrors({ fullName, email, institution }) {
  const errors = {}
  if (!(fullName ?? '').trim()) errors.fullName = 'El nombre es obligatorio.'
  if (!EMAIL_PATTERN.test((email ?? '').trim())) errors.email = 'Escribe un correo válido.'
  if (!(institution ?? '').trim()) errors.institution = 'La institución es obligatoria.'
  return errors
}

export function teacherStatusLabel(teacher) {
  return teacher?.mustChangePassword ? 'Contraseña temporal' : 'Activo'
}

// El backend puede omitir fullName en cuentas antiguas: la columna muestra un guion en su lugar.
export function teacherDisplayName(teacher) {
  return (teacher?.fullName ?? '').trim() || '—'
}

// Se entra con el correo: el aviso lo nombra así ("Correo:"), no como "Usuario".
export function temporaryPasswordNotice(teacher, password) {
  return `Correo: ${teacher.email}\nContraseña temporal: ${password}\nDeberá cambiarla al entrar.`
}

// Cómo nombrar al docente en títulos y confirmaciones: su nombre o, si falta, su correo.
export function teacherLabel(teacher) {
  return (teacher?.fullName ?? '').trim() || teacher?.email || 'el docente'
}

export function passwordResetConfirmation(teacher) {
  return {
    header: `Reiniciar la contraseña de ${teacherLabel(teacher)}`,
    message:
      'Su contraseña actual dejará de servir y, si tiene el panel abierto, tendrá que volver a entrar. Tendrás que entregarle la contraseña temporal nueva.',
    acceptLabel: 'Reiniciar contraseña',
  }
}
