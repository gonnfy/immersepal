// src/app/[locale]/(app)/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn } = useAuth();
  const [message, setMessage] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      setMessage('Login successful! Redirecting...')
      // Redirect to the main decks page after login
      router.push('/decks')
    }
  }


  return (
    <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
      <h2>Log In</h2>
      <form onSubmit={handleSignIn}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging In...' : 'Log In'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      <p style={{ marginTop: '20px' }}>
        {/* ★★★ Fixed ' error ★★★ */}
        Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
      </p>
      {/* <p style={{ marginTop: '10px' }}>
        <Link href="/forgot-password">Forgot Password?</Link>
      </p> */}
    </div>
  )
}