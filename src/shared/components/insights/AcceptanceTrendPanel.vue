<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'

const props = defineProps({
  trend: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const points = computed(() => props.trend?.points ?? [])

// El backend rellena los meses inactivos con ceros para una línea continua; si
// no hubo ni un envío en todo el rango no vale la pena dibujar la gráfica.
const hasActivity = computed(() =>
  points.value.some((point) => point.totalSubmissions > 0),
)

const rangeLabel = computed(() => {
  const first = points.value[0]?.label
  const last = points.value[points.value.length - 1]?.label
  return first && last ? `${first} — ${last}` : 'Últimos meses'
})

const chartData = computed(() => ({
  labels: points.value.map((point) => point.label),
  datasets: [
    {
      label: 'Aceptación',
      data: points.value.map((point) => point.acceptanceRate),
      borderColor: '#2d706c',
      backgroundColor: 'rgba(45, 112, 108, 0.12)',
      pointBackgroundColor: '#2d706c',
      pointBorderColor: '#fffdf8',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 3,
      tension: 0.35,
      fill: true,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `Aceptación: ${context.parsed.y.toFixed(1)}%`,
        afterLabel: (context) => {
          const point = points.value[context.dataIndex]
          if (!point) return ''
          return `${point.acceptedCount} de ${point.totalSubmissions} aceptadas`
        },
      },
    },
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: {
        color: '#537069',
        callback: (value) => `${value}%`,
      },
      grid: { color: 'rgba(26, 68, 61, 0.08)' },
    },
    x: {
      ticks: { color: '#537069' },
      grid: { display: false },
    },
  },
}))
</script>

<template>
  <section class="panel trend-panel">
    <div class="panel__header">
      <div>
        <p class="overline">Progreso mensual</p>
        <h2>Evolución de la aceptación</h2>
      </div>
      <span class="panel__meta">{{ rangeLabel }}</span>
    </div>

    <Skeleton v-if="loading && !trend" height="16rem" border-radius="1rem" />

    <div v-else-if="hasActivity" class="trend-panel__chart">
      <Chart type="line" :data="chartData" :options="chartOptions" />
    </div>

    <p v-else class="trend-panel__empty">
      Aún no hay envíos suficientes en este rango para mostrar una tendencia.
    </p>
  </section>
</template>

<style scoped>
.trend-panel__chart {
  position: relative;
  height: 18rem;
}

/* PrimeVue inserta un wrapper .p-chart sin altura entre el contenedor y el
   canvas; sin esto el canvas colapsa a su alto por defecto y deja hueco. */
.trend-panel__chart :deep(.p-chart) {
  height: 100%;
}

.trend-panel__chart :deep(canvas) {
  height: 100% !important;
}

.trend-panel__empty {
  color: var(--color-ink-soft);
  margin: 0;
  padding: 2rem 0;
  text-align: center;
}
</style>
