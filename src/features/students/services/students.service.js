import { api } from '@/shared/services/api'
import {
  getErrorTypeLabel,
  getInitials,
  getStudentStatus,
  mapErrorDistribution,
  mapTopWords,
} from '@/shared/utils/kpi'

export async function getStudents(month) {
  const links = await api.get('/teachers/students')
  return Promise.all(links.map((link) => getStudentListItem(link, month)))
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
  const errors = summary?.errores_por_tipo ?? []
  const totalErrors = errors.reduce((total, item) => total + item.count, 0)
  const primarySignal = [...errors].sort((first, second) => second.count - first.count)[0]
  const name = link?.studentRealName ?? summary?.name ?? 'Estudiante'

  return {
    id: link?.studentId ?? summary?.id_estudiante,
    name,
    alias: link?.studentUsername ?? '',
    initials: getInitials(name),
    notes: link?.notes ?? '',
    createdAt: link?.createdAt ?? null,
    lastAccessAt: link?.lastAccessAt ?? null,
    acceptanceRate: acceptance?.tasa_aceptacion_pct ?? null,
    acceptedSuggestions: acceptance?.total_aceptadas ?? 0,
    rejectedSuggestions: acceptance?.total_rechazadas ?? 0,
    unansweredSuggestions: acceptance?.sin_respuesta ?? 0,
    totalSubmissions: acceptance?.total_envios ?? 0,
    totalErrors,
    primarySignal: primarySignal ? getErrorTypeLabel(primarySignal.type) : 'Sin señales',
    status: getStudentStatus(totalErrors),
    errorDistribution: mapErrorDistribution(errors),
    topWords: mapTopWords(summary?.top_palabras),
  }
}
