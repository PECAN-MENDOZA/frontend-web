export function formatPercentage(value) {
  return value == null ? 'No disponible' : `${Number(value).toFixed(1)}%`
}

export function getRateSeverity(rate) {
  if (rate == null) return 'secondary'
  if (rate >= 75) return 'success'
  if (rate >= 60) return 'warn'
  return 'danger'
}

export function getStatusSeverity(status) {
  const severities = {
    'En progreso': 'success',
    Acompañar: 'danger',
    Observar: 'danger',
    'Sin datos': 'secondary',
  }

  return severities[status] ?? 'secondary'
}
