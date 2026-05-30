<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  change: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  tone: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <article class="metric-card" :class="`metric-card--${tone}`">
    <div class="metric-card__icon">
      <i :class="icon"></i>
    </div>
    <div>
      <p>{{ label }}</p>
      <strong>{{ value }}</strong>
      <span>{{ change }}</span>
    </div>
  </article>
</template>
