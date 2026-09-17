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

// Aceptación de sugerencias: "aceptadas/ofrecidas (p %, IC Wilson a–b)"; solo existe en ASSISTED.
export function formatAcceptance(acceptance) {
  if (acceptance?.ratePct == null) return '—'

  const rate = formatNumber(acceptance.ratePct, 1)
  const interval =
    acceptance.wilsonLower == null || acceptance.wilsonUpper == null
      ? ''
      : `, IC Wilson ${formatNumber(acceptance.wilsonLower, 1)}–${formatNumber(acceptance.wilsonUpper, 1)}`

  return `${acceptance.accepted}/${acceptance.offered} (${rate} %${interval})`
}

// Estadísticos de la prueba t pareada (t, p, dz) cuando el backend los calcula (n ≥ 2).
export function formatPairedStats(delta) {
  if (delta?.t == null || delta?.p == null || delta?.dz == null) return ''

  return `t = ${formatNumber(delta.t, 2)}; p = ${formatNumber(delta.p, 3)}; dz = ${formatNumber(delta.dz, 2)}`
}

export function formatSeconds(milliseconds) {
  if (milliseconds == null) return '—'

  return `${formatNumber(milliseconds / 1000, 1)} s`
}

export function formatMean(value, digits = 2) {
  return value == null ? '—' : formatNumber(value, digits)
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
    acceptance: metrics.acceptanceRate,
  }))
}

export function sentenceRows(results) {
  return (results?.sentences ?? []).map(
    ({ position, kind, assistance, n, meanErrors, meanDurationFirstKeyMs, skippedCount }) => ({
      position,
      kind,
      assistance,
      n,
      meanErrors,
      meanDuration: meanDurationFirstKeyMs,
      skipped: skippedCount,
    }),
  )
}

export function resultsJsonFilename(results) {
  return `test-${results?.code || results?.testId || 'prueba'}-results.json`
}
