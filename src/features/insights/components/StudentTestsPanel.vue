<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import { attemptLabel, testSentenceRows } from '@/features/insights/utils/tests.js'
import { formatDateTime } from '@/features/research/utils/dates'

// "Pruebas": cada intento completado (StudentTestSummary[]) con una tabla por oración: qué se
// dictó o pidió, qué escribió, cuántos errores y cuáles, con o sin ayuda, cuánto tardó.
const props = defineProps({
  tests: {
    type: Array,
    default: () => [],
  },
})

const attempts = computed(() =>
  props.tests.map((summary) => ({
    attemptId: summary.attemptId,
    label: attemptLabel(summary),
    completedLabel: formatDateTime(summary.completedAt),
    excluded: Boolean(summary.excluded),
    rows: testSentenceRows(summary),
  })),
)
</script>

<template>
  <p v-if="!attempts.length" class="table-empty">Todavía no ha completado ninguna prueba.</p>
  <div v-else class="student-tests">
    <article v-for="attempt in attempts" :key="attempt.attemptId" class="student-test">
      <div class="student-test__head">
        <div>
          <h3>{{ attempt.label }}</h3>
          <span>Completada el {{ attempt.completedLabel }}</span>
        </div>
        <Tag v-if="attempt.excluded" value="Excluida del estudio" severity="secondary" rounded />
      </div>
      <div class="sentence-editor__scroll">
        <table class="response-table student-test__table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Oración</th>
              <th scope="col">Ayuda</th>
              <th scope="col">Errores</th>
              <th scope="col">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in attempt.rows"
              :key="row.position"
              class="response-row"
              :class="{ 'response-row--skipped': row.skipped }"
            >
              <td class="response-row__position">{{ row.position }}</td>
              <td class="response-row__sentence">
                <span class="sentence-editor__label">{{ row.kindLabel }}</span>
                <p class="response-row__reference">
                  <span class="response-row__caption">{{ row.referenceCaption }}</span>
                  {{ row.referenceText || 'Texto no disponible' }}
                </p>
                <p
                  class="response-row__final"
                  :class="{ 'response-row__final--blank': row.skipped }"
                >
                  <span class="response-row__caption">Escribió</span>
                  {{ row.finalText }}
                </p>
              </td>
              <td>{{ row.assistanceLabel }}</td>
              <td class="response-row__errors">
                <div class="response-row__count">
                  <strong>{{ row.errorText }}</strong>
                  <small class="table-muted">{{ row.sourceLabel }}</small>
                </div>
                <details v-if="row.editLabels.length" class="response-row__edits">
                  <summary>Ver errores ({{ row.editLabels.length }})</summary>
                  <ul>
                    <li v-for="(label, index) in row.editLabels" :key="index">{{ label }}</li>
                  </ul>
                </details>
              </td>
              <td class="response-row__duration">
                <strong>{{ row.durationLabel }}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </div>
</template>
