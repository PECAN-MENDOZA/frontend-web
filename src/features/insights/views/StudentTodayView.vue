<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import ErrorExamplesPanel from '@/features/insights/components/ErrorExamplesPanel.vue'
import HelpResponsePanel from '@/features/insights/components/HelpResponsePanel.vue'
import PeriodPicker from '@/features/insights/components/PeriodPicker.vue'
import PracticeWordsCard from '@/features/insights/components/PracticeWordsCard.vue'
import StudentTestsPanel from '@/features/insights/components/StudentTestsPanel.vue'
import WritingsList from '@/features/insights/components/WritingsList.vue'
import { useInsightsStore } from '@/features/insights/store/insights.store.js'
import { periodErrors, periodLabel } from '@/features/insights/utils/period.js'
import StudentCredentialDialog from '@/features/students/components/StudentCredentialDialog.vue'
import { useStudentsStore } from '@/features/students/store/students.store'
import PageHeader from '@/shared/components/PageHeader.vue'

// Ficha del alumno: qué escribió, en qué se equivocó y cómo respondió a la ayuda en el periodo
// elegido. Describe; no compara periodos ni califica.
const route = useRoute()
const router = useRouter()
const insightsStore = useInsightsStore()
const studentsStore = useStudentsStore()

const studentId = computed(() => String(route.params.studentId ?? ''))
const link = computed(() =>
  studentsStore.students.find((student) => String(student.id) === studentId.value),
)
const studentName = computed(() => link.value?.realName ?? '')
const title = computed(() => studentName.value || 'Estudiante')
// '' mientras el directorio no ha cargado el vínculo: evita mostrar "Sin salón" de más antes de
// saber si el alumno tiene o no un salón.
const identity = computed(() => {
  if (!link.value) return ''
  return [link.value.username, link.value.classroomName || 'Sin salón'].filter(Boolean).join(' · ')
})

const periodMessage = computed(() => periodErrors(insightsStore.period))
const periodText = computed(() => periodLabel(insightsStore.period))
// Solo se muestran datos cargados para este alumno: al cambiar de ficha no queda la anterior.
const student = computed(() =>
  insightsStore.student.id === studentId.value ? insightsStore.student : null,
)
const isFirstLoad = computed(() => insightsStore.isLoading && !student.value)
const isUnknownStudent = computed(
  () => !link.value && !studentsStore.isLoading && studentsStore.students.length > 0,
)
const resetCredential = computed(() =>
  studentsStore.resetPinCredentials
    ? { ...studentsStore.resetPinCredentials, studentRealName: studentName.value }
    : null,
)

async function loadStudent() {
  if (periodMessage.value || !studentId.value) return
  await insightsStore.loadStudentToday(studentId.value)
}

// Los presets cargan al elegirse; con fechas propias se espera a Actualizar.
function updatePeriod(period) {
  insightsStore.setPeriod(period)
  if (period.preset !== 'custom') loadStudent()
}

function downloadReport() {
  if (periodMessage.value) return
  insightsStore.downloadReport(studentId.value)
}

function resetPin() {
  studentsStore.resetStudentPin(studentId.value)
}

onMounted(async () => {
  insightsStore.refreshPreset()
  studentsStore.clearResetPinCredentials()
  // El nombre, usuario y salón vienen del directorio; se pide solo si aún no está en memoria.
  const loads = [loadStudent()]
  if (!link.value) loads.push(studentsStore.loadStudents())
  await Promise.all(loads)
})

watch(studentId, loadStudent)
</script>

<template>
  <div class="student-today-page">
    <Button
      label="Volver a estudiantes"
      icon="pi pi-arrow-left"
      severity="secondary"
      text
      class="student-today-page__back"
      @click="router.push({ name: 'students' })"
    />

    <PageHeader eyebrow="Ficha del alumno" :title="title" :description="identity">
      <template #actions>
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="insightsStore.isLoading"
          :disabled="Boolean(periodMessage)"
          @click="loadStudent"
        />
        <Button
          label="Reporte del periodo (PDF)"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :loading="insightsStore.isDownloading"
          :disabled="Boolean(periodMessage)"
          @click="downloadReport"
        />
        <Button
          label="Reiniciar PIN"
          icon="pi pi-key"
          severity="secondary"
          outlined
          :loading="studentsStore.isResettingPin"
          :disabled="!link"
          @click="resetPin"
        />
      </template>
    </PageHeader>

    <PeriodPicker :model-value="insightsStore.period" @update:model-value="updatePeriod" />

    <Message v-if="insightsStore.errorMessage" severity="error">
      {{ insightsStore.errorMessage }}
    </Message>
    <Message v-if="studentsStore.errorMessage" severity="error">
      {{ studentsStore.errorMessage }}
    </Message>
    <Message v-if="isUnknownStudent" severity="info" :closable="false">
      Este estudiante no está entre tus vínculos activos. Vuelve a
      <RouterLink :to="{ name: 'students' }">Estudiantes</RouterLink>.
    </Message>
    <Message v-if="insightsStore.downloadMessage" severity="warn" :closable="false">
      {{ insightsStore.downloadMessage }}
    </Message>
    <Message v-if="studentsStore.resetPinErrorMessage" severity="warn" :closable="false">
      {{ studentsStore.resetPinErrorMessage }}
    </Message>

    <template v-if="isFirstLoad">
      <Skeleton height="12rem" border-radius="1rem" />
      <Skeleton height="14rem" border-radius="1rem" />
      <Skeleton height="16rem" border-radius="1rem" />
    </template>

    <template v-else-if="student">
      <section class="panel" aria-labelledby="student-errors-heading">
        <div class="panel__header">
          <div>
            <p class="overline">Errores por tipo</p>
            <h2 id="student-errors-heading">En qué se equivoca</h2>
          </div>
          <span class="panel__meta">{{ periodText }}</span>
        </div>
        <ErrorExamplesPanel :errors="student.errors" />
      </section>

      <div class="student-today-grid">
        <section class="panel" aria-labelledby="student-help-heading">
          <div class="panel__header">
            <div>
              <p class="overline">Sugerencias del teclado</p>
              <h2 id="student-help-heading">Cómo responde a la ayuda</h2>
            </div>
            <span class="panel__meta">{{ periodText }}</span>
          </div>
          <HelpResponsePanel :help="student.help" />
        </section>

        <section class="panel" aria-labelledby="student-practice-heading">
          <div class="panel__header">
            <div>
              <p class="overline">Para la clase</p>
              <h2 id="student-practice-heading">Palabras para practicar</h2>
            </div>
            <span class="panel__meta">{{ periodText }}</span>
          </div>
          <PracticeWordsCard
            :words="student.errors?.practiceWords ?? []"
            :student-name="studentName"
          />
        </section>
      </div>

      <section class="panel" aria-labelledby="student-writings-heading">
        <div class="panel__header">
          <div>
            <p class="overline">Escrituras</p>
            <h2 id="student-writings-heading">Lo que escribió</h2>
          </div>
          <span class="panel__meta">{{ periodText }}</span>
        </div>
        <WritingsList :items="student.writings" />
      </section>

      <section class="panel" aria-labelledby="student-tests-heading">
        <div class="panel__header">
          <div>
            <p class="overline">Pruebas de oraciones</p>
            <h2 id="student-tests-heading">Pruebas</h2>
          </div>
          <span class="panel__meta">Todas las pruebas completadas</span>
        </div>
        <StudentTestsPanel :tests="student.tests" />
      </section>
    </template>

    <StudentCredentialDialog
      :credential="resetCredential"
      header="Nuevo PIN temporal"
      intro="Entrega este nuevo PIN al estudiante. El usuario se mantiene igual."
      action-label="Ya entregué el nuevo PIN"
      @close="studentsStore.clearResetPinCredentials"
    />
  </div>
</template>
