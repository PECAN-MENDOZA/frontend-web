<script setup>
import { computed } from 'vue'
import {
  conditionRows,
  formatAcceptance,
  formatDelta,
  formatInterval,
  formatPairedStats,
  hasPairedData,
} from '@/features/tests/utils/results'

const props = defineProps({
  results: { type: Object, default: null },
})

const rows = computed(() => conditionRows(props.results))
const paired = computed(() => props.results?.paired ?? null)
const showPaired = computed(() => hasPairedData(paired.value))
const pairedRows = computed(() => [
  { key: 'errors', label: 'Errores / 100 palabras', delta: paired.value?.errorsPer100Words },
  { key: 'ppm', label: 'Palabras por minuto', delta: paired.value?.wordsPerMinute },
])
</script>

<template>
  <section class="panel sentence-panel results-conditions">
    <div class="directory-panel__toolbar">
      <div>
        <p class="overline">Métricas por condición</p>
        <h2>Con ayuda frente a sin ayuda</h2>
      </div>
    </div>

    <p v-if="!rows.length" class="table-empty">
      Todavía no hay intentos completados para comparar.
    </p>
    <div v-else class="sentence-editor__scroll">
      <table class="response-table results-table">
        <thead>
          <tr>
            <th scope="col">Condición</th>
            <th scope="col">Alumnos</th>
            <th scope="col">Errores / 100 palabras</th>
            <th scope="col">Palabras por minuto</th>
            <th scope="col">Aceptación de sugerencias</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.condition" :data-condition="row.condition">
            <th scope="row">{{ row.label }}</th>
            <td class="test-number">{{ row.participants ?? 0 }}</td>
            <td class="test-number">{{ formatInterval(row.errors) }}</td>
            <td class="test-number">{{ formatInterval(row.ppm) }}</td>
            <td class="test-number">{{ formatAcceptance(row.acceptance) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="results-paired">
      <p class="overline">Diferencia con − sin (pareada)</p>
      <p v-if="!showPaired" class="table-empty">
        La diferencia pareada aparece cuando un mismo alumno completó oraciones de ambas
        condiciones.
      </p>
      <dl v-else class="results-paired__list">
        <div v-for="row in pairedRows" :key="row.key" :data-metric="row.key">
          <dt>{{ row.label }}</dt>
          <dd>
            <span class="test-number">{{ formatDelta(row.delta) }}</span>
            <small v-if="formatPairedStats(row.delta)" class="test-number">
              {{ formatPairedStats(row.delta) }}
            </small>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
