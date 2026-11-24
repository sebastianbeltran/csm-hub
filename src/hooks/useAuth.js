import { useState, useEffect, useCallback } from 'react'
import { supabase, missingConfig } from '../lib/supabase'

// Roles que el super_admin puede "previsualizar" con el selector de vistas.
export const PREVIEW_ROLES = ['super_admin', 'admin', 'director', 'counselor', 'docente']

const PREVIEW_ROLE_KEY   = 'csm.previewRole'
const PREVIEW_SCHOOL_KEY = 'csm.previewSchoolId'

const readPref = (key) => {
  try { return localStorage.getItem(key) } catch { return null }
}
const writePref = (key, value) => {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch { /* almacenamiento no disponible: la vista previa no se recuerda */ }
}

export function useAuth() {
  const [user,        setUser]        = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Vista previa (solo tiene efecto si el usuario real es super_admin)
  const [previewRole,     setPreviewRoleState]     = useState(() => readPref(PREVIEW_ROLE_KEY))
  const [previewSchoolId, setPreviewSchoolIdState] = useState(() => readPref(PREVIEW_SCHOOL_KEY))

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
    // "Último acceso" en Admin → Usuarios (máximo una vez por hora; fire-and-forget)
    const last = data?.last_login ? new Date(data.last_login).getTime() : 0
    if (data && Date.now() - last > 60 * 60 * 1000) {
      supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', userId).then(() => {})
    }
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

  const setPreviewRole = (r) => {
    const value = PREVIEW_ROLES.includes(r) && r !== 'super_admin' ? r : null
    setPreviewRoleState(value)
    writePref(PREVIEW_ROLE_KEY, value)
  }

  const setPreviewSchoolId = (id) => {
    setPreviewSchoolIdState(id || null)
    writePref(PREVIEW_SCHOOL_KEY, id || null)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setPreviewRole(null)
    setPreviewSchoolId(null)
  }

  const realRole     = profile?.role ?? null
  const isSuperAdmin = realRole === 'super_admin'

  // El rol con el que se pinta la interfaz. Los permisos reales (RLS) siguen
  // siendo los del usuario: esto solo cambia lo que se muestra.
  const role     = isSuperAdmin ? (previewRole ?? 'super_admin') : realRole
  const schoolId = isSuperAdmin ? (previewSchoolId ?? profile?.school_id ?? null) : (profile?.school_id ?? null)

  return {
    user,
    profile,
    role,
    realRole,
    isSuperAdmin,
    schoolId,
    previewRole: isSuperAdmin ? (previewRole ?? 'super_admin') : null,
    // Escuela elegida en "Ver como" (null = "Mis escuelas": todas las del usuario)
    previewSchoolId: isSuperAdmin ? (previewSchoolId ?? null) : null,
    setPreviewRole,
    setPreviewSchoolId,
    fullName:    profile?.full_name ?? null,
    authLoading,
    login,
    logout,
  }
}
