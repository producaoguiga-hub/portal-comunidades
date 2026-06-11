import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Shield } from 'lucide-react'

const roleBadge = {
  admin: 'bg-laranja/20 text-laranja',
  gestor: 'bg-oceano/15 text-oceano',
}
const roleLabel = { admin: 'Admin', gestor: 'Gestor' }

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [perfis, setPerfis] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('perfis').select('*').order('created_at')
    setPerfis(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleRole = async (perfil) => {
    if (perfil.user_id === currentUser?.id) return
    const newRole = perfil.role === 'admin' ? 'gestor' : 'admin'
    setUpdating(perfil.id)
    await supabase.from('perfis').update({ role: newRole }).eq('id', perfil.id)
    setUpdating(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-7 bg-laranja rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-petroleum">Usuários</h1>
          <p className="text-gray-400 text-sm">Gerenciar perfis e níveis de acesso</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
        {loading ? (
          <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
        ) : perfis.length === 0 ? (
          <div className="py-14 text-center text-cinza text-sm">Nenhum usuário cadastrado ainda.</div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-petroleum/5 border-b text-xs font-semibold text-petroleum/70 uppercase tracking-wider">
              <span>E-mail</span>
              <span>Perfil</span>
              <span className="text-right">Ação</span>
            </div>
            {perfis.map(p => (
              <div key={p.id} className="grid grid-cols-3 gap-4 px-5 py-3.5 items-center border-b last:border-0 hover:bg-verde/5 transition-colors">
                <span className="text-sm text-petroleum truncate">{p.email ?? '—'}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${roleBadge[p.role] ?? 'bg-gray-100 text-gray-500'}`}>
                  <Shield size={11} />
                  {roleLabel[p.role] ?? p.role}
                </span>
                <div className="text-right">
                  {p.user_id === currentUser?.id ? (
                    <span className="text-xs text-cinza italic">Você</span>
                  ) : (
                    <button
                      onClick={() => toggleRole(p)}
                      disabled={updating === p.id}
                      className="text-xs text-oceano hover:text-petroleum font-medium px-2.5 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors disabled:opacity-50"
                    >
                      {updating === p.id ? 'Alterando...' : `Tornar ${p.role === 'admin' ? 'Gestor' : 'Admin'}`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-oceano/10 border border-oceano/20 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-petroleum mb-1">Como criar novos usuários?</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Acesse o <strong>Supabase Dashboard</strong> → Authentication → Users → <strong>Add User</strong>.<br />
          O usuário aparece aqui automaticamente após o primeiro login. Por padrão recebe perfil <strong>Gestor</strong>.
        </p>
      </div>
    </div>
  )
}
