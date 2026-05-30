export function formatPercentage(value) {
  return value == null ? 'Unavailable' : `${Number(value).toFixed(1)}%`
}

export function getRateSeverity(rate) {
  if (rate == null) return 'secondary'
  if (rate >= 75) return 'success'
  if (rate >= 60) return 'warn'
  return 'danger'
}

export function getStatusSeverity(status) {
  const severities = {
    Steady: 'success',
    Review: 'warn',
    Watch: 'danger',
  }

  return severities[status] ?? 'secondary'
}
