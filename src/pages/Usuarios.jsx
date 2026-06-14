import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Shield, Plus, Eye, EyeOff, UserPlus } from 'lucide-react'
import Modal from '../components/Modal'

const roleBadge = {
  admin: 'bg-laranja/20 text-laranja',
  gestor: 'bg-oceano/15 text-oceano',
}
const roleLabel = { admin: 'Administrador', gestor: 'Gestor' }

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [perfis, setPerfis] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', role: 'gestor' })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success'|'error', msg }

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

  const handleDelete = async (perfil) => {
    if (perfil.user_id === currentUser?.id) return
    if (!confirm(`Remover ${perfil.email} do portal?`)) return
    await supabase.from('perfis').delete().eq('id', perfil.id)
    load()
  }

  const handleConvidar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setFeedback({ type: 'error', msg: error.message })
      setSaving(false)
      return
    }

    const userId = data?.user?.id
    if (userId) {
      await supabase.from('perfis').upsert(
        { user_id: userId, email: form.email, role: form.role },
        { onConflict: 'user_id' }
      )
    }

    setSaving(false)
    setFeedback({ type: 'success', msg: `Usuário criado! Compartilhe o e-mail e a senha com ${form.email}.` })
    setForm({ email: '', password: '', role: 'gestor' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-laranja rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Usuários</h1>
            <p className="text-gray-400 text-sm">Gerenciar perfis e níveis de acesso</p>
          </div>
        </div>
        <button onClick={() => { setModal(true); setFeedback(null) }}
          className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Novo Usuário
        </button>
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
                <div className="flex items-center justify-end gap-2">
                  {p.user_id === currentUser?.id ? (
                    <span className="text-xs text-cinza italic">Você</span>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleRole(p)}
                        disabled={updating === p.id}
                        className="text-xs text-oceano hover:text-petroleum font-medium px-2.5 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors disabled:opacity-50"
                      >
                        {updating === p.id ? 'Alterando...' : `Tornar ${p.role === 'admin' ? 'Gestor' : 'Admin'}`}
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-xs text-laranja hover:text-petroleum font-medium px-2.5 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-oceano/10 border border-oceano/20 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-petroleum mb-1 flex items-center gap-2">
          <UserPlus size={14} /> Como funciona o acesso?
        </p>
        <ul className="text-xs text-gray-500 leading-relaxed space-y-1 list-disc list-inside">
          <li><strong>Admin</strong> — acesso total: cria, edita e exclui tudo</li>
          <li><strong>Gestor</strong> — visualiza candidatos, aprova/rejeita ações sociais, inscreve talentos em vagas</li>
          <li><strong>Líder</strong> — acesso via PIN da comunidade, sem cadastro de e-mail necessário</li>
        </ul>
        <p className="text-xs text-gray-400 mt-2">Ao criar um usuário, ele recebe um e-mail de confirmação do Supabase. Após confirmar, basta fazer login com o e-mail e senha informados.</p>
      </div>

      {modal && (
        <Modal title="Novo Usuário" onClose={() => setModal(false)}>
          <form onSubmit={handleConvidar} className="space-y-4">
            {feedback && (
              <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-verde/20 text-petroleum' : 'bg-red-50 text-red-600'}`}>
                {feedback.msg}
              </div>
            )}
            <div>
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className={inputCls}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className={labelCls}>Senha inicial</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  className={`${inputCls} pr-10`}
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza hover:text-petroleum transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Compartilhe a senha com o usuário. Ele pode alterá-la depois.</p>
            </div>
            <div>
              <label className={labelCls}>Nível de acesso</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                <option value="gestor">Gestor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
