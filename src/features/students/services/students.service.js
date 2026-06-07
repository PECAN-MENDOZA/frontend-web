import { api } from '@/shared/services/api'
import { getInitials, getStudentStatus, mapFeedbackMix, mapTopWords, sumTopWordFrequency } from '@/shared/utils/kpi'

export async function getStudents(month) {
  const links = await api.get('/teachers/students')
  return Promise.all(links.map((link) => getStudentListItem(link, month)))
}

export function createStudentAccount(student) {
  return api.post('/teachers/students/accounts', student)
}

export function resetStudentPin(studentId) {
  return api.post(`/teachers/students/${studentId}/reset-pin`)
}

export async function getStudentDetail(studentId, month) {
  const [links, summary] = await Promise.all([
    api.get('/teachers/students'),
    api.get(`/kpis/students/${studentId}/summary?month=${month}`),
  ])
  const link = links.find((item) => item.studentId === studentId)

  return mapStudentSummary(link, summary)
}

async function getStudentListItem(link, month) {
  try {
    const summary = await api.get(`/kpis/students/${link.studentId}/summary?month=${month}`)
    return mapStudentSummary(link, summary)
  } catch {
    return mapStudentSummary(link, null)
  }
}

function mapStudentSummary(link, summary) {
  const acceptance = summary?.tasa_aceptacion
  const topWords = mapTopWords(summary?.top_palabras)
  const recurringWords = sumTopWordFrequency(topWords)
  const acceptanceRate = acceptance?.tasa_aceptacion_pct ?? null
  const totalSubmissions = acceptance?.total_envios ?? 0
  const name = link?.studentRealName ?? summary?.name ?? 'Estudiante'

  return {
    id: link?.studentId ?? summary?.id_estudiante,
    name,
    alias: link?.studentUsername ?? '',
    initials: getInitials(name),
    notes: link?.notes ?? '',
    createdAt: link?.createdAt ?? null,
    lastAccessAt: link?.lastAccessAt ?? null,
    acceptanceRate,
    acceptedSuggestions: acceptance?.total_aceptadas ?? 0,
    rejectedSuggestions: acceptance?.total_rechazadas ?? 0,
    unansweredSuggestions: acceptance?.sin_respuesta ?? 0,
    totalSubmissions,
    recurringWords,
    primarySignal: topWords[0]?.word ?? 'Sin palabras recurrentes',
    status: getStudentStatus({ acceptanceRate, totalSubmissions, recurringWords }),
    feedbackMix: mapFeedbackMix(acceptance),
    topWords,
  }
}
