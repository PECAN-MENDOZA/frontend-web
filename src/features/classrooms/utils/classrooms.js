export const CLASSROOM_NAME_MAX_LENGTH = 80
export const STUDENT_COUNT_MAX = 40

const lastAccessFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function classroomFormErrors({ name }) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return { name: 'El nombre del salón es obligatorio.' }
  if (trimmed.length > CLASSROOM_NAME_MAX_LENGTH) return { name: 'Máximo 80 caracteres.' }
  return {}
}

export function studentsFormErrors({ mode, studentRealName, count }) {
  if (mode === 'named') {
    return (studentRealName ?? '').trim()
      ? {}
      : { studentRealName: 'El nombre del estudiante es obligatorio.' }
  }
  const n = Number(count)
  return Number.isInteger(n) && n >= 1 && n <= STUDENT_COUNT_MAX
    ? {}
    : { count: `Indica entre 1 y ${STUDENT_COUNT_MAX} estudiantes.` }
}

// Solo usuario y PIN: la hoja se imprime y circula por el aula, no lleva nombres.
export function credentialsAsText(credentials, classroomName) {
  const lines = credentials.map((c) => `usuario: ${c.username} · PIN: ${c.pin}`)
  return [`Salón ${classroomName}`, ...lines].join('\n')
}

export function sortClassrooms(list) {
  return [...list].sort((a, b) => {
    const archivedDiff = Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt))
    return archivedDiff !== 0 ? archivedDiff : a.name.localeCompare(b.name, 'es')
  })
}

export function formatLastAccess(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? lastAccessFormatter.format(date) : 'Sin ingresos'
}
