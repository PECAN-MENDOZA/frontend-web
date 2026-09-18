<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import {
  OUTCOME_LABELS,
  OUTCOME_SEVERITIES,
  assistanceBadge,
  correctionLine,
} from '@/features/insights/utils/outcomes.js'
import { formatClock } from '@/features/insights/utils/period.js'

// Últimas correcciones del salón (RecentCorrectionItem[]), de la más reciente a la más antigua.
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

const expanded = ref(new Set())

const rows = computed(() => {
  // La hora se toma al recalcular: al Actualizar, "hoy" se reevalúa también.
  const now = new Date()

  return props.items.map((item) => ({
    ...item,
    clock: formatClock(item.createdAt, now),
    line: correctionLine(item),
    outcomeText: item.outcomeLabel || OUTCOME_LABELS[item.outcome] || item.outcome,
    severity: OUTCOME_SEVERITIES[item.outcome] ?? 'secondary',
    badge: assistanceBadge(item),
    // La sugerencia solo se repite si el texto final no la reproduce tal cual.
    showsSuggestion: Boolean(item.correctedText) && item.correctedText !== item.finalText,
  }))
})

function isExpanded(sessionId) {
  return expanded.value.has(sessionId)
}

function toggle(sessionId) {
  const next = new Set(expanded.value)
  if (next.has(sessionId)) next.delete(sessionId)
  else next.add(sessionId)
  expanded.value = next
}
</script>

<template>
  <p v-if="!rows.length" class="table-empty">Ninguna corrección en este periodo.</p>
  <ul v-else class="corrections-list">
    <li v-for="row in rows" :key="row.sessionId" class="correction-item">
      <div class="correction-item__row">
        <time class="correction-item__clock" :datetime="row.createdAt">{{ row.clock }}</time>
        <div class="correction-item__body">
          <div class="correction-item__head">
            <RouterLink
              class="correction-item__student"
              :to="{ name: 'student-detail', params: { studentId: row.studentId } }"
            >
              {{ row.realName || row.username }}
            </RouterLink>
            <span class="classroom-username">{{ row.username }}</span>
          </div>
          <p class="correction-item__line">{{ row.line }}</p>
          <div class="correction-item__labels">
            <Tag :value="row.outcomeText" :severity="row.severity" rounded />
            <Tag v-if="row.badge" :value="row.badge" severity="secondary" rounded />
          </div>
        </div>
        <Button
          :icon="isExpanded(row.sessionId) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          text
          rounded
          size="small"
          severity="secondary"
          :aria-label="
            isExpanded(row.sessionId) ? 'Ocultar los textos completos' : 'Ver los textos completos'
          "
          :aria-expanded="isExpanded(row.sessionId)"
          :aria-controls="`correction-texts-${row.sessionId}`"
          @click="toggle(row.sessionId)"
        />
      </div>
      <dl
        v-if="isExpanded(row.sessionId)"
        :id="`correction-texts-${row.sessionId}`"
        class="correction-item__texts"
      >
        <div>
          <dt>Escribió</dt>
          <dd>{{ row.originalText }}</dd>
        </div>
        <div v-if="row.showsSuggestion">
          <dt>Sugerencia</dt>
          <dd>{{ row.correctedText }}</dd>
        </div>
        <div>
          <dt>Quedó</dt>
          <dd>{{ row.finalText }}</dd>
        </div>
      </dl>
    </li>
  </ul>
</template>
