<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const totalErrors = (items) => items.reduce((total, item) => total + item.count, 0)

const chartStyle = computed(() => {
  const colors = ['var(--color-coral)', 'var(--color-ocean)', 'var(--color-amber)']
  let start = 0
  const segments = props.items.map((item, index) => {
    const end = start + item.percentage
    const segment = `${colors[index]} ${start}% ${end}%`
    start = end
    return segment
  })

  return {
    background: segments.length
      ? `conic-gradient(${segments.join(', ')})`
      : 'rgba(26, 68, 61, 0.09)',
  }
})
</script>

<template>
  <section class="panel distribution-panel">
    <div class="panel__header">
      <div>
        <p class="overline">Perfil de errores</p>
        <h2>Áreas que necesitan refuerzo</h2>
      </div>
      <span class="panel__meta">{{ totalErrors(items) }} señales</span>
    </div>

    <div class="distribution-chart" aria-label="Distribución de errores detectados">
      <div class="distribution-chart__ring" :style="chartStyle">
        <div class="distribution-chart__center">
          <strong>{{ totalErrors(items) }}</strong>
          <span>detectados</span>
        </div>
      </div>

      <div class="distribution-chart__legend">
        <div v-for="item in items" :key="item.type" class="distribution-item">
          <div class="distribution-item__header">
            <div>
              <span class="distribution-item__dot" :class="`tone-${item.tone}`"></span>
              <strong>{{ item.type }}</strong>
            </div>
            <span>{{ item.percentage }}%</span>
          </div>
          <div class="distribution-item__track">
            <span
              class="distribution-item__bar"
              :class="`tone-${item.tone}`"
              :style="{ width: `${item.percentage}%` }"
            ></span>
          </div>
          <small>{{ item.count }} ocurrencias</small>
        </div>
      </div>
    </div>
  </section>
</template>
