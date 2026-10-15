import { api } from '@/shared/services/api'

// Directorio del docente: solo los vínculos activos (/teachers/students), sin cifras por mes.
export async function getStudents() {
  const links = await api.get('/teachers/students')
  return links.map(mapStudentLink)
}

export function resetStudentPin(studentId) {
  return api.post(`/teachers/students/${studentId}/reset-pin`)
}

function mapStudentLink(link) {
  return {
    id: link.studentId,
    // '' si el docente aún no le puso nombre: la tabla muestra "Sin nombre".
    realName: link.studentRealName ?? '',
    username: link.studentUsername ?? '',
    notes: link.notes ?? '',
    classroomId: link.classroomId ?? null,
    classroomName: link.classroomName ?? '',
    createdAt: link.createdAt ?? null,
    lastAccessAt: link.lastAccessAt ?? null,
  }
}
