'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Import useAuth hook
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/i18n/navigation'; // '@/' は src/ へのエイリアスと仮定

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const { signUp } = useAuth(); // Use the hook

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Call the actual Supabase function via the hook
    // Pass credentials as an object as required by our updated hook
    const { error: signUpError } = await signUp(email, password); // Corrected: pass email, password directly as per latest hook definition

    if (signUpError) {
      setError(signUpError.message)
    } else {
      // Success! Show message or redirect.
      // Check Supabase project settings for email verification requirements.
      setMessage('Sign up successful! Please check your email for verification.')
      // Optionally redirect after a delay or immediately:
      // setTimeout(() => router.push('/login'), 3000);
      // Or if email verification is off/not required for login:
      // router.push('/dashboard');
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', paddingTop: '50px' }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
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
            minLength={6} // Example: Enforce minimum password length
            style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
       {/* Optional: Link to Login */}
       <p style={{ marginTop: '20px' }}>
         Already have an account? <Link href="/login">Log In</Link>
       </p>
    </div>
  )
}