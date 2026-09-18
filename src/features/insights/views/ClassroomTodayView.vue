<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import ActivityGrid from '@/features/insights/components/ActivityGrid.vue'
import ErrorTypesBreakdown from '@/features/insights/components/ErrorTypesBreakdown.vue'
import PeriodPicker from '@/features/insights/components/PeriodPicker.vue'
import RecentCorrectionsList from '@/features/insights/components/RecentCorrectionsList.vue'
import { useInsightsStore } from '@/features/insights/store/insights.store.js'
import { periodErrors, periodLabel, presetRange } from '@/features/insights/utils/period.js'
import PageHeader from '@/shared/components/PageHeader.vue'

const router = useRouter()
const insightsStore = useInsightsStore()

const classroomOptions = computed(() =>
  insightsStore.classrooms.map((classroom) => ({
    id: classroom.id,
    label: classroom.archivedAt ? `${classroom.name} (archivado)` : classroom.name,
  })),
)

const selectedClassroom = computed(() =>
  insightsStore.classrooms.find((classroom) => classroom.id === insightsStore.selectedClassroomId),
)

const title = computed(
  () => selectedClassroom.value?.name ?? insightsStore.activity?.classroomName ?? 'Salón hoy',
)

const periodMessage = computed(() => periodErrors(insightsStore.period))
const periodText = computed(() => periodLabel(insightsStore.period))
const hasClassrooms = computed(() => insightsStore.classrooms.length > 0)
const isFirstLoad = computed(() => insightsStore.isLoading && !insightsStore.activity)
const students = computed(() => insightsStore.activity?.students ?? [])

async function loadClassroom() {
  if (periodMessage.value || !insightsStore.selectedClassroomId) return
  await insightsStore.loadClassroomToday()
}

// Los presets guardados se recalculan al abrir: "Hoy" persistido ayer debe seguir siendo hoy.
function refreshPreset() {
  const { preset } = insightsStore.period
  if (preset && preset !== 'custom') {
    insightsStore.setPeriod({ ...presetRange(preset), preset })
  }
}

async function ensureClassrooms() {
  if (!hasClassrooms.value && !(await insightsStore.loadClassrooms())) return false

  const exists = insightsStore.classrooms.some(
    (classroom) => classroom.id === insightsStore.selectedClassroomId,
  )
  if (!exists) insightsStore.selectClassroom(insightsStore.classrooms[0]?.id ?? null)

  return Boolean(insightsStore.selectedClassroomId)
}

function selectClassroom(classroomId) {
  insightsStore.selectClassroom(classroomId)
  loadClassroom()
}

// Los presets cargan al elegirse; con fechas propias se espera a Actualizar.
function updatePeriod(period) {
  insightsStore.setPeriod(period)
  if (period.preset !== 'custom') loadClassroom()
}

function openStudent(studentId) {
  router.push({ name: 'student-detail', params: { studentId } })
}

onMounted(async () => {
  refreshPreset()
  if (await ensureClassrooms()) await loadClassroom()
})
</script>

<template>
  <div class="classroom-today-page">
    <PageHeader
      eyebrow="Salón hoy"
      :title="title"
      description="Lo que escribieron tus estudiantes y en qué se equivocaron."
    >
      <template #actions>
        <Select
          :model-value="insightsStore.selectedClassroomId"
          :options="classroomOptions"
          option-label="label"
          option-value="id"
          placeholder="Salón"
          aria-label="Salón"
          :disabled="!hasClassrooms"
          @update:model-value="selectClassroom"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="insightsStore.isLoading"
          :disabled="Boolean(periodMessage) || !hasClassrooms"
          @click="loadClassroom"
        />
      </template>
    </PageHeader>

    <PeriodPicker
      :model-value="insightsStore.period"
      :disabled="!hasClassrooms"
      @update:model-value="updatePeriod"
    />

    <Message v-if="insightsStore.errorMessage" severity="error">
      {{ insightsStore.errorMessage }}
    </Message>

    <Message
      v-if="!hasClassrooms && !insightsStore.isLoading && !insightsStore.errorMessage"
      severity="info"
      :closable="false"
    >
      Aún no tienes salones. Crea uno en
      <RouterLink :to="{ name: 'classrooms' }">Salones</RouterLink>
      para ver aquí lo que escriben tus estudiantes.
    </Message>

    <template v-if="isFirstLoad">
      <Skeleton height="14rem" border-radius="1rem" />
      <Skeleton height="18rem" border-radius="1rem" />
      <Skeleton height="12rem" border-radius="1rem" />
    </template>

    <template v-else-if="insightsStore.activity">
      <section class="panel" aria-labelledby="activity-heading">
        <div class="panel__header">
          <div>
            <p class="overline">Actividad</p>
            <h2 id="activity-heading">Quién escribió</h2>
          </div>
          <span class="panel__meta">{{ periodText }}</span>
        </div>
        <ActivityGrid :students="students" @select="openStudent" />
      </section>

      <section class="panel" aria-labelledby="recent-heading">
        <div class="panel__header">
          <div>
            <p class="overline">Últimas correcciones</p>
            <h2 id="recent-heading">Qué corrigió el teclado</h2>
          </div>
          <span class="panel__meta">{{ periodText }}</span>
        </div>
        <RecentCorrectionsList :items="insightsStore.recent" />
      </section>

      <section class="panel" aria-labelledby="errors-heading">
        <div class="panel__header">
          <div>
            <p class="overline">Errores por tipo</p>
            <h2 id="errors-heading">En qué se equivocaron</h2>
          </div>
          <span class="panel__meta">{{ periodText }}</span>
        </div>
        <ErrorTypesBreakdown :errors="insightsStore.classroomErrors" />
      </section>
    </template>
  </div>
</template>
