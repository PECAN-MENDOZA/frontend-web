<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import { correctionsLabel, outcomeTags } from '@/features/insights/utils/outcomes.js'
import { formatRelative } from '@/features/insights/utils/period.js'

// Una tarjeta por alumno del salón (ClassroomActivityResponse.students). Solo describe: cuándo
// escribió por última vez, cuántas correcciones tuvo en el periodo y cómo respondió a ellas.
const props = defineProps({
  students: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['select'])

// El backend ya ordena y deja al final a quienes no escribieron; se conserva ese orden y solo
// se separa el grupo para el estilo atenuado.
const cards = computed(() => {
  // La hora se toma al recalcular: al Actualizar, las etiquetas relativas también se refrescan.
  const now = new Date()

  return props.students.map((student) => ({
    ...student,
    inactive: !(student.correctionsInPeriod > 0),
    lastActivityLabel: formatRelative(student.lastActivityAt, now),
    correctionsText: correctionsLabel(student.correctionsInPeriod),
    tags: outcomeTags(student.outcomes),
  }))
})
</script>

<template>
  <p v-if="!cards.length" class="table-empty">Este salón aún no tiene estudiantes registrados.</p>
  <ul v-else class="activity-grid">
    <li v-for="student in cards" :key="student.studentId">
      <button
        type="button"
        class="activity-card"
        :class="{ 'activity-card--inactive': student.inactive }"
        @click="emit('select', student.studentId)"
      >
        <span class="activity-card__identity">
          <strong>{{ student.realName || student.username }}</strong>
          <span class="classroom-username">{{ student.username }}</span>
        </span>
        <span class="activity-card__meta">
          <span>Última escritura: {{ student.lastActivityLabel }}</span>
          <span>{{ student.correctionsText }}</span>
        </span>
        <span v-if="student.tags.length" class="activity-card__tags">
          <Tag
            v-for="tag in student.tags"
            :key="tag.key"
            :value="`${tag.label} ${tag.count}`"
            :severity="tag.severity"
            rounded
          />
        </span>
        <span v-else class="activity-card__quiet">Sin escritura en este periodo</span>
      </button>
    </li>
  </ul>
</template>
