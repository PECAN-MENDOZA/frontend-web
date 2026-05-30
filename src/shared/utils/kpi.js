export const ERROR_TYPE_METADATA = {
  ortografico: { label: 'Ortográfico', tone: 'coral' },
  fonologico: { label: 'Fonológico', tone: 'ocean' },
  semantico: { label: 'Semántico', tone: 'amber' },
}

export function getErrorTypeLabel(type) {
  return ERROR_TYPE_METADATA[type]?.label ?? 'Otro'
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
}

export function getStudentStatus(totalErrors) {
  if (totalErrors >= 15) return 'Revisar'
  if (totalErrors >= 8) return 'Observar'
  return 'Estable'
}

export function mapErrorDistribution(items = []) {
  return items.map(({ type, count, percentage }) => ({
    type: getErrorTypeLabel(type),
    count,
    percentage: Number(percentage.toFixed(1)),
    tone: ERROR_TYPE_METADATA[type]?.tone ?? 'ocean',
  }))
}

export function mapTopWords(items = []) {
  return items.map((word) => ({
    word: word.palabra_original,
    type: getErrorTypeLabel(word.tipo_mas_comun),
    frequency: word.frequency,
    confidence: word.confianza_promedio,
    confidencePercent: Math.round(word.confianza_promedio * 100),
    acceptedCount: word.veces_corregida_aceptada,
  }))
}
