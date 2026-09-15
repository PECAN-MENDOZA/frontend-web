<script setup>
import PageHeader from '@/shared/components/PageHeader.vue'
</script>

<template>
  <div class="research-page">
    <PageHeader
      eyebrow="Panel de investigación"
      title="Resumen"
      description="Datos seudonimizados de los participantes del estudio."
    />

    <div class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon"></i>
      <h2>Aún no hay un estudio seleccionado</h2>
      <p>
        Cuando un estudio esté disponible, aquí verás el resumen de resultados por participante
        con seudónimos.
      </p>
    </div>
  </div>
</template>
