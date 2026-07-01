import { api } from '@/shared/services/api'
import { getInitials, getStudentStatus, mapFeedbackMix, mapTopWords, sumTopWordFrequency } from '@/shared/utils/kpi'
import { formatMonthShortLabel } from '@/shared/utils/month'

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

export async function getAcceptanceTrend(studentId, from, to) {
  const data = await api.get(
    `/kpis/students/${studentId}/acceptance-trend?from=${from}&to=${to}`,
  )
  return mapAcceptanceTrend(data)
}

export async function getErrorTypes(studentId, month) {
  const data = await api.get(`/kpis/students/${studentId}/error-types?month=${month}`)
  return mapErrorTypes(data)
}

function mapAcceptanceTrend(data) {
  const serie = data?.serie ?? []

  return {
    from: data?.desde ?? null,
    to: data?.hasta ?? null,
    points: serie.map((point) => ({
      month: point.month,
      label: formatMonthShortLabel(point.month),
      acceptanceRate: point.tasa_aceptacion_pct ?? 0,
      totalSubmissions: point.total_envios ?? 0,
      acceptedCount: point.total_aceptadas ?? 0,
    })),
  }
}

function mapErrorTypes(data) {
  const tipos = data?.tipos_error ?? []

  return {
    month: data?.month ?? null,
    totalErrors: data?.total_errores ?? 0,
    items: tipos.map((item) => ({
      type: item.tipo,
      label: item.nombre ?? item.tipo,
      count: item.cantidad ?? 0,
      percentage: item.porcentaje ?? 0,
    })),
  }
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
    editedSuggestions: acceptance?.total_editadas ?? 0,
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
