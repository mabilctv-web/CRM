import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile, UserPermissions, DEFAULT_PERMISSIONS } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  canAccess: (section: 'suppliers' | 'academic') => boolean
  allowedAcademicClients: number[] // empty = all
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: string | { full_name?: string; first_name?: string; last_name?: string; patronymic?: string }) => Promise<{ error: Error | null }>
  updateEmail: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data as Profile)
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      await fetchProfile(data.user.id)
    }
    return { error: error as Error | null }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'user' },
      },
    })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(data: string | { full_name?: string; first_name?: string; last_name?: string; patronymic?: string }) {
    const payload = typeof data === 'string' ? { full_name: data } : data
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user!.id)
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...payload } : prev)
    }
    return { error: error as Error | null }
  }

  async function updateEmail(email: string) {
    const { error } = await supabase.auth.updateUser({ email })
    return { error: error as Error | null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error as Error | null }
  }

  const isAdmin = profile?.role === 'admin'
  const permissions: UserPermissions = profile?.permissions ?? DEFAULT_PERMISSIONS

  function canAccess(section: 'suppliers' | 'academic'): boolean {
    if (isAdmin) return true
    return permissions[section] === true
  }

  const allowedAcademicClients: number[] = isAdmin ? [] : (permissions.academic_clients ?? [])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAdmin,
      canAccess,
      allowedAcademicClients,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updateEmail,
      updatePassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
