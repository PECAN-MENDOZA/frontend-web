import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  changePassword as changePasswordRequest,
  clearSession,
  markPasswordChanged,
  restoreSession,
  signIn as signInRequest,
} from '@/features/auth/services/auth.service'
import {
  changePasswordErrorMessage,
  DEACTIVATED_NOTICE,
  PASSWORD_RESET_NOTICE,
  SESSION_EXPIRED_NOTICE,
} from '@/features/auth/utils/access'
import { SESSION_END_DEACTIVATED, SESSION_END_PASSWORD_RESET } from '@/shared/utils/http'

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
      .join('')
      .toUpperCase(),
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

  async function changePassword(payload, { temporary = false } = {}) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await changePasswordRequest(payload)
      user.value = markPasswordChanged(user.value)
      return true
    } catch (error) {
      errorMessage.value = changePasswordErrorMessage(error.status, error.message, { temporary })
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

  // Error de validación local del login (sin llamar al servidor).
  function setLoginError(message) {
    errorMessage.value = message
    notice.value = ''
  }

  // Toda respuesta que cierra una sesión abierta deja un aviso para el login: contraseña
  // reiniciada (403), cuenta dada de baja (401 con su mensaje) o sesión terminada (401 sin más).
  // Solo la primera respuesta cuenta: las peticiones paralelas que fallan después (sesión ya
  // cerrada) no deben borrar ni pisar el aviso.
  window.addEventListener('auth:unauthorized', (event) => {
    if (!user.value) return
    signOut()
    const reason = event?.detail?.reason
    if (reason === SESSION_END_PASSWORD_RESET) notice.value = PASSWORD_RESET_NOTICE
    else if (reason === SESSION_END_DEACTIVATED) notice.value = DEACTIVATED_NOTICE
    else notice.value = SESSION_EXPIRED_NOTICE
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
    setLoginError,
  }
})
