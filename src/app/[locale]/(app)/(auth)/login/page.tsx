'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Import useAuth hook
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation'; // '@/' は src/ へのエイリアスと仮定

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { signIn } = useAuth(); // Use the hook

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Call the actual Supabase function via the hook
    const { error: signInError } = await signIn(email, password); // Pass email, password

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      // Success! Redirect to dashboard.
      setMessage('Login successful! Redirecting...') // Optional message
      router.push('/dashboard') // Redirect to dashboard or desired page
      // No need to setLoading(false) here as we are navigating away
    }
  }

  // Added state for success message (optional)
  const [message, setMessage] = useState<string | null>(null)

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
      {/* Optional: Links */}
      <p style={{ marginTop: '20px' }}>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </p>
      {/* <p style={{ marginTop: '10px' }}>
        <a href="/forgot-password">Forgot Password?</a>
      </p> */}
    </div>
  )
}