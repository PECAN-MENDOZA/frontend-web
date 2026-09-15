<script setup>
import { computed } from 'vue'
import Skeleton from 'primevue/skeleton'
import AnnotationColumn from '@/features/research/components/AnnotationColumn.vue'
import { annotationBatch } from '@/features/research/utils/results'

const COLUMNS = [
  { kind: 'ORTHOGRAPHY', annotationKey: 'orthographyAnnotation' },
  { kind: 'SEMANTIC', annotationKey: 'semanticAnnotation' },
]

const props = defineProps({
  studyId: {
    type: String,
    default: null,
  },
  results: {
    type: Object,
    default: null,
  },
  batches: {
    type: Array,
    required: true,
  },
  // { ORTHOGRAPHY: resumen|null, SEMANTIC: resumen|null }
  importSummaries: {
    type: Object,
    required: true,
  },
  // { ORTHOGRAPHY: '', SEMANTIC: '' }
  errorMessages: {
    type: Object,
    required: true,
  },
  isLoading: {
    type: Boolean,
    required: true,
  },
  isBusy: {
    type: Boolean,
    required: true,
  },
  pendingAction: {
    type: Object,
    default: null,
  },
})

defineEmits(['create', 'download', 'import'])

// El lote de trabajo es el que citan los resultados; sin resultados, el más reciente del tipo.
const columns = computed(() =>
  COLUMNS.map((column) => {
    const annotation = props.results?.[column.annotationKey] ?? null

    return {
      ...column,
      annotation,
      batch: annotationBatch(props.batches, column.kind, annotation?.batchId ?? null),
    }
  }),
)
</script>

<template>
  <section class="panel research-annotation" aria-label="Anotación ciega">
    <div class="panel__header">
      <div>
        <p class="overline">Evaluadores externos</p>
        <h2>Anotación ciega</h2>
      </div>
      <span class="panel__meta">Ortografía y semántica se anotan por separado</span>
    </div>

    <div v-if="isLoading && !results" class="research-annotation__grid" aria-busy="true">
      <Skeleton v-for="item in 2" :key="item" height="26rem" border-radius="1rem" />
    </div>
    <div v-else class="research-annotation__grid">
      <!-- Una columna por estudio: al cambiar de estudio se monta limpia (formulario incluido). -->
      <AnnotationColumn
        v-for="column in columns"
        :key="`${column.kind}-${studyId ?? ''}`"
        :kind="column.kind"
        :study-id="studyId"
        :annotation="column.annotation"
        :batch="column.batch"
        :import-summary="importSummaries[column.kind] ?? null"
        :error-message="errorMessages[column.kind] ?? ''"
        :is-busy="isBusy"
        :pending-action="pendingAction"
        @create="$emit('create', $event)"
        @download="$emit('download', $event)"
        @import="(batch, form) => $emit('import', batch, form)"
      />
    </div>
  </section>
</template>
