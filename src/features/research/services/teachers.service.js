import { api } from '@/shared/services/api'

export const listTeachers = () => api.get('/research/teachers')
export const createTeacher = (body) => api.post('/research/teachers', body)
export const resetTeacherPassword = (id) => api.post(`/research/teachers/${id}/reset-password`)
export const deactivateTeacher = (id) => api.post(`/research/teachers/${id}/deactivate`)
export const reactivateTeacher = (id) => api.post(`/research/teachers/${id}/reactivate`)
export const listClassroomDirectory = () => api.get('/research/classrooms')
