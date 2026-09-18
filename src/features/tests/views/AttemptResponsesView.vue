<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import ReasonDialog from '@/features/tests/components/ReasonDialog.vue'
import ResponseRow from '@/features/tests/components/ResponseRow.vue'
import { useTestsStore } from '@/features/tests/store/tests.store'
import {
  ATTEMPT_STATUS_LABELS,
  canAnnotate,
  exclusionLabel,
  responseRowsFor,
} from '@/features/tests/utils/attempts'
import { formatDateTime } from '@/features/research/utils/dates'

const STATUS_SEVERITIES = {
  PENDING: 'secondary',
  IN_PROGRESS: 'warn',
  COMPLETED: 'success',
  CANCELLED: 'contrast',
}

const route = useRoute()
const router = useRouter()
const testsStore = useTestsStore()
const isReasonDialogVisible = ref(false)
const exclusionErrorMessage = ref('')
const pendingAction = ref(null)
const actionMessage = ref('')
const actionSeverity = ref('success')

const testId = computed(() => String(route.params.testId ?? ''))
const attemptId = computed(() => String(route.params.attemptId ?? ''))
const test = computed(() =>
  testsStore.selectedTest?.id === testId.value ? testsStore.selectedTest : null,
)
const attempt = computed(() =>
  testsStore.selectedAttempt?.attemptId === attemptId.value ? testsStore.selectedAttempt : null,
)
const rows = computed(() => responseRowsFor(attempt.value))
const isAnnotatable = computed(() => canAnnotate(attempt.value))
const isExcluded = computed(() => Boolean(attempt.value?.excludedAt))
const statusLabel = computed(
  () => ATTEMPT_STATUS_LABELS[attempt.value?.status] ?? attempt.value?.status ?? 'Sin estado',
)
const statusSeverity = computed(() =>
  isExcluded.value ? 'danger' : (STATUS_SEVERITIES[attempt.value?.status] ?? 'secondary'),
)
const meta = computed(() => {
  const current = attempt.value
  if (!current) return []

  const items = [
    { label: 'Inicio', value: formatDateTime(current.startedAt) },
    { label: 'Fin', value: formatDateTime(current.completedAt) },
    { label: 'Versión app', value: current.appVersion || '—' },
    { label: 'Backend', value: current.backendVersion || '—' },
    { label: 'Modelo', value: current.modelVersion || '—' },
    { label: 'Incidencias', value: String(current.incidentCount ?? 0) },
  ]
  if (current.status === 'CANCELLED' && current.cancelReason) {
    items.push({ label: 'Motivo de cancelación', value: current.cancelReason })
  }
  return items
})

onMounted(loadPage)
watch([testId, attemptId], loadPage)

async function loadPage() {
  actionMessage.value = ''
  // loadTest va primero: al cambiar de prueba reinicia el intento seleccionado e invalida su carga.
  const loads = test.value === null ? [testsStore.loadTest(testId.value)] : []
  loads.push(testsStore.loadAttempt(testId.value, attemptId.value))
  await Promise.all(loads)
}

function showMutationResult(wasSuccessful) {
  actionMessage.value = testsStore.mutationMessage
  actionSeverity.value = wasSuccessful
    ? testsStore.mutationMessage.includes('No pudimos actualizar')
      ? 'warn'
      : 'success'
    : 'error'
}

async function annotate(responseId, errorCount) {
  pendingAction.value = responseId
  actionMessage.value = ''

  try {
    showMutationResult(await testsStore.annotate(responseId, errorCount))
  } finally {
    pendingAction.value = null
  }
}

function openExclusion() {
  exclusionErrorMessage.value = ''
  isReasonDialogVisible.value = true
}

async function excludeAttempt(reason) {
  pendingAction.value = 'exclude'
  exclusionErrorMessage.value = ''

  try {
    const wasSuccessful = await testsStore.excludeAttempt(testId.value, attemptId.value, reason)
    if (wasSuccessful) {
      showMutationResult(true)
      isReasonDialogVisible.value = false
    } else {
      exclusionErrorMessage.value = testsStore.mutationMessage
    }
  } finally {
    pendingAction.value = null
  }
}

function goBack() {
  router.push({ name: 'research-test', params: { testId: testId.value } })
}
</script>

<template>
  <div class="research-page attempt-page">
    <div v-if="testsStore.isLoading && !attempt" class="test-editor-loading">
      <Skeleton height="6.5rem" />
      <Skeleton height="22rem" />
    </div>

    <template v-else-if="attempt">
      <div class="page-header test-editor-header">
        <div>
          <div class="test-editor-header__context">
            <code class="test-code">{{ test?.code || 'Prueba' }}</code>
            <Tag :value="statusLabel" :severity="statusSeverity" rounded />
            <Tag v-if="isExcluded" value="Excluido" severity="danger" icon="pi pi-ban" rounded />
          </div>
          <h1>{{ attempt.studentUsername || 'Alumno sin identificar' }}</h1>
          <p>{{ test?.title || 'Respuestas del intento' }}</p>
        </div>
        <div class="page-header__actions">
          <Button
            label="Volver"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="goBack"
          />
          <Button
            v-if="!isExcluded"
            label="Excluir"
            icon="pi pi-ban"
            severity="danger"
            outlined
            :loading="pendingAction === 'exclude'"
            @click="openExclusion"
          />
        </div>
      </div>

      <Message v-if="testsStore.errorMessage" severity="error" :closable="false">
        <div class="research-refresh-warning">
          <span>{{ testsStore.errorMessage }}</span>
          <Button
            label="Reintentar"
            icon="pi pi-refresh"
            severity="danger"
            text
            size="small"
            @click="loadPage"
          />
        </div>
      </Message>
      <Message v-if="actionMessage" :severity="actionSeverity" :closable="false">
        {{ actionMessage }}
      </Message>
      <Message v-if="isExcluded" severity="warn" icon="pi pi-ban" :closable="false">
        {{ exclusionLabel(attempt) }} · {{ formatDateTime(attempt.excludedAt) }}
      </Message>
      <Message v-if="attempt.status === 'IN_PROGRESS'" severity="info" :closable="false">
        Las oraciones libres se anotan al terminar el intento.
      </Message>

      <section class="panel attempt-meta">
        <p class="overline">Ficha del intento</p>
        <dl>
          <div v-for="item in meta" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel sentence-panel">
        <div class="directory-panel__toolbar">
          <div>
            <p class="overline">Respuestas por oración</p>
            <h2>{{ rows.length }} {{ rows.length === 1 ? 'oración' : 'oraciones' }}</h2>
          </div>
          <Button
            icon="pi pi-refresh"
            severity="secondary"
            text
            rounded
            aria-label="Actualizar respuestas"
            :loading="testsStore.isLoading"
            @click="loadPage"
          />
        </div>

        <p v-if="!rows.length" class="table-empty">Este intento todavía no tiene respuestas.</p>
        <div v-else class="sentence-editor__scroll">
          <table class="response-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Oración</th>
                <th scope="col">Duración</th>
                <th scope="col">Errores</th>
                <th scope="col">Sugerencias</th>
              </tr>
            </thead>
            <tbody>
              <ResponseRow
                v-for="row in rows"
                :key="row.responseId"
                :row="row"
                :can-annotate="isAnnotatable"
                :is-saving="pendingAction === row.responseId"
                @annotate="annotate"
              />
            </tbody>
          </table>
        </div>
      </section>

      <ReasonDialog
        v-model:visible="isReasonDialogVisible"
        :username="attempt.studentUsername ?? ''"
        :is-saving="pendingAction === 'exclude'"
        :error-message="exclusionErrorMessage"
        @submit="excludeAttempt"
      />
    </template>

    <section v-else class="panel research-empty-state">
      <span class="research-empty-state__icon">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      </span>
      <h2>No pudimos mostrar este intento.</h2>
      <p>Puede que ya no exista o que tu cuenta no tenga permiso para verlo.</p>
      <div class="row-actions">
        <Button label="Volver a la prueba" severity="secondary" text @click="goBack" />
        <Button label="Reintentar" icon="pi pi-refresh" @click="loadPage" />
      </div>
    </section>
  </div>
</template>
