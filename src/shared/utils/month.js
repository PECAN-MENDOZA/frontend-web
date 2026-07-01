const MONTH_LABELS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const MONTH_LABELS_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

/**
 * Devuelve el mes en curso en formato `YYYY-MM` calculado en UTC.
 *
 * El backend interpreta `month=YYYY-MM` como el rango `[día 1 00:00 UTC,
 * día 1 del mes siguiente 00:00 UTC)`. Usamos los getters UTC para que, cerca
 * de medianoche (Perú = UTC-5), el mes no "salte" por la conversión local↔UTC.
 */
export function getCurrentMonthValue(reference = new Date()) {
  const year = reference.getUTCFullYear()
  const month = String(reference.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Convierte un valor `YYYY-MM` a su etiqueta en español (p. ej. "Junio 2026").
 */
export function formatMonthLabel(value) {
  const [year, month] = value.split('-')
  const index = Number(month) - 1
  return `${MONTH_LABELS_ES[index]} ${year}`
}

/**
 * Etiqueta compacta para ejes de gráficos (p. ej. "Jun 26"). Incluye los dos
 * últimos dígitos del año para que un rango que cruce diciembre/enero no sea
 * ambiguo.
 */
export function formatMonthShortLabel(value) {
  const [year, month] = value.split('-')
  const index = Number(month) - 1
  return `${MONTH_LABELS_SHORT_ES[index]} ${year.slice(2)}`
}

/**
 * Calcula el rango `{ from, to }` en formato `YYYY-MM` que termina en
 * `endMonth` (incluido) y abarca `count` meses hacia atrás. Útil para pedir la
 * tendencia de aceptación de los últimos meses hasta el mes seleccionado.
 */
export function getMonthRange(endMonth = getCurrentMonthValue(), count = 6) {
  const [year, month] = endMonth.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1 - (count - 1), 1))
  return {
    from: getCurrentMonthValue(from),
    to: endMonth,
  }
}

/**
 * Genera la lista de opciones de mes para el selector, empezando por el mes
 * actual e incluyéndolo siempre, y retrocediendo `count - 1` meses.
 *
 * El primer elemento (mes en curso) es el que debe quedar seleccionado por
 * defecto, de modo que la actividad reciente sea visible al instante.
 */
export function getMonthOptions(count = 6, reference = new Date()) {
  const options = []
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth()

  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(Date.UTC(year, month - offset, 1))
    const value = getCurrentMonthValue(date)
    options.push({ label: formatMonthLabel(value), value })
  }

  return options
}
