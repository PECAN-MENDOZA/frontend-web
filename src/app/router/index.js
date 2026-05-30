import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/app/layouts/AppLayout.vue'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import { useAuthStore } from '@/features/auth/store/auth.store'

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
    meta: { requiresAuth: true },
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
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
