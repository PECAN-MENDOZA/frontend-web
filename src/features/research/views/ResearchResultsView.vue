<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import PageHeader from '@/shared/components/PageHeader.vue'
import AbbreviatedValue from '@/features/research/components/AbbreviatedValue.vue'
import AnnotationWorkflow from '@/features/research/components/AnnotationWorkflow.vue'
import PairedMetricPanel from '@/features/research/components/PairedMetricPanel.vue'
import ParticipantResultsTable from '@/features/research/components/ParticipantResultsTable.vue'
import StudySelector from '@/features/research/components/StudySelector.vue'
import TechnicalEvaluationPanel from '@/features/research/components/TechnicalEvaluationPanel.vue'
import { useResearchStore } from '@/features/research/store/research.store'
import { saveBlob } from '@/features/research/utils/download'
import { StudyChangedError, refreshOutcomeMessage } from '@/features/research/utils/mutations'
import {
  annotationKindLabel,
  formatCount,
  formatMetric,
  shortHash,
  shortId,
  slotLabel,
} from '@/features/research/utils/results'
import { formatDateTime } from '@/features/research/utils/study'

const TOAST_LIFE_MS = 4000
const EVALUATIONS_REFRESH_COPY = {
  updated: 'La lista de evaluaciones se actualizó.',
  failed: 'No se pudo actualizar la lista de evaluaciones',
}

const researchStore = useResearchStore()
const confirm = useConfirm()
const toast = useToast()

// Qué acción (y de qué columna) está en curso: solo ese botón muestra el spinner.
const pendingAction = ref(null)
const importSummaries = reactive({ ORTHOGRAPHY: null, SEMANTIC: null })
const annotationErrors = reactive({ ORTHOGRAPHY: '', SEMANTIC: '' })
const isDownloadingAnalysis = ref(false)
const recordError = ref('')
const recordedCount = ref(0)
// El POST se aplicó pero algún GET de la recarga falló: aviso con reintento, sin negar el POST.
const refreshWarning = ref(null)
const isRetryingRefresh = ref(false)

const study = computed(() => researchStore.selectedStudy)
const results = computed(() => researchStore.results)
const sample = computed(() => results.value?.sample ?? null)
const provenance = computed(() => results.value?.provenance ?? null)
const hasSample = computed(() => (sample.value?.participantsIncluded ?? 0) > 0)
const isRecording = computed(() => pendingAction.value?.action === 'record')
const versionsLine = computed(() => {
  if (!provenance.value) return []

  return [
    ['Protocolo', provenance.value.protocolVersions?.map((version) => `v${version}`)],
    ['Modelo', provenance.value.modelVersions],
    ['Servicio', provenance.value.backendVersions],
    ['Teclado', provenance.value.appVersions],
  ].map(([label, values]) => ({ label, value: values?.length ? values.join(', ') : '—' }))
})

// La lista se pide si falta o si la cargó otra cuenta en esta pestaña.
onMounted(() => {
  researchStore.ensureStudies()
  researchStore.loadTechnicalEvaluations()
})

// Los resultados se piden por estudio seleccionado; al cambiar, el store descarta los anteriores.
watch(
  () => researchStore.selectedStudyId,
  (studyId) => {
    importSummaries.ORTHOGRAPHY = null
    importSummaries.SEMANTIC = null
    annotationErrors.ORTHOGRAPHY = ''
    annotationErrors.SEMANTIC = ''
    refreshWarning.value = null

    if (studyId) {
      researchStore.loadResults(studyId)
    }
  },
  { immediate: true },
)

function createBatch(kind) {
  confirm.require({
    header: `Crear lote de ${annotationKindLabel(kind).toLowerCase()}`,
    message:
      'Congela las ejecuciones completadas de este momento. Si después se completan más sesiones, harán falta otro lote y otra adjudicación.',
    icon: 'pi pi-lock',
    acceptLabel: 'Crear lote',
    rejectLabel: 'Cancelar',
    rejectProps: { severity: 'secondary', text: true },
    accept: () =>
      runPending({ kind, action: 'create' }, async () => {
        annotationErrors[kind] = ''
        importSummaries[kind] = null

        try {
          const { batch, refresh } = await researchStore.createBatch(kind)

          announceMutation(
            'Lote creado',
            `${formatCount(batch.rowCount)} filas listas para descargar y repartir a los evaluadores.`,
            refresh,
          )
        } catch (error) {
          handleAnnotationError(kind, error, 'No pudimos crear el lote')
        }
      }),
  })
}

function downloadExport(batch) {
  return runPending({ kind: batch.kind, action: 'download' }, async () => {
    annotationErrors[batch.kind] = ''

    try {
      const download = await researchStore.downloadExport(batch.id)

      saveBlob(download, `annotations-${batch.kind}-${shortId(batch.id)}.csv`)
    } catch (error) {
      annotationErrors[batch.kind] = error.message
    }
  })
}

function importAnnotation(batch, form) {
  return runPending({ kind: batch.kind, action: 'import' }, async () => {
    annotationErrors[batch.kind] = ''
    importSummaries[batch.kind] = null

    try {
      const { summary, refresh } = await researchStore.importAnnotationFile(batch.id, form)

      importSummaries[batch.kind] = summary
      announceMutation(
        'Importación registrada',
        `${slotLabel(form.slot)} · ${form.rater}.`,
        refresh,
      )
    } catch (error) {
      handleAnnotationError(batch.kind, error, 'No pudimos importar el archivo')
    }
  })
}

async function downloadAnalysis() {
  isDownloadingAnalysis.value = true

  try {
    const download = await researchStore.downloadAnalysis()

    saveBlob(download, `analysis-${study.value?.code ?? 'estudio'}.csv`)
  } catch (error) {
    notify('error', 'No pudimos descargar analysis.csv', error.message)
  } finally {
    isDownloadingAnalysis.value = false
  }
}

function recordEvaluation(payload) {
  return runPending({ action: 'record' }, async () => {
    recordError.value = ''

    try {
      const { evaluation, refresh } = await researchStore.recordTechnicalEvaluation(payload)

      recordedCount.value += 1
      // Si la recarga de la lista falló, el panel muestra su propio error con reintento.
      notify(
        'success',
        'Evaluación registrada',
        refreshOutcomeMessage(refresh, {
          detail: `${evaluation.modelVersion} · F0.5 ${formatMetric(evaluation.fZeroFive, { digits: 4 })}.`,
          ...EVALUATIONS_REFRESH_COPY,
        }).detail,
      )
    } catch (error) {
      // El backend re-valida y su mensaje se muestra tal cual (traducido si es conocido).
      recordError.value = error.message
    }
  })
}

// El POST ya se aplicó: se anuncia siempre; la actualización de la vista solo si todos los GET
// de la recarga respondieron. Si no, queda un aviso con reintento.
function announceMutation(summary, detail, refresh) {
  const outcome = refreshOutcomeMessage(refresh, { detail })

  notify('success', summary, outcome.detail)
  refreshWarning.value = outcome.warning || null
}

// "Reintentar" repite exactamente la recarga que originó el aviso (resumen + resultados); la
// lista de estudios no participa. El aviso se limpia en cuanto los resultados respondieron.
async function retryRefresh() {
  isRetryingRefresh.value = true

  try {
    const { results } = await researchStore.refreshStudyResults()

    clearRefreshWarning(results)
  } finally {
    isRetryingRefresh.value = false
  }
}

// "Actualizar" de la cabecera: si los resultados se recargaron, el aviso ya no es cierto.
async function refreshAll() {
  const { results } = await researchStore.refreshAll()

  clearRefreshWarning(results)
}

function clearRefreshWarning(results) {
  if (results?.ok) refreshWarning.value = null
}

// Cambiar de estudio durante una operación no es un fallo: el backend ya la aplicó.
function handleAnnotationError(kind, error, summary) {
  if (error instanceof StudyChangedError) {
    notify('info', 'Estudio cambiado', error.message)
    return
  }

  annotationErrors[kind] = error.message || summary
}

async function runPending(action, operation) {
  pendingAction.value = action

  try {
    await operation()
  } finally {
    pendingAction.value = null
  }
}

function notify(severity, summary, detail) {
  toast.add({ severity, summary, detail, life: TOAST_LIFE_MS })
}
</script>

<template>
  <div class="research-page">
    <PageHeader
      eyebrow="Panel de investigación"
      title="Resultados"
      description="Anotación ciega, comparación por participante entre condiciones y evaluación técnica del modelo."
    >
      <template #actions>
        <StudySelector
          v-if="researchStore.studies.length"
          :studies="researchStore.studies"
          :model-value="researchStore.selectedStudyId"
          :disabled="researchStore.isMutating"
          @update:model-value="researchStore.selectStudy"
        />
        <Button
          label="Descargar analysis.csv"
          icon="pi pi-file-export"
          severity="secondary"
          outlined
          :loading="isDownloadingAnalysis"
          :disabled="!study || researchStore.isMutating"
          @click="downloadAnalysis"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="researchStore.isLoading || researchStore.isLoadingResults"
          :disabled="!researchStore.selectedStudyId || researchStore.isMutating"
          @click="refreshAll"
        />
      </template>
    </PageHeader>

    <Message v-if="refreshWarning" severity="warn" :closable="false">
      <div class="research-refresh-warning">
        <span>{{ refreshWarning }}</span>
        <Button
          label="Reintentar"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          outlined
          :loading="isRetryingRefresh"
          :disabled="researchStore.isMutating"
          @click="retryRefresh"
        />
      </div>
    </Message>

    <template v-if="researchStore.isLoading && !researchStore.studies.length">
      <Skeleton height="24rem" border-radius="1.25rem" />
      <Skeleton height="16rem" border-radius="1.25rem" />
    </template>

    <div
      v-else-if="researchStore.error && !researchStore.studies.length"
      class="panel research-empty-state"
    >
      <i class="pi pi-exclamation-triangle research-empty-state__icon" aria-hidden="true"></i>
      <h2>No pudimos cargar tus estudios</h2>
      <p>{{ researchStore.error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" @click="researchStore.loadStudies" />
    </div>

    <div v-else-if="!researchStore.studies.length" class="panel research-empty-state">
      <i class="pi pi-chart-line research-empty-state__icon" aria-hidden="true"></i>
      <h2>Aún no hay un estudio</h2>
      <p>
        Crea un estudio desde <strong>Estudio</strong> y completa sesiones para ver sus resultados.
      </p>
      <RouterLink
        :to="{ name: 'research-study' }"
        class="p-button p-component research-link-button"
      >
        <i class="pi pi-book p-button-icon p-button-icon-left" aria-hidden="true"></i>
        <span class="p-button-label">Ir a Estudio</span>
      </RouterLink>
    </div>

    <div v-else-if="!study" class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon" aria-hidden="true"></i>
      <h2>Elige un estudio</h2>
      <p>Selecciona un estudio arriba para revisar su anotación y sus resultados.</p>
    </div>

    <div v-else-if="researchStore.resultsError && !results" class="panel research-empty-state">
      <i class="pi pi-exclamation-triangle research-empty-state__icon" aria-hidden="true"></i>
      <h2>No pudimos cargar los resultados</h2>
      <p>{{ researchStore.resultsError }}</p>
      <Button
        label="Reintentar"
        icon="pi pi-refresh"
        :loading="researchStore.isLoadingResults"
        @click="researchStore.loadResults()"
      />
    </div>

    <template v-else-if="researchStore.isLoadingResults && !results">
      <Skeleton height="24rem" border-radius="1.25rem" />
      <Skeleton height="16rem" border-radius="1.25rem" />
    </template>

    <template v-else>
      <Message v-if="researchStore.error" severity="error">{{ researchStore.error }}</Message>
      <Message v-if="researchStore.resultsError" severity="error">
        {{ researchStore.resultsError }}
      </Message>

      <AnnotationWorkflow
        :study-id="researchStore.selectedStudyId"
        :results="results"
        :batches="researchStore.batches"
        :import-summaries="importSummaries"
        :error-messages="annotationErrors"
        :is-loading="researchStore.isLoadingResults"
        :is-busy="researchStore.isMutating"
        :pending-action="pendingAction"
        @create="createBatch"
        @download="downloadExport"
        @import="importAnnotation"
      />

      <div v-if="!hasSample" class="panel research-empty-state">
        <i class="pi pi-users research-empty-state__icon" aria-hidden="true"></i>
        <h2>Todavía no hay una muestra</h2>
        <p>
          Ningún participante tiene un par completo: al menos una sesión completada y no excluida en
          cada condición. Las métricas aparecerán cuando el primer par esté listo.
        </p>
        <p v-if="sample" class="research-sample__hint">
          {{ formatCount(sample.participantsTotal) }} participantes ·
          {{ formatCount(sample.participantsWithIncompletePair) }} con par incompleto ·
          {{ formatCount(sample.participantsWithoutEligibleRun) }} sin sesión elegible
        </p>
      </div>

      <template v-else>
        <div class="research-metrics">
          <PairedMetricPanel kind="PEO" :results="results" focal />
          <PairedMetricPanel kind="PPM" :results="results" />
          <PairedMetricPanel kind="TAS" :results="results" />
          <PairedMetricPanel kind="TAS_ACCEPTED" :results="results" />
        </div>

        <ParticipantResultsTable :participants="results?.participants ?? []" />

        <div v-if="sample" class="research-version-strip research-sample" aria-label="Muestra">
          <span>
            Muestra: <strong>{{ formatCount(sample.participantsIncluded) }}</strong> de
            {{ formatCount(sample.participantsTotal) }} participantes
          </span>
          <span>{{ formatCount(sample.participantsWithIncompletePair) }} con par incompleto</span>
          <span>{{ formatCount(sample.participantsWithoutEligibleRun) }} sin sesión elegible</span>
          <span>
            Sesiones: <strong>{{ formatCount(sample.runsIncluded) }}</strong> incluidas ·
            {{ formatCount(sample.runsExcluded) }} excluidas ·
            {{ formatCount(sample.runsInIncompletePairs) }} en pares incompletos ·
            {{ formatCount(sample.runsWithoutCountableWords) }} sin palabras contables
          </span>
        </div>
      </template>

      <section v-if="provenance" class="panel research-provenance" aria-label="Procedencia">
        <div class="panel__header">
          <div>
            <p class="overline">Trazabilidad</p>
            <h2>Procedencia</h2>
          </div>
          <span class="panel__meta">Calculado {{ formatDateTime(provenance.computedAt) }}</span>
        </div>
        <div class="research-provenance__body">
          <Message
            v-if="provenance.sessionsChangedAfterExport > 0"
            severity="warn"
            :closable="false"
          >
            {{ formatCount(provenance.sessionsChangedAfterExport) }}
            {{
              provenance.sessionsChangedAfterExport === 1 ? 'sesión cambió' : 'sesiones cambiaron'
            }}
            después del export; los resultados usan la aceptación congelada en el lote.
          </Message>

          <dl class="research-provenance__versions">
            <div v-for="item in versionsLine" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
            <div>
              <dt>Margen PPM</dt>
              <dd>
                {{
                  provenance.ppmNonInferiorityMargin == null
                    ? 'Sin configurar'
                    : formatMetric(provenance.ppmNonInferiorityMargin, { digits: 1 })
                }}
              </dd>
            </div>
            <div>
              <dt>Límite TAS</dt>
              <dd>
                {{
                  provenance.tasLimit == null
                    ? 'Sin configurar'
                    : formatMetric(provenance.tasLimit, { digits: 1, unit: '%' })
                }}
              </dd>
            </div>
          </dl>

          <div class="research-provenance__datasets">
            <p class="research-annotation__label">Lotes usados en el cálculo</p>
            <p v-if="!provenance.datasets?.length" class="research-provenance__empty">
              Ningún lote adjudicado alimenta todavía los resultados.
            </p>
            <ul v-else>
              <li v-for="dataset in provenance.datasets" :key="dataset.batchId">
                <strong>{{ annotationKindLabel(dataset.kind) }}</strong>
                <span>
                  lote
                  <AbbreviatedValue :value="dataset.batchId" :short="shortId(dataset.batchId)" />
                  · {{ formatCount(dataset.rowCount) }} filas · export
                  <AbbreviatedValue
                    :value="dataset.exportSha256"
                    :short="shortHash(dataset.exportSha256)"
                  />
                </span>
                <span>
                  adjudicación v{{ formatCount(dataset.adjudicationVersion) }} ·
                  <AbbreviatedValue
                    :value="dataset.adjudicationSha256"
                    :short="shortHash(dataset.adjudicationSha256)"
                  />
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </template>

    <!-- Independiente del estudio y de sus resultados: siempre accesible, con su propia carga. -->
    <TechnicalEvaluationPanel
      :evaluations="researchStore.technicalEvaluations"
      :is-loading="researchStore.isLoadingEvaluations"
      :is-busy="researchStore.isMutating"
      :is-recording="isRecording"
      :load-error="researchStore.evaluationsError"
      :record-error="recordError"
      :recorded-count="recordedCount"
      @record="recordEvaluation"
      @change="recordError = ''"
      @retry="researchStore.loadTechnicalEvaluations"
    />
  </div>
</template>
