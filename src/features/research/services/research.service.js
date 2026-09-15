import { api } from '@/shared/services/api'

export function listStudies() {
  return api.get('/research/studies')
}

export function createStudy({ code, title }) {
  return api.post('/research/studies', { code, title })
}

export function closeStudy(studyId) {
  return api.post(`/research/studies/${studyId}/close`)
}

export function listProtocols(studyId) {
  return api.get(`/research/studies/${studyId}/protocols`)
}

export function createProtocol(studyId, { taskAPrompt, taskBPrompt }) {
  return api.post(`/research/studies/${studyId}/protocols`, { taskAPrompt, taskBPrompt })
}

export function activateProtocol(studyId, protocolId) {
  return api.post(`/research/studies/${studyId}/protocols/${protocolId}/activate`)
}

export function listParticipants(studyId) {
  return api.get(`/research/studies/${studyId}/participants`)
}

export function createParticipant(studyId) {
  return api.post(`/research/studies/${studyId}/participants`, {})
}

export function generateAccessCode(studyId, participantId) {
  return api.post(`/research/studies/${studyId}/participants/${participantId}/access-code`, {})
}

export function revokeAccessCode(studyId, runId) {
  return api.post(`/research/studies/${studyId}/access-codes/${runId}/revoke`)
}

export function listRuns(studyId) {
  return api.get(`/research/studies/${studyId}/runs`)
}

export function listAnnotationBatches(studyId) {
  return api.get(`/research/studies/${studyId}/annotation-batches`)
}
