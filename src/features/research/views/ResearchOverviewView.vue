<script setup>
import { onMounted } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageHeader from '@/shared/components/PageHeader.vue'
import PairedProgressTable from '@/features/research/components/PairedProgressTable.vue'
import StudySelector from '@/features/research/components/StudySelector.vue'
import { useResearchStore } from '@/features/research/store/research.store'

const researchStore = useResearchStore()

onMounted(() => {
  if (!researchStore.studies.length) {
    researchStore.loadStudies()
  }
})
</script>

<template>
  <div class="research-page">
    <PageHeader
      eyebrow="Panel de investigación"
      title="Resumen"
      description="Datos seudonimizados de los participantes del estudio."
    >
      <template #actions>
        <StudySelector
          v-if="researchStore.studies.length"
          :studies="researchStore.studies"
          :model-value="researchStore.selectedStudyId"
          :disabled="researchStore.isMutating"
          @update:model-value="researchStore.selectStudy"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="researchStore.isLoading"
          :disabled="!researchStore.selectedStudyId || researchStore.isMutating"
          @click="researchStore.refreshAll"
        />
      </template>
    </PageHeader>

    <template v-if="researchStore.isLoading && !researchStore.studies.length">
      <div class="metrics-grid">
        <Skeleton v-for="item in 3" :key="item" height="7rem" border-radius="1.25rem" />
      </div>
      <Skeleton height="18rem" border-radius="1.25rem" />
    </template>

    <div v-else-if="researchStore.error && !researchStore.studies.length" class="panel research-empty-state">
      <i class="pi pi-exclamation-triangle research-empty-state__icon"></i>
      <h2>No pudimos cargar tus estudios</h2>
      <p>{{ researchStore.error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" @click="researchStore.loadStudies" />
    </div>

    <div v-else-if="!researchStore.studies.length" class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon"></i>
      <h2>Aún no hay un estudio</h2>
      <p>
        Crea un estudio desde <strong>Estudio</strong> para comenzar a reunir participantes y
        ejecuciones.
      </p>
      <RouterLink
        :to="{ name: 'research-study' }"
        class="p-button p-component research-link-button"
      >
        <i class="pi pi-book p-button-icon p-button-icon-left" aria-hidden="true"></i>
        <span class="p-button-label">Ir a Estudio</span>
      </RouterLink>
    </div>

    <div v-else-if="!researchStore.selectedStudy" class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon"></i>
      <h2>Elige un estudio</h2>
      <p>Selecciona un estudio arriba para ver su progreso.</p>
    </div>

    <template v-else>
      <Message v-if="researchStore.error" severity="error">
        {{ researchStore.error }}
      </Message>

      <section class="research-focal" aria-label="Pares completos y válidos">
        <span class="overline">Pares completos y válidos</span>
        <strong class="research-focal__value">{{ researchStore.counts.readyPairs }}</strong>
        <span class="research-focal__caption">
          de {{ researchStore.counts.participants }} participantes
        </span>
      </section>

      <section class="research-support-grid" aria-label="Cifras de apoyo">
        <div class="research-support-card">
          <span>Participantes</span>
          <strong>{{ researchStore.counts.participants }}</strong>
        </div>
        <div class="research-support-card">
          <span>Sesiones pendientes</span>
          <strong>{{ researchStore.counts.pendingRuns }}</strong>
        </div>
        <div class="research-support-card">
          <span>Fallos técnicos</span>
          <strong>{{ researchStore.counts.failures }}</strong>
        </div>
        <div class="research-support-card">
          <span>Adjudicaciones pendientes</span>
          <strong>{{ researchStore.counts.pendingAdjudications }}</strong>
        </div>
      </section>

      <section class="panel table-panel">
        <div class="panel__header">
          <div>
            <p class="overline">Progreso emparejado</p>
            <h2>Participantes</h2>
          </div>
        </div>

        <div v-if="researchStore.isLoading && !researchStore.rows.length" class="directory-loading">
          <Skeleton v-for="item in 5" :key="item" height="3.6rem" />
        </div>
        <p v-else-if="!researchStore.rows.length" class="research-table-empty">
          Aún no hay participantes registrados en este estudio.
        </p>
        <PairedProgressTable v-else :rows="researchStore.rows" />
      </section>

      <section class="research-version-strip" aria-label="Versiones del estudio">
        <span v-if="researchStore.versions.protocolVersion">
          Protocolo v{{ researchStore.versions.protocolVersion }}
        </span>
        <span v-for="version in researchStore.versions.appVersions" :key="`app-${version}`">
          App {{ version }}
        </span>
        <span v-for="version in researchStore.versions.modelVersions" :key="`model-${version}`">
          Modelo {{ version }}
        </span>
        <span v-for="version in researchStore.versions.backendVersions" :key="`backend-${version}`">
          Backend {{ version }}
        </span>
      </section>
    </template>
  </div>
</template>
