import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/app/layouts/AppLayout.vue'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import ResearchLayout from '@/app/layouts/ResearchLayout.vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { canAccessRoute, homeForRole, requiresPasswordChange } from '@/features/auth/utils/access'

const routes = [
  {
    path: '/',
    redirect: () => {
      const authStore = useAuthStore()

      return authStore.isAuthenticated ? homeForRole(authStore.user?.role) : { name: 'login' }
    },
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
    // Ruta de nivel superior (no hija de /auth) para que meta.guestOnly del padre /auth
    // no se herede en to.meta y bloquee a un docente ya autenticado.
    path: '/change-password',
    component: AuthLayout,
    meta: { requiresAuth: true, roles: ['TEACHER'] },
    children: [
      {
        path: '',
        name: 'change-password',
        component: () => import('@/features/auth/views/ChangePasswordView.vue'),
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
        path: 'classrooms',
        name: 'classrooms',
        component: () => import('@/features/classrooms/views/ClassroomsView.vue'),
      },
      {
        path: 'classrooms/:classroomId',
        name: 'classroom-detail',
        component: () => import('@/features/classrooms/views/ClassroomDetailView.vue'),
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
      {
        path: 'teachers',
        name: 'research-teachers',
        component: () => import('@/features/research/views/ResearchTeachersView.vue'),
      },
      {
        path: 'study',
        name: 'research-study',
        component: () => import('@/features/research/views/ResearchStudyView.vue'),
      },
      {
        path: 'sessions',
        name: 'research-sessions',
        component: () => import('@/features/research/views/ResearchSessionsView.vue'),
      },
      {
        path: 'results',
        name: 'research-results',
        component: () => import('@/features/research/views/ResearchResultsView.vue'),
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

    if (requiresPasswordChange(authStore.user, to.name)) {
      return { name: 'change-password' }
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return homeForRole(authStore.user?.role)
  }
})

export default router
