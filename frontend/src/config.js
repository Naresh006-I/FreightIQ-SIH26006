// In dev: Vite proxy forwards /api → http://localhost:8000
// In production: set VITE_API_URL env variable to deployed backend URL
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://nayadisha.onrender.com'

export async function apiFetch(path, options = {}) {
  const url = `${BACKEND_URL}${path}`
  const res  = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
