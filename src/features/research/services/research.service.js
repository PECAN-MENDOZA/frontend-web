import { api } from '@/shared/services/api'

export function listStudies() {
  return api.get('/research/studies')
}

export function listParticipants(studyId) {
  return api.get(`/research/studies/${studyId}/participants`)
}

export function listRuns(studyId) {
  return api.get(`/research/studies/${studyId}/runs`)
}

export function listAnnotationBatches(studyId) {
  return api.get(`/research/studies/${studyId}/annotation-batches`)
}
