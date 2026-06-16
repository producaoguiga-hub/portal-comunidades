import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [liderSession, setLiderSession] = useState(null)
  const [unidadeSession, setUnidadeSession] = useState(null)
  const [alunoSession, setAlunoSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAndEnsurePerfil = async (authUser) => {
    await supabase.from('perfis').upsert(
      { user_id: authUser.id, email: authUser.email, role: 'gestor' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    const { data } = await supabase.from('perfis').select('role').eq('user_id', authUser.id).single()
    return data?.role ?? 'gestor'
  }

  useEffect(() => {
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

    const storedLider = localStorage.getItem('lider_session')
    if (storedLider) {
      try { setLiderSession(JSON.parse(storedLider)) } catch {}
      setLoading(false)
      return () => subscription.unsubscribe()
    }

    const storedUnidade = localStorage.getItem('unidade_session')
    if (storedUnidade) {
      try { setUnidadeSession(JSON.parse(storedUnidade)) } catch {}
      setLoading(false)
      return () => subscription.unsubscribe()
    }

    const storedAluno = localStorage.getItem('aluno_session')
    if (storedAluno) {
      try { setAlunoSession(JSON.parse(storedAluno)) } catch {}
      setLoading(false)
      return () => subscription.unsubscribe()
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const r = await fetchAndEnsurePerfil(session.user)
        setUser(session.user)
        setRole(r)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithPin = async (comunidadeId, pin) => {
    const { data, error } = await supabase.from('comunidades').select('id, nome, pin').eq('id', comunidadeId).single()
    if (error || !data) return { error: { message: 'Comunidade não encontrada' } }
    if (data.pin !== pin) return { error: { message: 'PIN incorreto' } }
    const session = { comunidadeId: data.id, comunidadeNome: data.nome }
    localStorage.setItem('lider_session', JSON.stringify(session))
    setLiderSession(session)
    return { error: null }
  }

  const signInWithPinUnidade = async (unidadeId, pin) => {
    const { data, error } = await supabase.from('unidades').select('id, nome, pin').eq('id', unidadeId).single()
    if (error || !data) return { error: { message: 'Unidade não encontrada' } }
    if (!data.pin) return { error: { message: 'Esta unidade ainda não tem PIN configurado' } }
    if (data.pin !== pin) return { error: { message: 'PIN incorreto' } }
    const session = { unidadeId: data.id, unidadeNome: data.nome }
    localStorage.setItem('unidade_session', JSON.stringify(session))
    setUnidadeSession(session)
    return { error: null }
  }

  const signInAluno = async (cpf, pin) => {
    const cpfClean = cpf.replace(/\D/g, '')
    const { data, error } = await supabase.from('alunos')
      .select('id, nome, cpf, comunidade_id, associacao_id')
      .eq('cpf', cpfClean)
      .eq('pin', pin)
      .single()
    if (error || !data) return { error: { message: 'CPF ou PIN incorreto' } }
    const session = { alunoId: data.id, alunoNome: data.nome, comunidadeId: data.comunidade_id, associacaoId: data.associacao_id }
    localStorage.setItem('aluno_session', JSON.stringify(session))
    setAlunoSession(session)
    return { error: null }
  }

  const signOut = async () => {
    localStorage.removeItem('lider_session')
    localStorage.removeItem('unidade_session')
    localStorage.removeItem('aluno_session')
    setLiderSession(null)
    setUnidadeSession(null)
    setAlunoSession(null)
    setUser(null)
    setRole(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, liderSession, unidadeSession, alunoSession, loading, signIn, signInWithPin, signInWithPinUnidade, signInAluno, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
