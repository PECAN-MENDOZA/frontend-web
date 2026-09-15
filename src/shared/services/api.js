const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
const TOKEN_KEY = 'florisboard_access_token'

function getHeaders(customHeaders = {}, isFormData = false) {
  const token = localStorage.getItem(TOKEN_KEY)

  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  }
}

export async function request(path, options = {}) {
  const { responseType, skipUnauthorizedEvent, ...fetchOptions } = options
  const isFormData = fetchOptions.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: getHeaders(options.headers, isFormData),
  })

  if (response.status === 401 && !skipUnauthorizedEvent) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Ocurrió un error inesperado en la solicitud.' }))
    const requestError = new Error(error.message ?? 'Ocurrió un error inesperado en la solicitud.')

    requestError.status = response.status
    // Los 400 de validación detallan el error por campo (validationErrors) para poder nombrarlos.
    requestError.validationErrors =
      error.validationErrors && typeof error.validationErrors === 'object'
        ? error.validationErrors
        : {}
    throw requestError
  }

  if (responseType === 'blob') {
    return {
      blob: await response.blob(),
      filename: getFilename(response.headers.get('Content-Disposition')),
    }
  }

  return response.status === 204 ? null : response.json()
}

function getFilename(contentDisposition) {
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? null
}

export const api = {
  get(path, options) {
    return request(path, { ...options, method: 'GET' })
  },
  post(path, body, options) {
    // JSON.stringify(undefined) devuelve undefined: fetch envía la petición sin cuerpo.
    return request(path, { ...options, method: 'POST', body: JSON.stringify(body) })
  },
  patch(path, body, options) {
    return request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) })
  },
  upload(path, formData, options) {
    return request(path, { ...options, method: 'POST', body: formData })
  },
  download(path, options) {
    return request(path, { ...options, method: 'GET', responseType: 'blob' })
  },
}

export { TOKEN_KEY }
