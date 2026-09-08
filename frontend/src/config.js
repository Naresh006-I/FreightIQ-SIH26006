// Automatically use deployed backend in production, local in dev
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const url = `${BACKEND_URL}${path}`
  const res  = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
