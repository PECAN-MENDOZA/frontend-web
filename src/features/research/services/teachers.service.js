import { api } from '@/shared/services/api'

export const listTeachers = () => api.get('/research/teachers')
export const createTeacher = (body) => api.post('/research/teachers', body)
export const resetTeacherPassword = (id) => api.post(`/research/teachers/${id}/reset-password`)
export const listClassroomDirectory = () => api.get('/research/classrooms')
