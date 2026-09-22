export class ApiError extends Error {
  status: number
  type?: string

  constructor(message: string, status: number, type?: string) {
    super(message)
    this.status = status
    this.type = type
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers ?? {}) } : options.headers,
    ...options,
  })
  if (!res.ok) {
    let message = res.statusText
    let type: string | undefined
    try {
      const data = (await res.json()) as { error?: string; message?: string; type?: string }
      message = data.error || data.message || message
      type = data.type
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, type)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
