import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn, signInWithPin } = useAuth()
  const [mode, setMode] = useState('gestor')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [comunidades, setComunidades] = useState([])
  const [comunidadeId, setComunidadeId] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('comunidades').select('id, nome').order('nome').then(({ data }) => {
      setComunidades(data ?? [])
      if (data?.length > 0) setComunidadeId(data[0].id)
    })
  }, [])

  const handleGestorSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleLiderSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!comunidadeId) return setError('Selecione uma comunidade')
    setLoading(true)
    const { error } = await signInWithPin(comunidadeId, pin)
    if (error) setError(error.message)
    setLoading(false)
  }

  const inputCls = 'w-full border border-cinza rounded-lg px-4 py-2.5 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
  const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1.5'

  return (
    <div className="min-h-screen bg-petroleum flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-verde/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-oceano/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-verde via-oceano to-laranja" />

          <div className="p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-petroleum rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-verde" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-petroleum tracking-tight">Portal Comunidades</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode('gestor'); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'gestor'
                    ? 'bg-petroleum text-verde shadow-sm'
                    : 'text-gray-400 hover:text-petroleum'
                }`}
              >
                Gestor / Admin
              </button>
              <button
                onClick={() => { setMode('lider'); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'lider'
                    ? 'bg-petroleum text-verde shadow-sm'
                    : 'text-gray-400 hover:text-petroleum'
                }`}
              >
                Líder Comunitário
              </button>
            </div>

            {mode === 'gestor' ? (
              <form onSubmit={handleGestorSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required className={inputCls} placeholder="seu@email.com" />
                </div>
                <div>
                  <label className={labelCls}>Senha</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required className={inputCls} placeholder="••••••••" />
                </div>
                {error && <div className="bg-laranja/10 border border-laranja/30 text-laranja rounded-lg px-4 py-3 text-sm">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm">
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLiderSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>Comunidade</label>
                  {comunidades.length === 0 ? (
                    <p className="text-sm text-cinza py-2 px-1">Nenhuma comunidade cadastrada ainda.</p>
                  ) : (
                    <select value={comunidadeId} onChange={e => setComunidadeId(e.target.value)} className={inputCls}>
                      {comunidades.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className={labelCls}>PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      required
                      maxLength={10}
                      className={`${inputCls} pr-10`}
                      placeholder="••••"
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza hover:text-petroleum transition-colors">
                      {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {error && <div className="bg-laranja/10 border border-laranja/30 text-laranja rounded-lg px-4 py-3 text-sm">{error}</div>}
                <button type="submit" disabled={loading || !comunidadeId}
                  className="w-full bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm">
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-white/20 text-xs mt-6">Portal Comunidades © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
