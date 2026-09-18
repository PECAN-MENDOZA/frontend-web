// Periodo del panel docente: fechas en America/Lima, inclusivas, sin nada de tendencia.
// El backend interpreta from/to como YYYY-MM-DD en esa zona (docs/superpowers/plans/2026-09-17-panel-docente-descriptivo.md).

export const PRESETS = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Últimos 7 días' },
  { key: 'custom', label: 'Elegir fechas' },
]

const LIMA_ZONE = 'America/Lima'
const MAX_DAYS = 92

// Locale en-CA formatea como YYYY-MM-DD: evita parsear el orden de un locale con nombre.
const limaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Nombres propios en vez de Intl: el ICU de algunos entornos usa "setiembre" para es-PE y
// queremos siempre "septiembre".
const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function dayMonthLabel(date) {
  return `${date.getUTCDate()} de ${MONTH_NAMES[date.getUTCMonth()]}`
}

function dayMonthYearLabel(date) {
  return `${dayMonthLabel(date)} de ${date.getUTCFullYear()}`
}

// Formatea la fecha shift-eada (representada como medianoche UTC de ese día de calendario) de
// vuelta a 'YYYY-MM-DD' sin volver a aplicar el huso de Lima.
const utcDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Fecha de hoy en Lima, formato 'YYYY-MM-DD'. */
export function todayLima(now = new Date()) {
  return limaDateFormatter.format(now)
}

// Las fechas del periodo son fechas de calendario (sin hora): se desplazan en UTC para no
// depender de la hora local del navegador ni de cambios de horario (Perú no los tiene).
function shiftDate(dateText, days) {
  const [year, month, day] = dateText.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return utcDateFormatter.format(date)
}

function asUtcDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/** Rango {from, to} de un preset. 'week' = hoy-6 .. hoy; 'custom' arranca en hoy. */
export function presetRange(key, now = new Date()) {
  const today = todayLima(now)

  if (key === 'yesterday') {
    const yesterday = shiftDate(today, -1)
    return { from: yesterday, to: yesterday }
  }
  if (key === 'week') {
    return { from: shiftDate(today, -6), to: today }
  }
  return { from: today, to: today }
}

/** Query string 'from=...&to=...' para los endpoints del panel docente. */
export function periodQuery({ from, to }) {
  return `from=${from}&to=${to}`
}

/** Etiqueta en español (es-PE) del periodo: un día o un rango dentro/fuera del mismo mes. */
export function periodLabel({ from, to }) {
  const fromDate = asUtcDate(from)
  const toDate = asUtcDate(to)

  if (from === to) return dayMonthLabel(toDate)

  const sameMonth =
    fromDate.getUTCFullYear() === toDate.getUTCFullYear() &&
    fromDate.getUTCMonth() === toDate.getUTCMonth()

  if (sameMonth) return `${fromDate.getUTCDate()} – ${dayMonthYearLabel(toDate)}`

  return `${dayMonthLabel(fromDate)} – ${dayMonthYearLabel(toDate)}`
}

/** Mensaje de validación del periodo, o '' si es válido. Refleja las reglas del backend. */
export function periodErrors({ from, to }) {
  if (!from || !to) return ''

  const fromDate = asUtcDate(from)
  const toDate = asUtcDate(to)

  if (toDate < fromDate) return 'La fecha final es anterior a la inicial.'

  const days = Math.round((toDate - fromDate) / 86400000) + 1
  if (days > MAX_DAYS) return 'Máximo 92 días.'

  return ''
}

/** '10/09/2026' en Lima, a partir de una fecha o instante cualquiera. */
function limaSlashDate(date) {
  const [year, month, day] = limaDateFormatter.format(date).split('-')
  return `${day}/${month}/${year}`
}

/** 'hace 12 min' | 'hace 3 h' | 'ayer' | '10/09/2026' | '—' si instant es nulo o inválido. */
export function formatRelative(instant, now = new Date()) {
  if (!instant) return '—'

  const date = new Date(instant)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = now.getTime() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `hace ${Math.max(minutes, 0)} min`

  const hours = Math.floor(diffMs / 3600000)
  if (hours < 24) return `hace ${hours} h`

  const today = todayLima(now)
  if (todayLima(date) === shiftDate(today, -1)) return 'ayer'

  return limaSlashDate(date)
}
