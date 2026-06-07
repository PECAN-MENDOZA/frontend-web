export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
}

export function getStudentStatus({ acceptanceRate, totalSubmissions, recurringWords }) {
  if (!totalSubmissions) return 'Sin datos'
  if (acceptanceRate < 50 || recurringWords >= 8) return 'Acompanar'
  if (acceptanceRate < 70 || recurringWords >= 4) return 'Observar'
  return 'En progreso'
}

export function mapFeedbackMix(acceptance) {
  const items = [
    { key: 'accepted', label: 'Aceptadas', count: acceptance?.total_aceptadas ?? 0, tone: 'ocean' },
    { key: 'rejected', label: 'Ignoradas', count: acceptance?.total_rechazadas ?? 0, tone: 'coral' },
    { key: 'pending', label: 'Sin respuesta', count: acceptance?.sin_respuesta ?? 0, tone: 'amber' },
  ]
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return items.map((item) => ({
    ...item,
    percentage: total ? Number(((item.count * 100) / total).toFixed(1)) : 0,
  }))
}

export function mapTopWords(items = []) {
  return items.map((word, index) => ({
    rank: index + 1,
    word: word.palabra_original,
    frequency: word.frequency ?? 0,
    acceptedCount: word.veces_corregida_aceptada ?? 0,
  }))
}

export function sumTopWordFrequency(words = []) {
  return words.reduce((total, word) => total + (word.frequency ?? 0), 0)
}
