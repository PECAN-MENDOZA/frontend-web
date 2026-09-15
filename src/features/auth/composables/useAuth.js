import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { canAccessRoute, homeForRole } from '@/features/auth/utils/access'

export function useAuth() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const credentials = reactive({
    email: '',
    password: '',
  })

  async function submitSignIn() {
    try {
      await authStore.signIn(credentials)
      router.push(resolveDestination(route.query.redirect))
    } catch {
      // The store exposes the request error for the form message.
    }
  }

  function resolveDestination(redirect) {
    const role = authStore.user?.role
    const home = homeForRole(role)

    if (!redirect) return home

    const target = router.resolve(redirect)
    const allowedRoles = target.matched.flatMap((record) => record.meta.roles ?? [])

    return canAccessRoute(role, allowedRoles) ? redirect : home
  }

  return {
    authStore,
    credentials,
    submitSignIn,
  }
}
