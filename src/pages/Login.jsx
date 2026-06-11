import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-petroleum flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background accent shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-verde/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-oceano/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top brand bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-verde via-oceano to-laranja" />

          <div className="p-8">
            <div className="text-center mb-8">
              {/* Logo icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-petroleum rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-verde" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-petroleum tracking-tight">Portal Comunidades</h1>
              <p className="text-gray-400 mt-1 text-sm">Faça login para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-petroleum mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-cinza rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-petroleum mb-1.5">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-cinza rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-laranja/10 border border-laranja/30 text-laranja rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">Portal Comunidades © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
