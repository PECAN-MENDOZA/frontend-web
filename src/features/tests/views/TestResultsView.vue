<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import ConditionMetricsPanel from '@/features/tests/components/ConditionMetricsPanel.vue'
import PerSentenceTable from '@/features/tests/components/PerSentenceTable.vue'
import { useTestsStore } from '@/features/tests/store/tests.store'
import { resultsBanners, resultsJsonFilename } from '@/features/tests/utils/results'
import { STATUS_LABELS } from '@/features/tests/utils/sentences'
import { formatDateTime } from '@/features/research/utils/dates'
import { saveBlob } from '@/features/research/utils/download'

const STATUS_SEVERITIES = { DRAFT: 'secondary', ACTIVE: 'success', CLOSED: 'contrast' }
const EMPTY_MESSAGE =
  'Puede que la prueba ya no exista o que tu cuenta no tenga permiso para verla.'

const route = useRoute()
const router = useRouter()
const testsStore = useTestsStore()
const pendingAction = ref(null)
const actionMessage = ref('')
const actionSeverity = ref('success')

const testId = computed(() => String(route.params.testId ?? ''))
const results = computed(() =>
  testsStore.results?.testId === testId.value ? testsStore.results : null,
)
const banners = computed(() => resultsBanners(results.value))
const sampleItems = computed(() => {
  const sample = results.value?.sample ?? {}

  return [
    { label: 'Asignados', value: sample.assigned },
    { label: 'Completados', value: sample.completed },
    { label: 'En curso', value: sample.inProgress },
    { label: 'Cancelados', value: sample.cancelled },
    { label: 'Excluidos', value: sample.excluded },
    { label: 'Libres sin anotar', value: sample.unannotatedFree },
  ].map((item) => ({ ...item, value: String(item.value ?? 0) }))
})
const provenanceItems = computed(() => {
  const provenance = results.value?.provenance ?? {}

  return [
    { label: 'Modelo', values: provenance.modelVersions },
    { label: 'App', values: provenance.appVersions },
    { label: 'Backend', values: provenance.backendVersions },
  ].map((item) => ({ ...item, value: item.values?.length ? item.values.join(', ') : '—' }))
})

onMounted(loadPage)
watch(testId, loadPage)

function loadPage() {
  actionMessage.value = ''
  return testsStore.loadResults(testId.value)
}

async function downloadCsv() {
  pendingAction.value = 'csv'
  actionMessage.value = ''

  try {
    const wasSuccessful = await testsStore.downloadExport(testId.value)
    actionMessage.value = testsStore.mutationMessage
    actionSeverity.value = wasSuccessful ? 'success' : 'error'
  } finally {
    pendingAction.value = null
  }
}

// El JSON es la respuesta de resultados tal cual (incluye computedAt y datasetSha256) para
// citarla junto al CSV: mismo hash, misma fecha de cálculo.
function downloadJson() {
  const current = results.value
  if (!current) return

  const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' })
  saveBlob({ blob, filename: resultsJsonFilename(current) }, 'results.json')
  actionMessage.value = 'Archivo descargado.'
  actionSeverity.value = 'success'
}

function goBack() {
  router.push({ name: 'research-test', params: { testId: testId.value } })
}
</script>

<template>
  <div class="research-page results-page">
    <div v-if="testsStore.isLoading && !results" class="test-editor-loading">
      <Skeleton height="6.5rem" />
      <Skeleton height="14rem" />
      <Skeleton height="18rem" />
    </div>

    <template v-else-if="results">
      <div class="page-header test-editor-header">
        <div>
          <div class="test-editor-header__context">
            <code class="test-code">{{ results.code || 'Prueba' }}</code>
            <Tag
              :value="STATUS_LABELS[results.status] ?? results.status ?? 'Sin estado'"
              :severity="STATUS_SEVERITIES[results.status] ?? 'secondary'"
              rounded
            />
          </div>
          <h1>{{ results.title || 'Resultados' }}</h1>
          <p>Calculado {{ formatDateTime(results.computedAt) }}</p>
        </div>
        <div class="page-header__actions">
          <Button
            label="Prueba"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="goBack"
          />
          <Button
            label="Actualizar"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            :loading="testsStore.isLoading"
            @click="loadPage"
          />
          <Button
            label="Descargar JSON"
            icon="pi pi-download"
            severity="secondary"
            outlined
            @click="downloadJson"
          />
          <Button
            label="Descargar CSV"
            icon="pi pi-file-excel"
            :loading="pendingAction === 'csv'"
            @click="downloadCsv"
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
      <Message
        v-for="banner in banners"
        :key="banner.text"
        :severity="banner.severity"
        :closable="false"
        class="results-banner"
      >
        {{ banner.text }}
      </Message>

      <section class="panel attempt-meta results-sample">
        <p class="overline">Muestra</p>
        <dl>
          <div v-for="item in sampleItems" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>

      <ConditionMetricsPanel :results="results" />

      <PerSentenceTable :results="results" />

      <section class="panel attempt-meta results-provenance">
        <p class="overline">Procedencia</p>
        <dl>
          <div v-for="item in provenanceItems" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
          <div class="results-provenance__hash">
            <dt>SHA-256 del conjunto</dt>
            <dd>
              <code class="results-hash">{{ results.datasetSha256 || '—' }}</code>
            </dd>
          </div>
        </dl>
      </section>
    </template>

    <section v-else class="panel research-empty-state">
      <span class="research-empty-state__icon">
        <i class="pi pi-chart-line" aria-hidden="true"></i>
      </span>
      <h2>No pudimos mostrar los resultados.</h2>
      <p>{{ testsStore.errorMessage || EMPTY_MESSAGE }}</p>
      <div class="row-actions">
        <Button label="Volver a la prueba" severity="secondary" text @click="goBack" />
        <Button label="Reintentar" icon="pi pi-refresh" @click="loadPage" />
      </div>
    </section>
  </div>
</template>
