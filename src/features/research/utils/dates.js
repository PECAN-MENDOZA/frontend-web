// Fechas en formato es-PE para el panel del investigador (24 h, sin segundos).
const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatDate(value) {
  return formatWith(dateFormatter, value)
}

export function formatDateTime(value) {
  return formatWith(dateTimeFormatter, value)
}

function formatWith(formatter, value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date)
}
