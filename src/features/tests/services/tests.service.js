import { api } from '@/shared/services/api'

export const listTests = () => api.get('/research/tests')
export const createTest = (body) => api.post('/research/tests', body)
export const getTest = (id) => api.get(`/research/tests/${id}`)
export const saveTest = (id, body) => api.put(`/research/tests/${id}`, body)
export const activateTest = (id) => api.post(`/research/tests/${id}/activate`)
export const closeTest = (id) => api.post(`/research/tests/${id}/close`)
export const assignTest = (id, body) => api.post(`/research/tests/${id}/assignments`, body)
export const listAssignments = (id) => api.get(`/research/tests/${id}/assignments`)
export const getAttempt = (id, attemptId) =>
  api.get(`/research/tests/${id}/attempts/${attemptId}`)
export const excludeAttempt = (id, attemptId, reason) =>
  api.post(`/research/tests/${id}/attempts/${attemptId}/exclude`, { reason })
export const annotateResponse = (responseId, errorCount) =>
  api.put(`/research/responses/${responseId}/annotation`, { errorCount })
export const getResults = (id) => api.get(`/research/tests/${id}/results`)
export const downloadExport = (id) => api.download(`/research/tests/${id}/export.csv`)
