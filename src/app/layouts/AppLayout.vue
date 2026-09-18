<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Tag from 'primevue/tag'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useInsightsStore } from '@/features/insights/store/insights.store.js'
import { APP_NAME } from '@/shared/constants/app'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const insightsStore = useInsightsStore()
const isNavigationOpen = ref(false)

// El punto de "Prueba en curso" refleja la última consulta a /tests/live (una al entrar al
// panel y las de la propia vista); el sondeo solo corre dentro de esa vista.
const hasLiveTests = computed(() => insightsStore.live.length > 0)

const navigationItems = [
  { label: 'Salón hoy', icon: 'pi pi-sun', to: '/dashboard' },
  { label: 'Salones', icon: 'pi pi-th-large', to: '/classrooms' },
  { label: 'Estudiantes', icon: 'pi pi-users', to: '/students' },
  { label: 'Prueba en curso', icon: 'pi pi-clock', to: '/tests/live', live: true },
]

function closeNavigation() {
  isNavigationOpen.value = false
}

function signOut() {
  authStore.signOut()
  router.push({ name: 'login' })
}

function handleUnauthorized() {
  router.push({ name: 'login' })
}

onMounted(() => {
  window.addEventListener('auth:unauthorized', handleUnauthorized)
  // Al entrar directamente a /tests/live la propia vista ya consulta; evitar la doble carga.
  if (route.name !== 'tests-live') insightsStore.loadLive()
})
onUnmounted(() => window.removeEventListener('auth:unauthorized', handleUnauthorized))
</script>

<template>
  <div class="app-shell">
    <div
      v-if="isNavigationOpen"
      class="app-shell__overlay"
      aria-hidden="true"
      @click="closeNavigation"
    ></div>

    <aside class="sidebar" :class="{ 'sidebar--open': isNavigationOpen }">
      <div class="sidebar__brand">
        <div class="brand-mark">F</div>
        <div>
          <span class="sidebar__eyebrow">Panel docente</span>
          <strong>{{ APP_NAME }}</strong>
        </div>
      </div>

      <nav class="sidebar__navigation" aria-label="Navegación principal">
        <span class="sidebar__section-label">Espacio de trabajo</span>
        <RouterLink
          v-for="item in navigationItems"
          :key="item.label"
          :to="item.to"
          class="sidebar__link"
          @click="closeNavigation"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
          <span
            v-if="item.live && hasLiveTests"
            class="sidebar__dot"
            role="img"
            aria-label="Hay estudiantes en una prueba"
          ></span>
        </RouterLink>
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__status">
          <i class="pi pi-shield"></i>
          <div>
            <span>Sesión protegida</span>
            <small>Acceso a datos auditado</small>
          </div>
        </div>
      </div>
    </aside>

    <section class="app-shell__content">
      <header class="topbar">
        <div class="topbar__leading">
          <Button
            class="topbar__menu-button"
            icon="pi pi-bars"
            text
            rounded
            aria-label="Abrir navegación"
            @click="isNavigationOpen = true"
          />
          <div>
            <span class="topbar__eyebrow">Panel docente</span>
            <p>Señales de aprendizaje</p>
          </div>
        </div>

        <div class="topbar__actions">
          <Tag value="Datos actualizados" severity="success" rounded />
          <Button icon="pi pi-bell" text rounded aria-label="Notificaciones" />
          <div class="topbar__profile">
            <Avatar :label="authStore.userInitials" shape="circle" />
            <div>
              <strong>{{ authStore.user?.name }}</strong>
              <span>{{ authStore.user?.roleLabel }}</span>
            </div>
          </div>
          <Button icon="pi pi-sign-out" text rounded aria-label="Cerrar sesión" @click="signOut" />
        </div>
      </header>

      <main class="page-container">
        <RouterView />
      </main>
    </section>

    <ConfirmDialog />
  </div>
</template>
