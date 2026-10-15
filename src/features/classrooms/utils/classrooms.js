import { formatRelative } from '../../insights/utils/period.js'

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

// Solo alias y PIN: la hoja se imprime y circula por el aula, no lleva nombres.
export function credentialsAsText(credentials, classroomName) {
  const lines = credentials.map((c) => `alias: ${c.username} · PIN: ${c.pin}`)
  return [`Salón ${classroomName}`, ...lines].join('\n')
}

export function sortClassrooms(list) {
  return [...list].sort((a, b) => {
    const archivedDiff = Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt))
    return archivedDiff !== 0 ? archivedDiff : a.name.localeCompare(b.name, 'es')
  })
}

// Mismo texto que la columna "Última actividad" de Estudiantes: relativo, o "Sin actividad".
export function formatLastAccess(value, now = new Date()) {
  const label = formatRelative(value, now)
  return label === '—' ? 'Sin actividad' : label
}

// Dados de baja de un salón (GET /teachers/students/inactive trae los de todos): los de ese salón,
// del más reciente al más antiguo.
export function inactiveInClassroom(links, classroomId) {
  return (links ?? [])
    .filter((link) => link.classroomId === classroomId)
    .sort((a, b) => String(b.deactivatedAt ?? '').localeCompare(String(a.deactivatedAt ?? '')))
}

export function formatDeactivatedAt(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? lastAccessFormatter.format(date) : '—'
}

export function classroomArchiveConfirmation(name) {
  return {
    header: `Archivar ${name}`,
    message:
      'El salón pasará a la lista de archivados y no podrás crear cuentas en él. No se borra nada y puedes restaurarlo cuando quieras.',
    acceptLabel: 'Archivar',
  }
}
