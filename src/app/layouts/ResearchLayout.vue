<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useResearchStore } from '@/features/research/store/research.store'
import { APP_NAME } from '@/shared/constants/app'

const router = useRouter()
const authStore = useAuthStore()
const researchStore = useResearchStore()
const isNavigationOpen = ref(false)

const navigationItems = [
  { label: 'Pruebas', icon: 'pi pi-list-check', to: '/research/tests' },
  { label: 'Docentes', icon: 'pi pi-id-card', to: '/research/teachers' },
]

function closeNavigation() {
  isNavigationOpen.value = false
}

// authStore.signOut() emite auth:signed-out, que descarta los datos de investigación de la cuenta.
function signOut() {
  authStore.signOut()
  router.push({ name: 'login' })
}

function handleSignedOut() {
  researchStore.reset()
}

function handleUnauthorized() {
  researchStore.reset()
  router.push({ name: 'login' })
}

onMounted(() => {
  window.addEventListener('auth:signed-out', handleSignedOut)
  window.addEventListener('auth:unauthorized', handleUnauthorized)
})
onUnmounted(() => {
  window.removeEventListener('auth:signed-out', handleSignedOut)
  window.removeEventListener('auth:unauthorized', handleUnauthorized)
})
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
          <span class="sidebar__eyebrow">Panel de investigación</span>
          <strong>{{ APP_NAME }}</strong>
        </div>
      </div>

      <nav class="sidebar__navigation" aria-label="Navegación principal">
        <span class="sidebar__section-label">Datos seudonimizados</span>
        <RouterLink
          v-for="item in navigationItems"
          :key="item.label"
          :to="item.to"
          class="sidebar__link"
          active-class="sidebar__link--section"
          exact-active-class="router-link-active"
          @click="closeNavigation"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__status">
          <i class="pi pi-shield" aria-hidden="true"></i>
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
            <span class="topbar__eyebrow">Panel de investigación</span>
            <p>Datos seudonimizados</p>
          </div>
        </div>

        <div class="topbar__actions">
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

    <Toast position="bottom-right" />
    <ConfirmDialog class="research-confirm" />
  </div>
</template>
