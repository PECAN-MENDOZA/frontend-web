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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: getHeaders(options.headers),
  })

  if (response.status === 401 && !options.skipUnauthorizedEvent) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unexpected request error.' }))
    throw new Error(error.message ?? 'Unexpected request error.')
  }

  return response.status === 204 ? null : response.json()
}

export const api = {
  get(path, options) {
    return request(path, { ...options, method: 'GET' })
  },
  post(path, body, options) {
    return request(path, { ...options, method: 'POST', body: JSON.stringify(body) })
  },
}

export { TOKEN_KEY }
