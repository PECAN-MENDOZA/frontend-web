import { formatDateTimeWithYear, formatRelative } from '../../insights/utils/period.js'

export const CLASSROOM_NAME_MAX_LENGTH = 80
export const STUDENT_COUNT_MAX = 40

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

export const CREDENTIALS_INSTRUCTION =
  'Recorta cada fila y entrega a cada estudiante su alias y su PIN para entrar desde el teclado.'

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Título de la hoja de credenciales: 'Credenciales – Salón 3.º B'. */
export function credentialsTitle(classroomName) {
  const name = (classroomName ?? '').trim()
  return name ? `Credenciales – Salón ${name}` : 'Credenciales'
}

// Hoja imprimible: título, una instrucción y una tabla legible de alias y PIN (sin nombres reales).
export function credentialsPrintHtml(credentials, classroomName) {
  const title = escapeHtml(credentialsTitle(classroomName))
  const rows = (credentials ?? [])
    .map((c) => `<tr><td>${escapeHtml(c.username)}</td><td>${escapeHtml(c.pin)}</td></tr>`)
    .join('')

  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title>` +
    '<style>body{font-family:Arial,Helvetica,sans-serif;padding:2rem;color:#1f2a28}' +
    'h1{font-size:1.5rem;margin:0 0 .4rem}p{margin:0 0 1.2rem;font-size:1rem}' +
    'table{border-collapse:collapse;width:100%;max-width:32rem;font-size:1.2rem}' +
    'th,td{border:1px dashed #8a9a96;padding:.7rem 1rem;text-align:left}' +
    'th{font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;background:#f1f4f0}' +
    'td{font-family:Consolas,"Courier New",monospace;letter-spacing:.04em}</style></head><body>' +
    `<h1>${title}</h1><p>${escapeHtml(CREDENTIALS_INSTRUCTION)}</p>` +
    `<table><thead><tr><th>Alias</th><th>PIN</th></tr></thead><tbody>${rows}</tbody></table>` +
    '</body></html>'
  )
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

// Mismo formato que el resto del portal: dd/mm/aaaa HH:mm (24 h) en America/Lima.
export function formatDeactivatedAt(value) {
  return formatDateTimeWithYear(value)
}

export function classroomArchiveConfirmation(name) {
  return {
    header: `Archivar ${name}`,
    message:
      'El salón pasará a la lista de archivados y no podrás crear cuentas en él. No se borra nada y puedes restaurarlo cuando quieras.',
    acceptLabel: 'Archivar',
  }
}
