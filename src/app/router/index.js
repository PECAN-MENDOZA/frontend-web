import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/app/layouts/AppLayout.vue'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import ResearchLayout from '@/app/layouts/ResearchLayout.vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { canAccessRoute, homeForRole } from '@/features/auth/utils/access'

const routes = [
  {
    path: '/',
    redirect: { name: 'dashboard' },
  },
  {
    path: '/auth',
    component: AuthLayout,
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/features/auth/views/LoginView.vue'),
      },
    ],
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true, roles: ['TEACHER'] },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/features/dashboard/views/DashboardView.vue'),
      },
      {
        path: 'students',
        name: 'students',
        component: () => import('@/features/students/views/StudentsView.vue'),
      },
      {
        path: 'students/:studentId',
        name: 'student-detail',
        component: () => import('@/features/students/views/StudentDetailView.vue'),
      },
    ],
  },
  {
    path: '/research',
    component: ResearchLayout,
    meta: { requiresAuth: true, roles: ['RESEARCHER'] },
    children: [
      {
        path: '',
        name: 'research-overview',
        component: () => import('@/features/research/views/ResearchOverviewView.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: () => {
      const authStore = useAuthStore()

      return authStore.isAuthenticated ? homeForRole(authStore.user?.role) : { name: 'dashboard' }
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    const allowedRoles = to.matched.flatMap((record) => record.meta.roles ?? [])

    if (!canAccessRoute(authStore.user?.role, allowedRoles)) {
      return homeForRole(authStore.user?.role)
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return homeForRole(authStore.user?.role)
  }
})

export default router
