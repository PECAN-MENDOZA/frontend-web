import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/app/layouts/AppLayout.vue'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import ResearchLayout from '@/app/layouts/ResearchLayout.vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { canAccessRoute, homeForRole, requiresPasswordChange } from '@/features/auth/utils/access'
import { reloadOnceForChunkError } from './chunkReload'

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
        component: () => import('@/features/insights/views/ClassroomTodayView.vue'),
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
        component: () => import('@/features/insights/views/StudentTodayView.vue'),
      },
      {
        path: 'tests/live',
        name: 'tests-live',
        component: () => import('@/features/insights/views/LiveTestsView.vue'),
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
        redirect: { name: 'research-tests' },
      },
      {
        path: 'tests',
        name: 'research-tests',
        component: () => import('@/features/tests/views/TestsListView.vue'),
      },
      {
        path: 'tests/:testId',
        name: 'research-test',
        component: () => import('@/features/tests/views/TestEditorView.vue'),
      },
      {
        path: 'tests/:testId/attempts/:attemptId',
        name: 'research-attempt',
        component: () => import('@/features/tests/views/AttemptResponsesView.vue'),
      },
      {
        path: 'tests/:testId/results',
        name: 'research-results',
        component: () => import('@/features/tests/views/TestResultsView.vue'),
      },
      {
        path: 'teachers',
        name: 'research-teachers',
        component: () => import('@/features/research/views/ResearchTeachersView.vue'),
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
      return { name: 'change-password', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return homeForRole(authStore.user?.role)
  }
})

// Bundle viejo tras un despliegue: recarga hacia la ruta a la que se iba.
router.onError((error, to) => {
  reloadOnceForChunkError(error, {
    storage: window.sessionStorage,
    reload: (path) => window.location.assign(path ?? window.location.href),
    targetPath: to?.fullPath,
  })
})

export default router
