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

// Anotación ciega: el lote congela las ejecuciones completadas del momento; el export es un CSV.
export function createAnnotationBatch(studyId, kind) {
  return api.post(`/research/studies/${studyId}/annotation-batches?${query({ kind })}`)
}

export function getAnnotationBatch(studyId, batchId) {
  return api.get(`/research/studies/${studyId}/annotation-batches/${batchId}`)
}

export function downloadAnnotationExport(studyId, batchId) {
  return api.download(`/research/studies/${studyId}/annotation-batches/${batchId}/export`)
}

export function importAnnotation(studyId, batchId, { slot, rater, file }) {
  const formData = new FormData()

  formData.append('file', file)

  return api.upload(
    `/research/studies/${studyId}/annotation-batches/${batchId}/imports?${query({ slot, rater })}`,
    formData,
  )
}

export function getStudyResults(studyId) {
  return api.get(`/research/studies/${studyId}/results`)
}

export function downloadAnalysisCsv(studyId) {
  return api.download(`/research/studies/${studyId}/analysis.csv`)
}

// Evaluación técnica del modelo (F0.5): independiente de los estudios.
export function listTechnicalEvaluations(modelVersion) {
  const suffix = modelVersion ? `?${query({ modelVersion })}` : ''

  return api.get(`/research/technical-evaluations${suffix}`)
}

export function createTechnicalEvaluation(payload) {
  return api.post('/research/technical-evaluations', payload)
}

function query(params) {
  return new URLSearchParams(params).toString()
}

// Decisiones sobre ejecuciones: el motivo viaja en el cuerpo, nunca en la ruta.
export function cancelRun(studyId, runId, reason) {
  return api.post(`/research/studies/${studyId}/runs/${runId}/cancel`, { reason })
}

export function failRunTechnically(studyId, runId, reason) {
  return api.post(`/research/studies/${studyId}/runs/${runId}/technical-failure`, { reason })
}

export function excludeRun(studyId, runId, reason) {
  return api.post(`/research/studies/${studyId}/runs/${runId}/exclude`, { reason })
}
