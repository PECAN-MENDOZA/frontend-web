import { api } from '@/shared/services/api'

export const listClassrooms = () => api.get('/teachers/classrooms')
export const createClassroom = (name) => api.post('/teachers/classrooms', { name })
export const updateClassroom = (id, patch) => api.patch(`/teachers/classrooms/${id}`, patch)
export const listClassroomStudents = (id) => api.get(`/teachers/classrooms/${id}/students`)
export const createClassroomStudents = (id, body) =>
  api.post(`/teachers/classrooms/${id}/students`, body)
export const updateStudent = (studentId, body) => api.patch(`/teachers/students/${studentId}`, body)
export const moveStudent = (studentId, classroomId) =>
  api.patch(`/teachers/students/${studentId}/classroom`, { classroomId })
export const deactivateStudent = (studentId) =>
  api.post(`/teachers/students/${studentId}/deactivate`)
export const resetStudentPin = (studentId) => api.post(`/teachers/students/${studentId}/reset-pin`)
