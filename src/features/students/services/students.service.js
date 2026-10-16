import { api } from '@/shared/services/api'

// Directorio del docente: solo los vínculos activos (/teachers/students), sin cifras por mes. El
// vínculo no dice si su salón está archivado: se cruza con la lista de salones (si esa carga falla,
// el directorio se muestra igual, sin la marca).
export async function getStudents() {
  const [links, classrooms] = await Promise.all([
    api.get('/teachers/students'),
    api.get('/teachers/classrooms').catch(() => []),
  ])
  const archivedIds = new Set(
    (classrooms ?? []).filter((classroom) => classroom.archivedAt).map((classroom) => classroom.id),
  )

  return links.map((link) => mapStudentLink(link, archivedIds))
}

export function resetStudentPin(studentId) {
  return api.post(`/teachers/students/${studentId}/reset-pin`)
}

function mapStudentLink(link, archivedIds) {
  return {
    id: link.studentId,
    // '' si el docente aún no le puso nombre: la tabla muestra "Sin nombre".
    realName: link.studentRealName ?? '',
    username: link.studentUsername ?? '',
    notes: link.notes ?? '',
    classroomId: link.classroomId ?? null,
    classroomName: link.classroomName ?? '',
    classroomArchived: archivedIds.has(link.classroomId),
    createdAt: link.createdAt ?? null,
    lastAccessAt: link.lastAccessAt ?? null,
  }
}
