import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn, signInWithPin, signInWithPinUnidade } = useAuth()
  const [mode, setMode] = useState('gestor')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [comunidades, setComunidades] = useState([])
  const [comunidadeId, setComunidadeId] = useState('')

  const [unidades, setUnidades] = useState([])
  const [unidadeId, setUnidadeId] = useState('')

  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('comunidades').select('id, nome').order('nome').then(({ data }) => {
      setComunidades(data ?? [])
      if (data?.length > 0) setComunidadeId(data[0].id)
    })
    supabase.from('unidades').select('id, nome').order('nome').then(({ data }) => {
      setUnidades(data ?? [])
      if (data?.length > 0) setUnidadeId(data[0].id)
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

  const handleUnidadeSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!unidadeId) return setError('Selecione uma unidade')
    setLoading(true)
    const { error } = await signInWithPinUnidade(unidadeId, pin)
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

  const switchMode = (m) => { setMode(m); setError(''); setPin('') }

  const inputCls = 'w-full border border-cinza rounded-lg px-4 py-2.5 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
  const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1.5'

  const PinField = ({ value, onChange }) => (
    <div>
      <label className={labelCls}>PIN</label>
      <div className="relative">
        <input
          type={showPin ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
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
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundImage: 'url(/fundo-tela.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-petroleum/70" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-verde via-oceano to-laranja" />

          <div className="p-8">
            <div className="text-center mb-6 pt-4">
              <img src="/logo-colorida-2.png" alt="Comissão de Comunidades" className="h-[274px] w-auto mx-auto mb-2 object-contain" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              {[
                { id: 'gestor', label: 'Admin' },
                { id: 'unidade', label: 'Unidade' },
                { id: 'lider', label: 'Líder' },
              ].map(t => (
                <button key={t.id} onClick={() => switchMode(t.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === t.id ? 'bg-petroleum text-verde shadow-sm' : 'text-gray-400 hover:text-petroleum'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Admin */}
            {mode === 'gestor' && (
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
            )}

            {/* Unidade */}
            {mode === 'unidade' && (
              <form onSubmit={handleUnidadeSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>Unidade</label>
                  {unidades.length === 0 ? (
                    <p className="text-sm text-cinza py-2 px-1">Nenhuma unidade cadastrada ainda.</p>
                  ) : (
                    <select value={unidadeId} onChange={e => setUnidadeId(e.target.value)} className={inputCls}>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  )}
                </div>
                <PinField value={pin} onChange={setPin} />
                {error && <div className="bg-laranja/10 border border-laranja/30 text-laranja rounded-lg px-4 py-3 text-sm">{error}</div>}
                <button type="submit" disabled={loading || !unidadeId}
                  className="w-full bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm">
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>
              </form>
            )}

            {/* Líder */}
            {mode === 'lider' && (
              <form onSubmit={handleLiderSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>Comunidade</label>
                  {comunidades.length === 0 ? (
                    <p className="text-sm text-cinza py-2 px-1">Nenhuma comunidade cadastrada ainda.</p>
                  ) : (
                    <select value={comunidadeId} onChange={e => setComunidadeId(e.target.value)} className={inputCls}>
                      {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  )}
                </div>
                <PinField value={pin} onChange={setPin} />
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
