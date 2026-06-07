import { api } from '@/shared/services/api'
import { getInitials, getStudentStatus, mapFeedbackMix, mapTopWords, sumTopWordFrequency } from '@/shared/utils/kpi'

export async function getDashboardSummary(month) {
  const studentLinks = await api.get('/teachers/students')
  const studentKpis = await Promise.all(studentLinks.map((student) => getStudentKpis(student, month)))
  const feedbackTotals = getClassFeedbackTotals(studentKpis)
  const acceptanceMetric = getClassAcceptanceMetric(feedbackTotals, studentKpis.length)
  const topWords = getClassTopWords(studentKpis)
  const students = studentKpis.map(mapStudent)
  const focusStudent = students
    .filter((student) => student.status !== 'Sin datos')
    .sort((first, second) => second.recurringWords - first.recurringWords)[0]

  return {
    updatedAt: new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date()),
    selectedMonth: month,
    hasAcceptanceData: acceptanceMetric.isAvailable,
    feedbackMix: mapFeedbackMix(feedbackTotals),
    focusStudent,
    recurrentWord: topWords[0] ?? null,
    metrics: {
      activeStudents: {
        value: studentLinks.length,
        change: 'Vinculados a tu aula',
      },
      acceptanceRate: acceptanceMetric,
      recurringWords: {
        value: topWords.reduce((total, word) => total + word.frequency, 0),
        change: 'Repeticiones aceptadas en el mes',
      },
      studentsToSupport: {
        value: students.filter((student) => student.status === 'Acompanar').length,
        change: 'Necesitan seguimiento cercano',
      },
    },
    students,
    topWords,
  }
}

async function getStudentKpis(student, month) {
  try {
    const summary = await api.get(`/kpis/students/${student.studentId}/summary?month=${month}`)

    return {
      student,
      summary,
      acceptance: summary?.tasa_aceptacion ?? null,
      topWords: mapTopWords(summary?.top_palabras),
    }
  } catch {
    return {
      student,
      summary: null,
      acceptance: null,
      topWords: [],
    }
  }
}

function getClassFeedbackTotals(studentKpis) {
  return studentKpis.reduce(
    (totals, { acceptance }) => ({
      total_envios: totals.total_envios + (acceptance?.total_envios ?? 0),
      total_aceptadas: totals.total_aceptadas + (acceptance?.total_aceptadas ?? 0),
      total_rechazadas: totals.total_rechazadas + (acceptance?.total_rechazadas ?? 0),
      sin_respuesta: totals.sin_respuesta + (acceptance?.sin_respuesta ?? 0),
    }),
    {
      total_envios: 0,
      total_aceptadas: 0,
      total_rechazadas: 0,
      sin_respuesta: 0,
    },
  )
}

function getClassAcceptanceMetric(totals, studentCount) {
  if (!studentCount || !totals.total_envios) {
    return {
      value: '--',
      change: 'Aun no hay envios del mes',
      isAvailable: false,
    }
  }

  return {
    value: `${((totals.total_aceptadas * 100) / totals.total_envios).toFixed(1)}%`,
    change: `${totals.total_aceptadas} de ${totals.total_envios} aceptadas`,
    isAvailable: true,
  }
}

function getClassTopWords(studentKpis) {
  const words = new Map()

  studentKpis.forEach(({ topWords }) => {
    topWords.forEach((word) => {
      const current = words.get(word.word) ?? {
        word: word.word,
        frequency: 0,
        acceptedCount: 0,
        studentCount: 0,
      }

      current.frequency += word.frequency
      current.acceptedCount += word.acceptedCount
      current.studentCount += 1
      words.set(word.word, current)
    })
  })

  return [...words.values()]
    .sort((first, second) => second.frequency - first.frequency)
    .slice(0, 10)
    .map((word, index) => ({ ...word, rank: index + 1 }))
}

function mapStudent({ student, acceptance, topWords }) {
  const recurringWords = sumTopWordFrequency(topWords)
  const acceptanceRate = acceptance?.tasa_aceptacion_pct ?? null
  const totalSubmissions = acceptance?.total_envios ?? 0
  const status = getStudentStatus({ acceptanceRate, totalSubmissions, recurringWords })

  return {
    id: student.studentId,
    name: student.studentRealName,
    alias: student.studentUsername,
    initials: getInitials(student.studentRealName),
    acceptanceRate,
    totalSubmissions,
    acceptedSuggestions: acceptance?.total_aceptadas ?? 0,
    rejectedSuggestions: acceptance?.total_rechazadas ?? 0,
    unansweredSuggestions: acceptance?.sin_respuesta ?? 0,
    recurringWords,
    primarySignal: topWords[0]?.word ?? 'Sin palabras recurrentes',
    status,
  }
}
