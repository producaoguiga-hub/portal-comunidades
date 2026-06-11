import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [liderSession, setLiderSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAndEnsurePerfil = async (authUser) => {
    await supabase.from('perfis').upsert(
      { user_id: authUser.id, email: authUser.email, role: 'gestor' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    const { data } = await supabase
      .from('perfis')
      .select('role')
      .eq('user_id', authUser.id)
      .single()
    return data?.role ?? 'gestor'
  }

  useEffect(() => {
    const stored = localStorage.getItem('lider_session')
    if (stored) {
      try { setLiderSession(JSON.parse(stored)) } catch {}
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const r = await fetchAndEnsurePerfil(session.user)
        setUser(session.user)
        setRole(r)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const r = await fetchAndEnsurePerfil(session.user)
        setUser(session.user)
        setRole(r)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithPin = async (comunidadeId, pin) => {
    const { data, error } = await supabase
      .from('comunidades')
      .select('id, nome, pin')
      .eq('id', comunidadeId)
      .single()

    if (error || !data) return { error: { message: 'Comunidade não encontrada' } }
    if (data.pin !== pin) return { error: { message: 'PIN incorreto' } }

    const session = { comunidadeId: data.id, comunidadeNome: data.nome }
    localStorage.setItem('lider_session', JSON.stringify(session))
    setLiderSession(session)
    return { error: null }
  }

  const signOut = async () => {
    localStorage.removeItem('lider_session')
    setLiderSession(null)
    setUser(null)
    setRole(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, liderSession, loading, signIn, signInWithPin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
