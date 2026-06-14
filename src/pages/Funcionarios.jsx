import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const columns = [
  { key: 'funcionario_nome', label: 'Nome' },
  { key: 'associacao', label: 'Associação' },
  { key: 'unidade', label: 'Unidade' },
  { key: 'comunidades', label: 'Comunidade', render: v => v?.nome ?? '—' },
]

export default function Funcionarios() {
  const { role, unidadeSession } = useAuth()
  const isUnidade = !!unidadeSession

  const [data, setData] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [associacoes, setAssociacoes] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = () => ({
    funcionario_nome: '',
    associacao: '',
    unidade: isUnidade ? unidadeSession.unidadeNome : '',
    comunidade_id: '',
  })

  const load = async () => {
    setLoading(true)
    let q = supabase.from('funcionarios_associacao').select('*, comunidades(nome)').order('created_at', { ascending: false })
    if (isUnidade) q = q.eq('unidade', unidadeSession.unidadeNome)

    const [funcRes, comRes, assocRes, unidRes] = await Promise.all([
      q,
      supabase.from('comunidades').select('id, nome').order('nome'),
      supabase.from('associacoes').select('id, nome, sigla, comunidade_id').order('nome'),
      supabase.from('unidades').select('id, nome').order('nome'),
    ])
    setData(funcRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setAssociacoes(assocRes.data ?? [])
    setUnidades(unidRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setModal(true) }
  const openEdit = (row) => {
    setForm({
      funcionario_nome: row.funcionario_nome,
      associacao: row.associacao ?? '',
      unidade: row.unidade ?? (isUnidade ? unidadeSession.unidadeNome : ''),
      comunidade_id: row.comunidade_id ?? '',
    })
    setEditId(row.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      funcionario_nome: form.funcionario_nome,
      associacao: form.associacao || null,
      unidade: form.unidade || null,
      comunidade_id: form.comunidade_id || null,
    }
    if (editId) {
      await supabase.from('funcionarios_associacao').update(payload).eq('id', editId)
    } else {
      await supabase.from('funcionarios_associacao').insert(payload)
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('funcionarios_associacao').delete().eq('id', id)
    load()
  }

  const assocsFiltradas = associacoes.filter(a =>
    !form.comunidade_id || a.comunidade_id === form.comunidade_id
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-laranja-light rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Funcionários da Associação</h1>
            <p className="text-gray-400 text-sm">
              {isUnidade ? `Funcionários vinculados à ${unidadeSession.unidadeNome}` : 'Funcionários vinculados às associações'}
            </p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Novo Funcionário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
        ) : (
          <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Nome *</label>
              <input value={form.funcionario_nome ?? ''} onChange={e => setForm(f => ({ ...f, funcionario_nome: e.target.value }))}
                required className={inputCls} placeholder="Nome completo" />
            </div>

            {/* Unidade — fixo se for sessão de unidade */}
            <div>
              <label className={labelCls}>Unidade</label>
              {isUnidade ? (
                <div className={`${inputCls} bg-gray-50 text-petroleum/60`}>{unidadeSession.unidadeNome}</div>
              ) : (
                <select value={form.unidade ?? ''} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} className={inputCls}>
                  <option value="">— Sem unidade —</option>
                  {unidades.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                </select>
              )}
            </div>

            {/* Comunidade / Região */}
            <div>
              <label className={labelCls}>Região / Comunidade</label>
              <select value={form.comunidade_id} onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value, associacao: '' }))} className={inputCls}>
                <option value="">— Selecione a região —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {/* Associação filtrada pela região */}
            <div>
              <label className={labelCls}>Associação</label>
              <select value={form.associacao ?? ''} onChange={e => setForm(f => ({ ...f, associacao: e.target.value }))} className={inputCls}>
                <option value="">— Selecione a associação —</option>
                {assocsFiltradas.map(a => (
                  <option key={a.id} value={a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}>
                    {a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
