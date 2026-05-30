import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { STUDENT_MONTH_OPTIONS } from '@/features/students/composables/useStudents'
import { useStudentsStore } from '@/features/students/store/students.store'

export function useStudentDetail() {
  const route = useRoute()
  const studentsStore = useStudentsStore()
  const selectedMonth = ref('2026-05')
  const studentId = computed(() => route.params.studentId)

  function loadStudent() {
    studentsStore.loadStudent(studentId.value, selectedMonth.value)
  }

  onMounted(loadStudent)
  onUnmounted(studentsStore.clearSelectedStudent)
  watch([studentId, selectedMonth], loadStudent)

  return {
    studentsStore,
    selectedMonth,
    monthOptions: STUDENT_MONTH_OPTIONS,
    refreshStudent: loadStudent,
  }
}
