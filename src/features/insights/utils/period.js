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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PRESET_KEYS = PRESETS.map((item) => item.key)

function isIsoDate(value) {
  return typeof value === 'string' && ISO_DATE_RE.test(value) && !Number.isNaN(asUtcDate(value).getTime())
}

// Forma mínima persistible de un periodo: se usa para validar lo leído de localStorage antes de
// confiar en él (puede ser de otra versión del portal, o estar corrupto/editado a mano).
export function isValidStoredPeriod(value) {
  if (!value || typeof value !== 'object') return false
  const { from, to, preset } = value
  return isIsoDate(from) && isIsoDate(to) && PRESET_KEYS.includes(preset)
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

  const sameYear = fromDate.getUTCFullYear() === toDate.getUTCFullYear()
  const fromLabel = sameYear ? dayMonthLabel(fromDate) : dayMonthYearLabel(fromDate)

  return `${fromLabel} – ${dayMonthYearLabel(toDate)}`
}

/** Mensaje de validación del periodo, o '' si es válido. Refleja las reglas del backend. */
export function periodErrors({ from, to, preset }) {
  // En modo "Elegir fechas" ambas fechas son obligatorias: al limpiar un DatePicker se pierde
  // ese campo y hay que avisar en vez de dejar el periodo silenciosamente incompleto.
  if (!from || !to) return preset === 'custom' ? 'Elige ambas fechas.' : ''

  const fromDate = asUtcDate(from)
  const toDate = asUtcDate(to)

  if (toDate < fromDate) return 'La fecha final es anterior a la inicial.'

  const days = Math.round((toDate - fromDate) / 86400000) + 1
  if (days > MAX_DAYS) return 'Máximo 92 días.'

  return ''
}

// Conversión con el DatePicker de PrimeVue, que entrega y espera medianoche local del día
// elegido: se leen y construyen los campos locales para no correr el día al cambiar de huso.
const pad2 = (value) => String(value).padStart(2, '0')

/** Date local → 'YYYY-MM-DD'; '' si es nula o inválida. */
export function toIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** 'YYYY-MM-DD' → Date a medianoche local; null si está vacía. */
export function fromIsoDate(iso) {
  if (!iso) return null
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const limaClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LIMA_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** '14:32' si fue hoy (en Lima); '10/09 14:32' si fue otro día; '—' si instant es nulo o inválido. */
export function formatClock(instant, now = new Date()) {
  if (!instant) return '—'

  const date = new Date(instant)
  if (Number.isNaN(date.getTime())) return '—'

  const clock = limaClockFormatter.format(date)
  if (todayLima(date) === todayLima(now)) return clock

  const [, month, day] = limaDateFormatter.format(date).split('-')
  return `${day}/${month} ${clock}`
}

/** '10/09/2026' en Lima, a partir de una fecha o instante cualquiera. */
function limaSlashDate(date) {
  const [year, month, day] = limaDateFormatter.format(date).split('-')
  return `${day}/${month}/${year}`
}

/** '10/09/2026 14:32' en Lima, con año siempre visible; '—' si instant es nulo o inválido. */
export function formatDateTimeWithYear(instant) {
  if (!instant) return '—'

  const date = new Date(instant)
  if (Number.isNaN(date.getTime())) return '—'

  return `${limaSlashDate(date)} ${limaClockFormatter.format(date)}`
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
