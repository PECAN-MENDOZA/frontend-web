const CONDITION_LABELS = { ASSISTED: 'Con ayuda', UNASSISTED: 'Sin ayuda' }
const MANUAL_DESIGN_NOTICE = 'Diseño manual: la condición no está contrabalanceada.'

function formatNumber(value, digits) {
  return Number(value).toFixed(digits).replace('-', '−').replace('.', ',')
}

export function formatInterval(metric, digits = 1) {
  if (metric?.mean == null) return '—'

  const mean = formatNumber(metric.mean, digits)
  if (metric.lower == null || metric.upper == null) return `${mean} (IC no disponible)`

  return `${mean} (IC 95 % ${formatNumber(metric.lower, digits)}–${formatNumber(metric.upper, digits)})`
}

export function formatDelta(delta) {
  if (delta?.meanDelta == null) return '—'

  const mean = formatNumber(delta.meanDelta, 1)
  const interval =
    delta.bootstrapLower == null || delta.bootstrapUpper == null
      ? 'IC no disponible'
      : `IC 95 % ${formatNumber(delta.bootstrapLower, 1)}–${formatNumber(delta.bootstrapUpper, 1)}`

  return `${mean} (${interval}; n = ${delta.n})`
}

export function resultsBanners(results) {
  const banners = []

  if (results?.incomplete) {
    banners.push({
      severity: 'warn',
      text: `${results.sample?.unannotatedFree ?? 0} oraciones libres sin anotar: resultados incompletos.`,
    })
  }
  if (results?.sampleInsufficient) {
    banners.push({
      severity: 'warn',
      text: `Muestra insuficiente (${results.sample?.completed ?? 0} de ${results.minSample}).`,
    })
  }
  banners.push({ severity: 'info', text: MANUAL_DESIGN_NOTICE })

  return banners
}

export function conditionRows(results) {
  return Object.entries(results?.conditions ?? {}).map(([condition, metrics]) => ({
    condition,
    label: CONDITION_LABELS[condition] ?? condition,
    participants: metrics.participants,
    errors: metrics.errorsPer100Words,
    ppm: metrics.wordsPerMinute,
    acceptance: metrics.acceptance,
  }))
}

export function sentenceRows(results) {
  return (results?.sentences ?? []).map(
    ({ position, kind, assistance, n, meanErrors, meanDuration, skipped }) => ({
      position,
      kind,
      assistance,
      n,
      meanErrors,
      meanDuration,
      skipped,
    }),
  )
}
