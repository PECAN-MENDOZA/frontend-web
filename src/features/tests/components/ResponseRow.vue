<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import { ANNOTATION_HINT } from '@/features/tests/utils/attempts'

const props = defineProps({
  row: { type: Object, required: true },
  canAnnotate: { type: Boolean, required: true },
  isSaving: { type: Boolean, required: true },
})

const emit = defineEmits(['annotate'])
const errorCount = ref(props.row.annotatedErrorCount)

watch(
  () => props.row.annotatedErrorCount,
  (annotated) => {
    errorCount.value = annotated
  },
)

const hasEdits = computed(() => props.row.editLabels.length > 0)
const isUnchanged = computed(() => errorCount.value === props.row.annotatedErrorCount)
const canSave = computed(
  () => props.canAnnotate && errorCount.value != null && !isUnchanged.value && !props.isSaving,
)
const saveHint = computed(() => (props.canAnnotate ? '' : ANNOTATION_HINT))
const sourceSeverity = computed(
  () =>
    ({ AUTO: 'info', ANNOTATED: 'success', PENDING: 'warn' })[props.row.errorSource] ?? 'secondary',
)

function saveAnnotation() {
  if (canSave.value) emit('annotate', props.row.responseId, errorCount.value)
}
</script>

<template>
  <tr class="response-row" :class="{ 'response-row--skipped': row.skipped }">
    <td class="response-row__position">{{ row.position }}</td>
    <td class="response-row__sentence">
      <div class="response-row__labels">
        <span class="sentence-editor__label">{{ row.kindLabel }}</span>
        <span class="response-row__dot" aria-hidden="true">·</span>
        <span class="sentence-editor__label">{{ row.assistanceLabel }}</span>
      </div>
      <p class="response-row__reference">
        <span class="response-row__caption">{{ row.isDictated ? 'Referencia' : 'Consigna' }}</span>
        {{ row.referenceText || 'Texto no disponible' }}
      </p>
      <p class="response-row__final" :class="{ 'response-row__final--blank': row.skipped }">
        <span class="response-row__caption">Texto final</span>
        {{ row.finalText }}
      </p>
    </td>
    <td class="response-row__duration">
      <strong>{{ row.durationLabel }}</strong>
      <small>(desde Comenzar: {{ row.durationFromStartLabel }})</small>
    </td>
    <td class="response-row__errors">
      <template v-if="row.isDictated">
        <div class="response-row__count">
          <strong>{{ row.errorCount ?? '—' }}</strong>
          <Tag :value="row.sourceLabel" :severity="sourceSeverity" rounded />
        </div>
        <details v-if="hasEdits" class="response-row__edits">
          <summary>Ver ediciones ({{ row.editLabels.length }})</summary>
          <ul>
            <li v-for="(label, index) in row.editLabels" :key="index">{{ label }}</li>
          </ul>
        </details>
      </template>
      <template v-else>
        <div class="response-row__annotation">
          <InputNumber
            v-model="errorCount"
            :min="0"
            :max="999"
            :use-grouping="false"
            :disabled="!canAnnotate || isSaving"
            :aria-label="`Errores de la oración ${row.position}`"
            :input-id="`annotation-${row.responseId}`"
            class="response-row__input"
            @keydown.enter.prevent="saveAnnotation"
          />
          <span v-tooltip.bottom="saveHint || undefined" class="response-row__save">
            <Button
              label="Guardar"
              icon="pi pi-check"
              size="small"
              severity="secondary"
              outlined
              :disabled="!canSave"
              :loading="isSaving"
              :aria-label="`Guardar errores de la oración ${row.position}`"
              @click="saveAnnotation"
            />
          </span>
        </div>
        <Tag :value="row.sourceLabel" :severity="sourceSeverity" rounded />
      </template>
    </td>
    <td class="response-row__suggestions">
      <dl>
        <div>
          <dt>Ofrecidas</dt>
          <dd>{{ row.suggestions.offered }}</dd>
        </div>
        <div>
          <dt>Aceptadas</dt>
          <dd>{{ row.suggestions.accepted }}</dd>
        </div>
        <div>
          <dt>Rechazadas</dt>
          <dd>{{ row.suggestions.rejected }}</dd>
        </div>
        <div>
          <dt>Deshechas</dt>
          <dd>{{ row.suggestions.undone }}</dd>
        </div>
      </dl>
    </td>
  </tr>
</template>
