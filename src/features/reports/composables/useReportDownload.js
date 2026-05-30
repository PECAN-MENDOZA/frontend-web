import { computed, ref, watch } from 'vue'
import {
  getStudentReport,
  getStudentReportPdf,
} from '@/features/reports/services/reports.service'

export function useReportDownload(studentId, selectedMonth) {
  const report = ref(null)
  const isChecking = ref(false)
  const isDownloading = ref(false)
  const errorMessage = ref('')

  const isReportAvailable = computed(() => Boolean(report.value?.available))
  const isLoading = computed(() => isChecking.value || isDownloading.value)
  const buttonLabel = computed(() => {
    if (isChecking.value) return 'Verificando reporte'
    if (isDownloading.value) return 'Descargando reporte'
    return isReportAvailable.value ? 'Descargar reporte PDF' : 'Reporte no disponible'
  })

  async function loadReportAvailability() {
    if (!studentId.value || !selectedMonth.value) {
      report.value = null
      return
    }

    isChecking.value = true
    errorMessage.value = ''

    try {
      report.value = await getStudentReport(studentId.value, selectedMonth.value)
    } catch {
      report.value = null
      errorMessage.value = 'No pudimos verificar la disponibilidad del reporte.'
    } finally {
      isChecking.value = false
    }
  }

  async function downloadReport() {
    if (!isReportAvailable.value) return

    isDownloading.value = true
    errorMessage.value = ''

    try {
      const { blob, filename } = await getStudentReportPdf(studentId.value, selectedMonth.value)
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = downloadUrl
      link.download = filename ?? `reporte-estudiante-${selectedMonth.value}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch {
      errorMessage.value = 'No pudimos descargar el reporte. Inténtalo nuevamente.'
    } finally {
      isDownloading.value = false
    }
  }

  watch([studentId, selectedMonth], loadReportAvailability, { immediate: true })

  return {
    buttonLabel,
    errorMessage,
    isLoading,
    isReportAvailable,
    downloadReport,
  }
}
