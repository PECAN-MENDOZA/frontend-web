import { computed, onMounted, ref, watch } from 'vue'
import { useStudentsStore } from '@/features/students/store/students.store'
import { getCurrentMonthValue, getMonthOptions } from '@/shared/utils/month'

export const STUDENT_MONTH_OPTIONS = getMonthOptions()

export function useStudents() {
  const studentsStore = useStudentsStore()
  const selectedMonth = ref(getCurrentMonthValue())
  const searchQuery = ref('')

  const filteredStudents = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    if (!query) {
      return studentsStore.students
    }

    return studentsStore.students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) || student.alias.toLowerCase().includes(query),
    )
  })

  const reviewCount = computed(
    () => studentsStore.students.filter((student) => student.status === 'Acompanar').length,
  )
  const averageAcceptance = computed(() => {
    const rates = studentsStore.students
      .map((student) => student.acceptanceRate)
      .filter((rate) => rate != null)

    if (!rates.length) return '--'
    return `${(rates.reduce((total, rate) => total + rate, 0) / rates.length).toFixed(1)}%`
  })

  onMounted(() => studentsStore.loadStudents(selectedMonth.value))
  watch(selectedMonth, (month) => studentsStore.loadStudents(month))

  return {
    studentsStore,
    selectedMonth,
    searchQuery,
    filteredStudents,
    reviewCount,
    averageAcceptance,
    monthOptions: STUDENT_MONTH_OPTIONS,
  }
}
