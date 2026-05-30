const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
const TOKEN_KEY = 'florisboard_access_token'

function getHeaders(customHeaders = {}) {
  const token = localStorage.getItem(TOKEN_KEY)

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  }
}

export async function request(path, options = {}) {
  const { responseType, skipUnauthorizedEvent, ...fetchOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: getHeaders(options.headers),
  })

  if (response.status === 401 && !skipUnauthorizedEvent) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Ocurrió un error inesperado en la solicitud.' }))
    throw new Error(error.message ?? 'Ocurrió un error inesperado en la solicitud.')
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
    return request(path, { ...options, method: 'POST', body: JSON.stringify(body) })
  },
  download(path, options) {
    return request(path, { ...options, method: 'GET', responseType: 'blob' })
  },
}

export { TOKEN_KEY }
