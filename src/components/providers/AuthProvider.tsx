'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase' // Client-side client

// Define the shape of the context data
interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  // Auth functions (signUp, signIn, signOut) will be provided by useAuth hook
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient() // Initialize client-side client
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as true

  useEffect(() => {
    setIsLoading(true) // Set loading true when checking session initially

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false) // Set loading false after initial check
    }).catch((error) => {
        console.error("Error getting initial session:", error);
        setIsLoading(false); // Ensure loading is false even on error
    })

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", _event, session);
        setSession(session)
        setUser(session?.user ?? null)
        // Don't set isLoading here, only on initial load
      }
    )

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase]) // Depend on supabase client instance

  const value = {
    session,
    user,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}