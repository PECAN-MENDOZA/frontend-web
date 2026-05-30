<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { APP_NAME } from '@/shared/constants/app'

const router = useRouter()
const authStore = useAuthStore()
const isNavigationOpen = ref(false)

const navigationItems = [
  { label: 'Overview', icon: 'pi pi-chart-bar', to: '/dashboard' },
  { label: 'Students', icon: 'pi pi-users', to: '/students' },
  { label: 'Reports', icon: 'pi pi-file-chart', disabled: true },
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

onMounted(() => window.addEventListener('auth:unauthorized', handleUnauthorized))
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
          <span class="sidebar__eyebrow">Teaching console</span>
          <strong>{{ APP_NAME }}</strong>
        </div>
      </div>

      <nav class="sidebar__navigation" aria-label="Main navigation">
        <span class="sidebar__section-label">Workspace</span>
        <RouterLink
          v-for="item in navigationItems"
          :key="item.label"
          :to="item.disabled ? '' : item.to"
          class="sidebar__link"
          :class="{ 'sidebar__link--disabled': item.disabled }"
          @click="closeNavigation"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
          <small v-if="item.disabled">Soon</small>
        </RouterLink>
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__status">
          <i class="pi pi-shield"></i>
          <div>
            <span>Protected session</span>
            <small>Data access audited</small>
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
            aria-label="Open navigation"
            @click="isNavigationOpen = true"
          />
          <div>
            <span class="topbar__eyebrow">Educator dashboard</span>
            <p>Student learning signals</p>
          </div>
        </div>

        <div class="topbar__actions">
          <Tag value="Live insights" severity="success" rounded />
          <Button icon="pi pi-bell" text rounded aria-label="Notifications" />
          <div class="topbar__profile">
            <Avatar :label="authStore.userInitials" shape="circle" />
            <div>
              <strong>{{ authStore.user?.name }}</strong>
              <span>{{ authStore.user?.roleLabel }}</span>
            </div>
          </div>
          <Button icon="pi pi-sign-out" text rounded aria-label="Sign out" @click="signOut" />
        </div>
      </header>

      <main class="page-container">
        <RouterView />
      </main>
    </section>
  </div>
</template>
