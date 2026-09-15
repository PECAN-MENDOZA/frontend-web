<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import {
  formatCount,
  formatMetric,
  shortHash,
  technicalEvaluationErrors,
  technicalEvaluationPayload,
} from '@/features/research/utils/results'
import { formatDateTime } from '@/features/research/utils/study'

const REPORT_MAX_BYTES = 1024 * 1024
const RATE = { digits: 4 }

const props = defineProps({
  evaluations: {
    type: Array,
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
  isRecording: {
    type: Boolean,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  recordError: {
    type: String,
    default: '',
  },
  // Cambia con cada registro exitoso: limpia el archivo elegido.
  recordedCount: {
    type: Number,
    required: true,
  },
})

// `change` avisa a la vista de que el archivo elegido cambió o se quitó (limpia su error).
const emit = defineEmits(['record', 'retry', 'change'])

const fileInput = ref(null)
const fileName = ref('')
const report = ref(null)
const readErrors = ref([])
const isReading = ref(false)
// Cada selección o limpieza invalida las lecturas pendientes: una lectura antigua nunca
// publica su informe sobre un archivo más nuevo (o sobre ninguno).
let readToken = 0

const validationErrors = computed(() =>
  report.value ? technicalEvaluationErrors(report.value) : [],
)
const errors = computed(() => [...readErrors.value, ...validationErrors.value])
const isValid = computed(() => Boolean(report.value) && errors.value.length === 0)
const preview = computed(() => (isValid.value ? technicalEvaluationPayload(report.value) : null))

watch(
  () => props.recordedCount,
  () => clearFile(),
)

async function onFileChange(event) {
  const file = event.target.files?.[0] ?? null
  const token = ++readToken

  report.value = null
  readErrors.value = []
  isReading.value = false
  fileName.value = file?.name ?? ''
  emit('change')

  if (!file) return

  if (file.size > REPORT_MAX_BYTES) {
    readErrors.value = ['El informe supera 1 MB; elige el JSON generado por evaluate.py.']
    return
  }

  isReading.value = true

  try {
    const text = await file.text()

    if (token !== readToken) return

    report.value = JSON.parse(text)
  } catch {
    if (token === readToken) readErrors.value = ['El archivo no contiene JSON válido.']
  } finally {
    if (token === readToken) isReading.value = false
  }
}

function clearFile() {
  readToken += 1
  report.value = null
  readErrors.value = []
  isReading.value = false
  fileName.value = ''

  if (fileInput.value) fileInput.value.value = ''

  emit('change')
}

function submit() {
  if (!isValid.value || props.isBusy) return

  emit('record', preview.value)
}
</script>

<template>
  <section class="panel research-evaluation" aria-labelledby="research-evaluation-title">
    <div class="panel__header">
      <div>
        <p class="overline">Independiente de los resultados intra-sujeto</p>
        <h2 id="research-evaluation-title">Evaluación técnica del modelo</h2>
      </div>
      <span class="panel__meta">Precisión, recall y F0.5 sobre el conjunto reservado</span>
    </div>

    <div class="research-evaluation__body">
      <p class="research-evaluation__intro">
        F0.5 se registra aparte y nunca se combina con PEO, PPM ni TAS. Solo se acepta el informe de
        <code>evaluate.py</code> con el scorer <code>exact_token_edits_v1</code> y el hash SHA-256
        del conjunto reservado; los archivos ya usados para orientar cambios no valen como conjunto
        final.
      </p>

      <!-- El error de carga se muestra aunque exista una lista previa: puede estar desactualizada. -->
      <div v-if="loadError" class="research-evaluation__error" role="alert">
        <p>{{ loadError }}</p>
        <Button
          label="Reintentar"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          outlined
          :loading="isLoading"
          @click="emit('retry')"
        />
      </div>

      <div
        v-if="isLoading && !evaluations.length"
        class="research-evaluation__list"
        aria-busy="true"
      >
        <Skeleton v-for="item in 2" :key="item" height="5.5rem" border-radius="0.9rem" />
      </div>
      <p v-else-if="!evaluations.length && !loadError" class="research-evaluation__empty">
        Aún no hay evaluaciones registradas. Sube el informe JSON para registrar la primera.
      </p>
      <ul v-else-if="evaluations.length" class="research-evaluation__list">
        <li
          v-for="evaluation in evaluations"
          :key="evaluation.id"
          class="research-evaluation__item"
        >
          <div class="research-evaluation__item-heading">
            <div>
              <strong>{{ evaluation.modelVersion }}</strong>
              <small>
                <span v-tooltip.bottom="evaluation.datasetSha256" class="research-mono">
                  {{ shortHash(evaluation.datasetSha256) }}
                </span>
                · {{ evaluation.scorerVersion }} · {{ formatDateTime(evaluation.createdAt) }}
              </small>
            </div>
            <Tag
              :value="`F0.5 ${formatMetric(evaluation.fZeroFive, RATE)}`"
              severity="info"
              rounded
            />
          </div>
          <dl class="research-evaluation__scores">
            <div>
              <dt>Precisión</dt>
              <dd>{{ formatMetric(evaluation.precision, RATE) }}</dd>
            </div>
            <div>
              <dt>Recall</dt>
              <dd>{{ formatMetric(evaluation.recall, RATE) }}</dd>
            </div>
            <div>
              <dt>F0.5</dt>
              <dd>{{ formatMetric(evaluation.fZeroFive, RATE) }}</dd>
            </div>
            <div>
              <dt>TP</dt>
              <dd>{{ formatCount(evaluation.truePositives) }}</dd>
            </div>
            <div>
              <dt>FP</dt>
              <dd>{{ formatCount(evaluation.falsePositives) }}</dd>
            </div>
            <div>
              <dt>FN</dt>
              <dd>{{ formatCount(evaluation.falseNegatives) }}</dd>
            </div>
          </dl>
          <details v-if="evaluation.categories?.length" class="research-evaluation__categories">
            <summary>{{ evaluation.categories.length }} categorías</summary>
            <table>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>P</th>
                  <th>R</th>
                  <th>F0.5</th>
                  <th>TP</th>
                  <th>FP</th>
                  <th>FN</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in evaluation.categories" :key="category.category">
                  <td>{{ category.category }}</td>
                  <td>{{ formatMetric(category.precision, RATE) }}</td>
                  <td>{{ formatMetric(category.recall, RATE) }}</td>
                  <td>{{ formatMetric(category.f05, RATE) }}</td>
                  <td>{{ formatCount(category.tp) }}</td>
                  <td>{{ formatCount(category.fp) }}</td>
                  <td>{{ formatCount(category.fn) }}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </li>
      </ul>

      <form class="research-form research-evaluation__form" @submit.prevent="submit">
        <p class="research-annotation__label">Registrar una evaluación</p>
        <label for="technical-evaluation-file">
          <span>Informe JSON de evaluate.py</span>
          <input
            id="technical-evaluation-file"
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            class="research-file-input"
            :disabled="isBusy"
            @change="onFileChange"
          />
          <small class="research-form__help">
            Campos: modelVersion, datasetSha256, scorerVersion, precision, recall, fZeroFive,
            truePositives, falsePositives, falseNegatives y categories (opcional).
          </small>
        </label>

        <Message v-if="errors.length" severity="error" :closable="false">
          <p class="research-evaluation__errors-title">
            {{ fileName ? `${fileName}: ` : '' }}el informe no se puede registrar.
          </p>
          <ul class="research-evaluation__errors">
            <li v-for="error in errors" :key="error">{{ error }}</li>
          </ul>
        </Message>

        <Message v-if="recordError" severity="error" :closable="false">{{ recordError }}</Message>

        <div v-if="preview" class="research-evaluation__preview">
          <p class="research-annotation__label">Vista previa</p>
          <dl class="research-evaluation__scores">
            <div>
              <dt>Modelo</dt>
              <dd>{{ preview.modelVersion }}</dd>
            </div>
            <div>
              <dt>Conjunto</dt>
              <dd>
                <span v-tooltip.bottom="preview.datasetSha256" class="research-mono">
                  {{ shortHash(preview.datasetSha256) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>Precisión</dt>
              <dd>{{ formatMetric(preview.precision, RATE) }}</dd>
            </div>
            <div>
              <dt>Recall</dt>
              <dd>{{ formatMetric(preview.recall, RATE) }}</dd>
            </div>
            <div>
              <dt>F0.5</dt>
              <dd>{{ formatMetric(preview.fZeroFive, RATE) }}</dd>
            </div>
            <div>
              <dt>TP / FP / FN</dt>
              <dd>
                {{ formatCount(preview.truePositives) }} /
                {{ formatCount(preview.falsePositives) }} /
                {{ formatCount(preview.falseNegatives) }}
              </dd>
            </div>
            <div>
              <dt>Categorías</dt>
              <dd>{{ preview.categories.length }}</dd>
            </div>
          </dl>
        </div>

        <div class="research-annotation__actions">
          <Button
            type="submit"
            label="Registrar"
            icon="pi pi-check"
            size="small"
            :disabled="!isValid || isBusy || isReading"
            :loading="isRecording"
          />
          <Button
            v-if="fileName"
            label="Quitar archivo"
            size="small"
            severity="secondary"
            text
            :disabled="isBusy"
            @click="clearFile"
          />
        </div>
      </form>
    </div>
  </section>
</template>
