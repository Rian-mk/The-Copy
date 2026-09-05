const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Custom error carrying the server message and status code, so callers
// can show a toast without re-parsing the response.
export class ApiError extends Error {
    constructor(message, status, body) {
        super(message)
        this.status = status
        this.body = body
    }
}

async function request(path, { method = 'GET', body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    })

    // Parse the body even for error responses — the backend returns
    // its error message in the body (e.g. { message: "..." })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
        const message = data?.message || 'خطایی رخ داد. دوباره تلاش کنید.'
        throw new ApiError(message, response.status, data)
    }

    return data
}

export const api = {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
}
