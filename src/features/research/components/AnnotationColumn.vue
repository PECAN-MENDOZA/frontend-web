<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import AbbreviatedValue from '@/features/research/components/AbbreviatedValue.vue'
import { copyText } from '@/features/research/utils/clipboard'
import {
  ANNOTATION_SLOT_OPTIONS,
  RATER_MAX_LENGTH,
  annotationKindLabel,
  annotationNextStep,
  annotationStatusLabel,
  currentImports,
  firstInvalidField,
  formatCount,
  formatMetric,
  importFormErrors,
  shortHash,
  shortId,
  slotLabel,
} from '@/features/research/utils/results'
import { translateBackendMessage } from '@/features/research/utils/errors'
import { formatDateTime } from '@/features/research/utils/study'

const COPIED_FEEDBACK_MS = 1800

const KIND_COPY = {
  ORTHOGRAPHY: {
    description: 'Una fila por sesión completada; el evaluador cuenta las palabras con error.',
    idPrefix: 'orthography-import',
  },
  SEMANTIC: {
    description: 'Una fila por sugerencia evaluada; el evaluador puntúa 0, 1 o 2.',
    idPrefix: 'semantic-import',
  },
}

const props = defineProps({
  kind: {
    type: String,
    required: true,
  },
  studyId: {
    type: String,
    default: null,
  },
  // Bloque orthographyAnnotation / semanticAnnotation de los resultados (o null).
  annotation: {
    type: Object,
    default: null,
  },
  batch: {
    type: Object,
    default: null,
  },
  // Resumen devuelto por la última importación de esta columna (o null).
  importSummary: {
    type: Object,
    default: null,
  },
  isBusy: {
    type: Boolean,
    required: true,
  },
  pendingAction: {
    type: Object,
    default: null,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['create', 'download', 'import'])

const form = ref({ slot: null, rater: '', file: null })
const isSubmitted = ref(false)
const isCopied = ref(false)
const fileInput = ref(null)
let copiedTimer = null

const copy = computed(() => KIND_COPY[props.kind] ?? KIND_COPY.ORTHOGRAPHY)
// Identificadores estables por columna para etiquetas, ayudas y errores (aria-*).
const ids = computed(() => {
  const prefix = copy.value.idPrefix

  return {
    slot: `${prefix}-slot`,
    slotLabel: `${prefix}-slot-label`,
    slotError: `${prefix}-slot-error`,
    rater: `${prefix}-rater`,
    raterError: `${prefix}-rater-error`,
    file: `${prefix}-file`,
    fileHelp: `${prefix}-file-help`,
    fileError: `${prefix}-file-error`,
    createHint: `${prefix}-create-hint`,
  }
})
const title = computed(() => annotationKindLabel(props.kind))
const status = computed(() => annotationStatusLabel(props.annotation?.status))
const nextStep = computed(() => annotationNextStep(props.annotation?.status))
const backendMessage = computed(() => translateBackendMessage(props.annotation?.message))
const slots = computed(() => currentImports(props.batch))
const agreement = computed(() => props.batch?.agreement ?? null)
const errors = computed(() => (isSubmitted.value ? importFormErrors(form.value) : {}))
const isFormValid = computed(() => Object.keys(importFormErrors(form.value)).length === 0)
// El backend permite otro lote en cualquier momento; con uno sin adjudicar solo se advierte.
const createHint = computed(() =>
  props.annotation?.status === 'NOT_ADJUDICATED'
    ? 'El lote vigente aún no está adjudicado: importa sus archivos antes de crear otro.'
    : '',
)

// Cada importación deja el formulario listo para la siguiente ranura.
watch(
  () => props.importSummary,
  (summary) => {
    if (summary) resetForm()
  },
)

// El formulario pertenece a un lote de un estudio: si cambia cualquiera de los dos (otro
// estudio, lote nuevo o lote desaparecido), lo elegido ya no corresponde y se descarta.
watch(
  () => [props.studyId, props.batch?.id ?? null],
  () => resetForm(),
)

onUnmounted(() => window.clearTimeout(copiedTimer))

function isPending(action) {
  return props.pendingAction?.kind === props.kind && props.pendingAction?.action === action
}

function onFileChange(event) {
  form.value.file = event.target.files?.[0] ?? null
}

async function submitImport() {
  isSubmitted.value = true

  if (!isFormValid.value) {
    // Los errores se pintan tras el tick; luego el foco va al primer control inválido.
    await nextTick()
    focusField(firstInvalidField(importFormErrors(form.value)))
    return
  }

  if (!props.batch || props.isBusy) return

  emit('import', props.batch, { ...form.value, rater: form.value.rater.trim() })
}

function focusField(field) {
  if (!field) return

  document.getElementById(ids.value[field])?.focus()
}

function resetForm() {
  form.value = { slot: null, rater: '', file: null }
  isSubmitted.value = false
  isCopied.value = false
  window.clearTimeout(copiedTimer)

  if (fileInput.value) fileInput.value.value = ''
}

async function copyHash() {
  const hash = props.batch?.exportSha256

  if (!hash || !(await copyText(hash))) return

  isCopied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => {
    isCopied.value = false
  }, COPIED_FEEDBACK_MS)
}
</script>

<template>
  <section class="research-annotation__column" :aria-label="`Anotación ${title.toLowerCase()}`">
    <header class="research-annotation__heading">
      <div>
        <p class="overline">Anotación ciega</p>
        <h3>{{ title }}</h3>
        <p class="research-annotation__description">{{ copy.description }}</p>
      </div>
      <Tag :value="status.label" :severity="status.severity" rounded />
    </header>

    <div class="research-annotation__step">
      <i class="pi pi-directions" aria-hidden="true"></i>
      <div>
        <strong>{{ nextStep || 'Estado sin acción definida.' }}</strong>
        <small v-if="backendMessage">{{ backendMessage }}</small>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <div class="research-annotation__batch">
      <p class="research-annotation__label">Lote más reciente</p>
      <template v-if="batch">
        <dl class="research-annotation__meta">
          <div>
            <dt>Lote</dt>
            <dd>
              <AbbreviatedValue :value="batch.id" :short="shortId(batch.id)" />
            </dd>
          </div>
          <div>
            <dt>Filas</dt>
            <dd>{{ formatCount(batch.rowCount) }}</dd>
          </div>
          <div>
            <dt>Hash del export</dt>
            <dd class="research-annotation__hash">
              <AbbreviatedValue
                :value="batch.exportSha256"
                :short="shortHash(batch.exportSha256)"
              />
              <Button
                :icon="isCopied ? 'pi pi-check' : 'pi pi-copy'"
                text
                rounded
                size="small"
                severity="secondary"
                :aria-label="isCopied ? 'Hash copiado' : 'Copiar hash del export'"
                @click="copyHash"
              />
              <span class="research-live-region" aria-live="polite">
                {{ isCopied ? 'Hash copiado al portapapeles' : '' }}
              </span>
            </dd>
          </div>
          <div>
            <dt>Creado</dt>
            <dd>{{ formatDateTime(batch.createdAt) }}</dd>
          </div>
        </dl>

        <div class="research-annotation__tags">
          <Tag
            v-for="slot in slots"
            :key="slot.slot"
            :value="slot.label"
            :severity="slot.current ? 'success' : 'secondary'"
            :icon="slot.current ? 'pi pi-check' : 'pi pi-minus'"
            rounded
          />
          <Tag
            :value="batch.adjudicationCurrent ? 'Adjudicación vigente' : 'Sin adjudicación vigente'"
            :severity="batch.adjudicationCurrent ? 'success' : 'warn'"
            rounded
          />
        </div>

        <p v-if="agreement?.complete" class="research-annotation__agreement">
          Acuerdo entre evaluadores: κ ponderada
          <strong>{{ formatMetric(agreement.weightedKappa, { digits: 3 }) }}</strong> · coincidencia
          exacta
          <strong>{{ formatMetric(agreement.exactAgreement, { digits: 3 }) }}</strong>
        </p>
        <p v-else class="research-annotation__agreement research-annotation__agreement--muted">
          El acuerdo entre evaluadores aparece cuando ambas ranuras estén completas.
        </p>
      </template>
      <p v-else class="research-annotation__empty">Todavía no hay un lote de este tipo.</p>
    </div>

    <div class="research-annotation__actions">
      <!-- La advertencia del tooltip también se anuncia al enfocar el botón (aria-describedby). -->
      <Button
        v-tooltip.bottom="createHint || undefined"
        label="Crear lote"
        icon="pi pi-plus"
        size="small"
        :disabled="isBusy"
        :loading="isPending('create')"
        :aria-describedby="createHint ? ids.createHint : undefined"
        @click="emit('create', kind)"
      />
      <span v-if="createHint" :id="ids.createHint" class="research-sr-only">{{ createHint }}</span>
      <Button
        label="Descargar export"
        icon="pi pi-download"
        size="small"
        severity="secondary"
        outlined
        :disabled="!batch || isBusy"
        :loading="isPending('download')"
        @click="emit('download', batch)"
      />
    </div>

    <div class="research-annotation__imports">
      <p class="research-annotation__label">Importaciones vigentes</p>
      <ul>
        <li v-for="slot in slots" :key="slot.slot">
          <span>{{ slot.label }}</span>
          <template v-if="slot.current">
            <strong>{{ slot.current.rater }}</strong>
            <small
              >v{{ slot.current.version }} · {{ formatDateTime(slot.current.importedAt) }}</small
            >
          </template>
          <small v-else class="research-annotation__pending">Sin importar</small>
        </li>
      </ul>
    </div>

    <Message v-if="importSummary" severity="success" :closable="false">
      Importación registrada. Ranuras completas:
      {{
        importSummary.completedSlots?.length
          ? importSummary.completedSlots.map(slotLabel).join(', ')
          : 'ninguna'
      }}.
      <template v-if="importSummary.agreement?.complete">
        κ ponderada {{ formatMetric(importSummary.agreement.weightedKappa, { digits: 3 }) }} ·
        coincidencia exacta
        {{ formatMetric(importSummary.agreement.exactAgreement, { digits: 3 }) }}.
      </template>
      {{
        importSummary.adjudicationCurrent
          ? 'La adjudicación está vigente.'
          : 'Aún no hay una adjudicación vigente.'
      }}
    </Message>

    <form class="research-form research-annotation__form" @submit.prevent="submitImport">
      <p class="research-annotation__label">Importar puntajes</p>
      <!-- El combobox del Select no es etiquetable: recibe su nombre por aria-labelledby. -->
      <label :for="ids.slot">
        <span :id="ids.slotLabel">Ranura</span>
        <Select
          v-model="form.slot"
          :input-id="ids.slot"
          :label-id="ids.slot"
          :aria-labelledby="ids.slotLabel"
          :options="ANNOTATION_SLOT_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="Elige la ranura"
          size="small"
          fluid
          :disabled="!batch || isBusy"
          :invalid="Boolean(errors.slot)"
          :pt="{ label: { 'aria-describedby': errors.slot ? ids.slotError : undefined } }"
        />
        <small v-if="errors.slot" :id="ids.slotError" class="research-form__error">
          {{ errors.slot }}
        </small>
      </label>
      <label :for="ids.rater">
        <span>Nombre del evaluador</span>
        <InputText
          :id="ids.rater"
          v-model="form.rater"
          size="small"
          fluid
          :maxlength="RATER_MAX_LENGTH"
          placeholder="Quien completó el archivo"
          :disabled="!batch || isBusy"
          :invalid="Boolean(errors.rater)"
          :aria-describedby="errors.rater ? ids.raterError : undefined"
        />
        <small v-if="errors.rater" :id="ids.raterError" class="research-form__error">
          {{ errors.rater }}
        </small>
      </label>
      <label :for="ids.file">
        <span>Archivo CSV <small>máximo 5 MB</small></span>
        <input
          :id="ids.file"
          ref="fileInput"
          type="file"
          accept=".csv,text/csv"
          class="research-file-input"
          :disabled="!batch || isBusy"
          :aria-invalid="errors.file ? 'true' : undefined"
          :aria-describedby="errors.file ? ids.fileError : ids.fileHelp"
          @change="onFileChange"
        />
        <small v-if="errors.file" :id="ids.fileError" class="research-form__error">
          {{ errors.file }}
        </small>
        <small v-else :id="ids.fileHelp" class="research-form__help">
          Devuelve el export tal cual, con la columna de puntaje completada.
        </small>
      </label>
      <div class="research-annotation__actions">
        <Button
          type="submit"
          label="Importar"
          icon="pi pi-upload"
          size="small"
          :disabled="!batch || isBusy"
          :loading="isPending('import')"
        />
      </div>
    </form>
  </section>
</template>
