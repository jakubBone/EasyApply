import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../services/api'

// Landing point of the Google redirect, at /auth/callback#token=<JWT>.
// The token rides in the fragment because browsers never send that part to a server, so it
// stays out of access logs and referrers. Reading it and navigating away is the whole job.
export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')

    if (token) {
      setToken(token)
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return null
}
