<script setup>
import { computed } from 'vue'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import {
  formatCi,
  formatCount,
  formatMetric,
  formatP,
  formatPair,
  metricStatus,
} from '@/features/research/utils/results'

const METRICS = {
  PEO: {
    eyebrow: 'Métrica principal',
    title: 'PEO · Porcentaje de errores ortográficos',
    description:
      'Errores ortográficos adjudicados por cada 100 palabras del texto final. Menos es mejor.',
    key: 'peo',
    layout: 'paired',
    format: { digits: 2, unit: '%' },
    warning:
      'PEO se calcula solo con una adjudicación ortográfica vigente que cubra toda la muestra.',
  },
  PPM: {
    eyebrow: 'Complementaria · no inferioridad',
    title: 'PPM · Palabras por minuto',
    description: 'Velocidad de escritura sobre toda la cohorte incluida.',
    key: 'ppm',
    layout: 'paired',
    format: { digits: 1, unit: '' },
    warning:
      'Sin margen de no inferioridad configurado, PPM es descriptivo: no se evalúa ningún criterio.',
  },
  TAS: {
    eyebrow: 'Complementaria · seguridad semántica',
    title: 'TAS · Tasa de alteración semántica',
    description: 'Sugerencias evaluadas con puntaje 0 sobre las sugerencias evaluadas.',
    key: 'tas',
    layout: 'rate',
    format: { digits: 2, unit: '%' },
    warning: 'Sin límite configurado, TAS es descriptiva: no se evalúa ningún criterio.',
  },
  TAS_ACCEPTED: {
    eyebrow: 'Complementaria · seguridad semántica',
    title: 'TAS aceptada',
    description:
      'Solo las sugerencias que el participante aceptó (aceptación congelada en el lote).',
    key: 'tasAccepted',
    layout: 'rate',
    format: { digits: 2, unit: '%' },
    warning: 'Sin límite configurado, TAS aceptada es descriptiva: no se evalúa ningún criterio.',
  },
}

const PENDING_WARNING =
  'Las métricas que dependen de anotación humana se calculan solo con una adjudicación vigente que cubra toda la muestra.'

const props = defineProps({
  kind: {
    type: String,
    required: true,
  },
  results: {
    type: Object,
    default: null,
  },
  focal: {
    type: Boolean,
    default: false,
  },
})

const metric = computed(() => METRICS[props.kind])
const block = computed(() => props.results?.[metric.value.key] ?? null)
const paired = computed(() => block.value?.paired ?? null)
const status = computed(() => metricStatus(props.kind, props.results))
// Las decisiones salen de `state`, nunca del texto de la etiqueta.
const isPending = computed(() => ['pending', 'none'].includes(status.value.state))
const isDescriptive = computed(() => Boolean(block.value?.descriptive))
const warning = computed(() => {
  if (status.value.state === 'pending') return PENDING_WARNING
  if (isDescriptive.value) return metric.value.warning

  return ''
})

function value(number, overrides = {}) {
  return formatMetric(number, { ...metric.value.format, ...overrides })
}

function pair(mean, sd) {
  return formatPair(mean, sd, metric.value.format)
}

function ci(lower, upper) {
  return formatCi(lower, upper, metric.value.format)
}
</script>

<template>
  <section
    class="research-metric"
    :class="{
      'research-metric--focal': focal,
      'research-metric--wide': metric.layout === 'paired',
      'research-metric--pending': isPending,
    }"
    :aria-label="metric.title"
  >
    <header class="research-metric__heading">
      <div>
        <p class="overline">{{ metric.eyebrow }}</p>
        <h2>{{ metric.title }}</h2>
        <p class="research-metric__description">{{ metric.description }}</p>
      </div>
      <div class="research-metric__status">
        <Tag :value="status.label" :severity="status.severity" rounded />
        <small v-if="status.message">{{ status.message }}</small>
      </div>
    </header>

    <Message v-if="warning" severity="warn" :closable="false">{{ warning }}</Message>

    <template v-if="metric.layout === 'paired'">
      <div class="research-metric__pair">
        <div class="research-metric__condition">
          <span>Con asistencia</span>
          <strong>{{ pair(paired?.assistedMean, paired?.assistedSd) }}</strong>
          <small>media ± de</small>
        </div>
        <div class="research-metric__condition">
          <span>Sin asistencia</span>
          <strong>{{ pair(paired?.unassistedMean, paired?.unassistedSd) }}</strong>
          <small>media ± de</small>
        </div>
        <div class="research-metric__delta">
          <span>Δ asistida − sin asistencia</span>
          <strong>{{ value(paired?.meanDelta) }}</strong>
          <small>IC 95 % {{ ci(paired?.ci95Lower, paired?.ci95Upper) }}</small>
        </div>
      </div>

      <dl class="research-metric__facts">
        <div>
          <dt>Participantes analizados</dt>
          <dd>{{ formatCount(block?.participantsAnalyzed ?? paired?.n) }}</dd>
        </div>
        <div v-if="kind === 'PEO'">
          <dt>Sin palabras contables</dt>
          <dd>{{ formatCount(block?.participantsWithoutCountableWords) }}</dd>
        </div>
        <div>
          <dt>Sesiones analizadas</dt>
          <dd>{{ formatCount(block?.runsAnalyzed) }}</dd>
        </div>
        <div v-if="paired?.cohenDz != null">
          <dt>Tamaño del efecto (d<sub>z</sub>)</dt>
          <dd>{{ formatMetric(paired.cohenDz, { digits: 2 }) }}</dd>
        </div>
        <div v-if="paired?.pValue != null">
          <dt>Valor p (bilateral)</dt>
          <dd>{{ formatP(paired.pValue) }}</dd>
        </div>
        <div v-if="kind === 'PEO' && block?.relativeReductionMean != null">
          <dt>Reducción relativa media</dt>
          <dd>
            {{ formatMetric(block.relativeReductionMean, { digits: 1, unit: '%' }) }}
            <small>
              n = {{ formatCount(block.relativeReductionN) }} · omitidos
              {{ formatCount(block.relativeReductionSkipped) }}
            </small>
          </dd>
        </div>
        <div v-if="kind === 'PPM' && !isDescriptive">
          <dt>Margen de no inferioridad</dt>
          <dd>−{{ formatMetric(block?.nonInferiorityMargin, { digits: 1 }) }}</dd>
        </div>
      </dl>
    </template>

    <template v-else>
      <div class="research-metric__pair research-metric__pair--rate">
        <div class="research-metric__condition">
          <span>Perjudiciales / evaluadas</span>
          <strong>
            {{ formatCount(block?.harmfulSuggestions) }} /
            {{ formatCount(block?.suggestionsEvaluated) }}
          </strong>
          <small>sugerencias</small>
        </div>
        <div class="research-metric__delta">
          <span>Tasa agregada</span>
          <strong>{{ value(block?.pooledRate) }}</strong>
          <small>IC Wilson 95 % {{ ci(block?.pooledCi95Lower, block?.pooledCi95Upper) }}</small>
        </div>
        <div class="research-metric__condition">
          <span>Por participante</span>
          <strong>{{ pair(block?.participantMean, block?.participantSd) }}</strong>
          <small>media ± de · descriptivo</small>
        </div>
      </div>

      <dl class="research-metric__facts">
        <div>
          <dt>Participantes evaluados</dt>
          <dd>{{ formatCount(block?.participantsEvaluated) }}</dd>
        </div>
        <div>
          <dt>Sin denominador</dt>
          <dd>{{ formatCount(block?.participantsWithoutDenominator) }}</dd>
        </div>
        <div>
          <dt>Sesiones analizadas</dt>
          <dd>{{ formatCount(block?.runsAnalyzed) }}</dd>
        </div>
        <div v-if="!isDescriptive && block">
          <dt>Límite</dt>
          <dd>{{ formatMetric(block.limit, { digits: 1, unit: '%' }) }}</dd>
        </div>
      </dl>

      <p class="research-metric__note">
        El IC de Wilson trata las sugerencias como independientes; con pocos participantes subestima
        la incertidumbre.
      </p>
    </template>
  </section>
</template>
