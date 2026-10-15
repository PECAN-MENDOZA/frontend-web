import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  changePassword as changePasswordRequest,
  clearSession,
  markPasswordChanged,
  restoreSession,
  signIn as signInRequest,
} from '@/features/auth/services/auth.service'
import { changePasswordErrorMessage, PASSWORD_RESET_NOTICE } from '@/features/auth/utils/access'
import { SESSION_END_PASSWORD_RESET } from '@/shared/utils/http'

export const useAuthStore = defineStore('auth', () => {
  const session = restoreSession()
  const user = ref(session?.user ?? null)
  const isLoading = ref(false)
  const errorMessage = ref('')
  // Aviso para el login cuando la sesión se cerró sola por un motivo que conviene explicar.
  const notice = ref('')

  const isAuthenticated = computed(() => Boolean(user.value))
  const userInitials = computed(() =>
    user.value?.name
      .split(' ')
      .map((name) => name[0])
      .slice(0, 2)
      .join(''),
  )

  async function signIn(credentials) {
    isLoading.value = true
    errorMessage.value = ''
    notice.value = ''

    try {
      const newSession = await signInRequest(credentials)
      user.value = newSession.user
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await changePasswordRequest(payload)
      user.value = markPasswordChanged(user.value)
      return true
    } catch (error) {
      errorMessage.value = changePasswordErrorMessage(error.status, error.message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Cerrar sesión avisa a los demás stores (síncrono) para que descarten los datos de la cuenta
  // sin acoplar este store a las features que los cargan.
  function signOut() {
    clearSession()
    user.value = null
    notice.value = ''
    window.dispatchEvent(new CustomEvent('auth:signed-out'))
  }

  function clearErrors() {
    errorMessage.value = ''
  }

  // Un 401 cierra la sesión sin más; un 403 "Password change required" (contraseña reiniciada con
  // la sesión abierta) además deja el aviso para el login.
  window.addEventListener('auth:unauthorized', (event) => {
    signOut()
    if (event?.detail?.reason === SESSION_END_PASSWORD_RESET) notice.value = PASSWORD_RESET_NOTICE
  })

  return {
    user,
    isLoading,
    errorMessage,
    notice,
    isAuthenticated,
    userInitials,
    signIn,
    changePassword,
    signOut,
    clearErrors,
  }
})
