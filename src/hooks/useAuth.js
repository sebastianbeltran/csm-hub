import { useState, useEffect, useCallback } from 'react'
import { supabase, missingConfig } from '../lib/supabase'

export function useAuth() {
  const [user,        setUser]        = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    if (missingConfig) { setAuthLoading(false); return }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      else { setProfile(null) }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return {
    user,
    profile,
    role:        profile?.role ?? null,
    fullName:    profile?.full_name ?? null,
    authLoading,
    login,
    logout,
  }
}
