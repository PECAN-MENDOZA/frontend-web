import { api } from '@/shared/services/api'
import { periodQuery } from '@/features/insights/utils/period.js'

// Reusa /teachers/classrooms (mismo endpoint que features/classrooms).
export const listClassrooms = () => api.get('/teachers/classrooms')

export const getClassroomActivity = (id, period) =>
  api.get(`/teachers/classrooms/${id}/activity?${periodQuery(period)}`)

export const getRecentCorrections = (id, period, limit = 50) =>
  api.get(`/teachers/classrooms/${id}/corrections/recent?${periodQuery(period)}&limit=${limit}`)

export const getClassroomErrors = (id, period) =>
  api.get(`/teachers/classrooms/${id}/errors?${periodQuery(period)}`)

export const getStudentErrors = (id, period) =>
  api.get(`/teachers/students/${id}/errors?${periodQuery(period)}`)

export const getStudentHelp = (id, period) =>
  api.get(`/teachers/students/${id}/help?${periodQuery(period)}`)

export const getStudentWritings = (id, period, limit = 100) =>
  api.get(`/teachers/students/${id}/writings?${periodQuery(period)}&limit=${limit}`)

export const getStudentTests = (id) => api.get(`/teachers/students/${id}/tests`)

export const getLiveTests = () => api.get('/teachers/tests/live')

export const downloadPeriodReport = (id, period) =>
  api.download(`/reports/students/${id}/pdf?${periodQuery(period)}`)
