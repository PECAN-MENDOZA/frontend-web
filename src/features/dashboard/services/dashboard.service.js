import { api } from '@/shared/services/api'
import {
  ERROR_TYPE_METADATA,
  getErrorTypeLabel,
  getInitials,
  getStudentStatus,
} from '@/shared/utils/kpi'

export async function getDashboardSummary(month) {
  const studentLinks = await api.get('/teachers/students')
  const studentKpis = await Promise.all(studentLinks.map((student) => getStudentKpis(student, month)))
  const errorDistribution = getClassErrorDistribution(studentKpis)
  const acceptanceMetric = getClassAcceptanceMetric(studentKpis)
  const detectedErrors = errorDistribution.reduce((total, item) => total + item.count, 0)

  return {
    updatedAt: new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date()),
    selectedMonth: month,
    hasAcceptanceData: acceptanceMetric.isAvailable,
    metrics: {
      activeStudents: {
        value: studentLinks.length,
        change: 'Linked to your classroom',
      },
      acceptanceRate: acceptanceMetric,
      detectedErrors: {
        value: detectedErrors,
        change: 'Across the selected month',
      },
    },
    errorDistribution,
    students: studentKpis.map(mapStudent),
    topWords: getClassTopWords(studentKpis),
  }
}

async function getStudentKpis(student, month) {
  const basePath = `/kpis/students/${student.studentId}`
  const [acceptance, distribution, topWords] = await Promise.allSettled([
    api.get(`${basePath}/acceptance-rate?month=${month}`),
    api.get(`${basePath}/errors-by-type?month=${month}`),
    api.get(`${basePath}/top-words?month=${month}`),
  ])

  return {
    student,
    acceptance: getSettledValue(acceptance),
    distribution: getSettledValue(distribution),
    topWords: getSettledValue(topWords),
  }
}

function getSettledValue(result) {
  return result.status === 'fulfilled' ? result.value : null
}

function getClassAcceptanceMetric(studentKpis) {
  const responses = studentKpis.map(({ acceptance }) => acceptance).filter(Boolean)
  const totalSubmissions = sum(responses, 'total_envios')
  const totalAccepted = sum(responses, 'total_aceptadas')

  if (!responses.length || !totalSubmissions) {
    return {
      value: '--',
      change: 'Unavailable from API',
      isAvailable: false,
    }
  }

  return {
    value: `${((totalAccepted * 100) / totalSubmissions).toFixed(1)}%`,
    change: `${totalAccepted} of ${totalSubmissions} accepted`,
    isAvailable: true,
  }
}

function getClassErrorDistribution(studentKpis) {
  const counts = new Map()

  studentKpis.forEach(({ distribution }) => {
    distribution?.distribucion.forEach(({ type, count }) => {
      counts.set(type, (counts.get(type) ?? 0) + count)
    })
  })

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)

  return Object.entries(ERROR_TYPE_METADATA).map(([type, metadata]) => {
    const count = counts.get(type) ?? 0
    return {
      type: metadata.label,
      count,
      percentage: total ? Number(((count * 100) / total).toFixed(1)) : 0,
      tone: metadata.tone,
    }
  })
}

function getClassTopWords(studentKpis) {
  const words = new Map()

  studentKpis.forEach(({ topWords }) => {
    topWords?.top_palabras.forEach((word) => {
      const key = `${word.palabra_original}:${word.tipo_mas_comun}`
      const current = words.get(key) ?? {
        word: word.palabra_original,
        type: getErrorTypeLabel(word.tipo_mas_comun),
        frequency: 0,
        confidenceTotal: 0,
        acceptedCount: 0,
      }

      current.frequency += word.frequency
      current.confidenceTotal += word.confianza_promedio * word.frequency
      current.acceptedCount += word.veces_corregida_aceptada
      words.set(key, current)
    })
  })

  return [...words.values()]
    .map((word) => ({
      ...word,
      confidence: word.frequency ? word.confidenceTotal / word.frequency : 0,
      confidencePercent: word.frequency
        ? Math.round((word.confidenceTotal / word.frequency) * 100)
        : 0,
    }))
    .sort((first, second) => second.frequency - first.frequency)
    .slice(0, 10)
}

function mapStudent({ student, acceptance, distribution }) {
  const totalErrors = distribution?.total_errores ?? 0
  const primarySignal = [...(distribution?.distribucion ?? [])].sort(
    (first, second) => second.count - first.count,
  )[0]

  return {
    id: student.studentId,
    name: student.studentRealName,
    alias: student.studentUsername,
    initials: getInitials(student.studentRealName),
    acceptanceRate: acceptance?.tasa_aceptacion_pct ?? null,
    totalCorrections: totalErrors,
    primarySignal: primarySignal ? getErrorTypeLabel(primarySignal.type) : 'No signals',
    status: getStudentStatus(totalErrors),
  }
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0)
}
