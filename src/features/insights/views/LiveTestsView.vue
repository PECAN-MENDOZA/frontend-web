<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useInsightsStore } from '@/features/insights/store/insights.store.js'
import { formatRelative } from '@/features/insights/utils/period.js'
import {
  attemptLabel,
  finishedAttempts,
  liveProgressLabel,
} from '@/features/insights/utils/tests.js'
import PageHeader from '@/shared/components/PageHeader.vue'

// Único sondeo del panel docente (spec §5): cada 5 s mientras esta vista está montada.
const FINISHED_NOTICE_MS = 30_000

const router = useRouter()
const insightsStore = useInsightsStore()
const finished = ref([])
const timers = new Map()

const rows = computed(() => {
  const now = new Date()

  return insightsStore.live.map((item) => ({
    ...item,
    testLabel: attemptLabel(item),
    progressLabel: liveProgressLabel(item),
    startedLabel: formatRelative(item.startedAt, now),
  }))
})

const isFirstLoad = computed(() => insightsStore.isLiveLoading && !insightsStore.live.length)

// Un intento que deja de estar en curso se anuncia 30 s con un enlace a la ficha del alumno.
function announceFinished(items) {
  for (const item of items) {
    finished.value = [...finished.value.filter((f) => f.attemptId !== item.attemptId), item]
    window.clearTimeout(timers.get(item.attemptId))
    timers.set(
      item.attemptId,
      window.setTimeout(() => dismissFinished(item.attemptId), FINISHED_NOTICE_MS),
    )
  }
}

function openStudent(studentId) {
  router.push({ name: 'student-detail', params: { studentId } })
}

function dismissFinished(attemptId) {
  window.clearTimeout(timers.get(attemptId))
  timers.delete(attemptId)
  finished.value = finished.value.filter((item) => item.attemptId !== attemptId)
}

watch(
  () => insightsStore.live,
  (current, previous) => announceFinished(finishedAttempts(previous, current)),
)

onMounted(() => {
  insightsStore.loadLive()
  insightsStore.startLivePolling()
})

onUnmounted(() => {
  insightsStore.stopLivePolling()
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
})
</script>

<template>
  <div class="live-tests-page">
    <PageHeader
      eyebrow="Prueba en curso"
      title="Quién está en una prueba ahora."
      description="Se actualiza cada 5 segundos mientras esta pantalla está abierta."
    >
      <template #actions>
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="insightsStore.isLiveLoading"
          @click="insightsStore.loadLive"
        />
      </template>
    </PageHeader>

    <Message v-if="insightsStore.liveError" severity="error" :closable="false">
      {{ insightsStore.liveError }}
    </Message>

    <Message
      v-for="item in finished"
      :key="item.attemptId"
      severity="success"
      :closable="true"
      @close="dismissFinished(item.attemptId)"
    >
      {{ item.realName || item.username }} ya no está en la prueba {{ item.testCode }}.
      <RouterLink :to="{ name: 'student-detail', params: { studentId: item.studentId } }">
        Ver ficha
      </RouterLink>
    </Message>

    <section class="panel directory-panel" aria-labelledby="live-heading">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">En curso</p>
          <h2 id="live-heading">
            {{ rows.length === 1 ? '1 estudiante' : `${rows.length} estudiantes` }}
          </h2>
        </div>
      </div>

      <div v-if="isFirstLoad" class="directory-loading">
        <Skeleton v-for="item in 3" :key="item" height="3.6rem" />
      </div>
      <p v-else-if="!rows.length" class="table-empty">
        Ningún estudiante está haciendo una prueba ahora.
      </p>
      <DataTable v-else :value="rows" class="live-tests-table" table-style="min-width: 44rem">
        <Column header="Estudiante">
          <template #body="{ data }">
            <strong>{{ data.realName || data.username }}</strong>
            <span class="classroom-username live-tests-table__username">{{ data.username }}</span>
          </template>
        </Column>
        <Column field="classroomName" header="Salón" />
        <Column header="Prueba">
          <template #body="{ data }">{{ data.testLabel }}</template>
        </Column>
        <Column header="Avance">
          <template #body="{ data }">
            <span class="test-number">{{ data.progressLabel }}</span>
          </template>
        </Column>
        <Column header="Inicio">
          <template #body="{ data }">
            <time :datetime="data.startedAt">{{ data.startedLabel }}</time>
          </template>
        </Column>
        <Column header="Ficha">
          <template #body="{ data }">
            <Button
              label="Ver ficha"
              icon="pi pi-arrow-right"
              icon-pos="right"
              text
              size="small"
              @click="openStudent(data.studentId)"
            />
          </template>
        </Column>
      </DataTable>
    </section>
  </div>
</template>
