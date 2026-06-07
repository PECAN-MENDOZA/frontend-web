<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    default: 'Respuesta a sugerencias',
  },
  eyebrow: {
    type: String,
    default: 'Pulso de feedback',
  },
})

const totalResponses = computed(() => props.items.reduce((total, item) => total + item.count, 0))

const chartStyle = computed(() => {
  const colors = {
    ocean: 'var(--color-ocean)',
    coral: 'var(--color-coral)',
    amber: 'var(--color-amber)',
  }
  let start = 0
  const segments = props.items.map((item) => {
    const end = start + item.percentage
    const segment = `${colors[item.tone]} ${start}% ${end}%`
    start = end
    return segment
  })

  return {
    background:
      totalResponses.value > 0
        ? `conic-gradient(${segments.join(', ')})`
        : 'rgba(26, 68, 61, 0.09)',
  }
})
</script>

<template>
  <section class="panel feedback-panel">
    <div class="panel__header">
      <div>
        <p class="overline">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
      </div>
      <span class="panel__meta">{{ totalResponses }} respuestas</span>
    </div>

    <div class="feedback-chart" aria-label="Mezcla de respuestas a sugerencias">
      <div class="feedback-chart__ring" :style="chartStyle">
        <div class="feedback-chart__center">
          <strong>{{ totalResponses }}</strong>
          <span>respuestas</span>
        </div>
      </div>

      <div class="feedback-chart__legend">
        <div v-for="item in items" :key="item.key" class="feedback-item">
          <div class="feedback-item__header">
            <div>
              <span class="feedback-item__dot" :class="`tone-${item.tone}`"></span>
              <strong>{{ item.label }}</strong>
            </div>
            <span>{{ item.percentage }}%</span>
          </div>
          <div class="feedback-item__track">
            <span
              class="feedback-item__bar"
              :class="`tone-${item.tone}`"
              :style="{ width: `${item.percentage}%` }"
            ></span>
          </div>
          <small>{{ item.count }} registros</small>
        </div>
      </div>
    </div>
  </section>
</template>
