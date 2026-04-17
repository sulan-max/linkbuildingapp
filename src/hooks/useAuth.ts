import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const ALLOWED_DOMAIN = '@creaticom.cz'

function isAllowedUser(user: User | null): boolean {
  return !!user?.email?.toLowerCase().endsWith(ALLOWED_DOMAIN.toLowerCase())
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null
      if (sessionUser && !isAllowedUser(sessionUser)) {
        supabase.auth.signOut()
        setAuthError(`Přístup je povolen pouze pro účty s doménou ${ALLOWED_DOMAIN}.`)
        setUser(null)
      } else {
        setUser(sessionUser)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      if (sessionUser && !isAllowedUser(sessionUser)) {
        supabase.auth.signOut()
        setAuthError(`Přístup je povolen pouze pro účty s doménou ${ALLOWED_DOMAIN}.`)
        setUser(null)
      } else {
        if (sessionUser) setAuthError(null)
        setUser(sessionUser)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () => {
    setAuthError(null)
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = () => {
    setAuthError(null)
    return supabase.auth.signOut()
  }

  return { user, loading, signInWithGoogle, signOut, authError }
}
