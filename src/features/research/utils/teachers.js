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

export function temporaryPasswordNotice(teacher, password) {
  return `Usuario: ${teacher.email}\nContraseña temporal: ${password}\nDeberá cambiarla al entrar.`
}
