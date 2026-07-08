<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  errorTypes: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

// Paleta estable por posición para que los colores no salten entre meses.
const PALETTE = ['#2d706c', '#e8755f', '#e9ad4e', '#78916e', '#1a504d', '#9c6b9e', '#5c8aa8']

const items = computed(() => props.errorTypes?.items ?? [])
const totalErrors = computed(() => props.errorTypes?.totalErrors ?? 0)
const hasData = computed(() => items.value.length > 0 && totalErrors.value > 0)

const chartData = computed(() => ({
  labels: items.value.map((item) => item.label),
  datasets: [
    {
      data: items.value.map((item) => item.count),
      backgroundColor: items.value.map((_, index) => PALETTE[index % PALETTE.length]),
      borderColor: '#fffdf8',
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#153530',
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const item = items.value[context.dataIndex]
          if (!item) return ''
          return `${item.label}: ${item.count} (${item.percentage.toFixed(1)}%)`
        },
      },
    },
  },
}))
</script>

<template>
  <section class="panel error-types-panel">
    <div class="panel__header">
      <div>
        <p class="overline">Diagnóstico ortográfico</p>
        <h2>Tipos de error del mes</h2>
      </div>
      <span class="panel__meta">{{ totalErrors }} errores</span>
    </div>

    <Skeleton v-if="loading && !errorTypes" height="16rem" border-radius="1rem" />

    <div v-else-if="hasData" class="error-types-panel__chart">
      <Chart type="doughnut" :data="chartData" :options="chartOptions" />
    </div>

    <p v-else class="error-types-panel__empty">
      Sin errores clasificados para este mes.
    </p>
  </section>
</template>

<style scoped>
.error-types-panel__chart {
  position: relative;
  height: 18rem;
}

/* PrimeVue inserta un wrapper .p-chart sin altura entre el contenedor y el
   canvas; sin esto el canvas colapsa a su alto por defecto y deja hueco. */
.error-types-panel__chart :deep(.p-chart) {
  height: 100%;
}

.error-types-panel__chart :deep(canvas) {
  height: 100% !important;
}

.error-types-panel__empty {
  color: var(--color-ink-soft);
  margin: 0;
  padding: 2rem 0;
  text-align: center;
}
</style>
