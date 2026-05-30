import { api } from '@/shared/services/api'

export function getStudentReport(studentId, month) {
  return api.get(`/reports/students/${studentId}?month=${month}`)
}

export function getStudentReportPdf(studentId, month) {
  return api.download(`/reports/students/${studentId}/pdf?month=${month}`)
}
