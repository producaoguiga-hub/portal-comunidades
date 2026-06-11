import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus } from 'lucide-react'

const empty = { funcionario_nome: '', associacao: '', unidade: '', comunidade_id: '' }
const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const columns = [
  { key: 'funcionario_nome', label: 'Nome' },
  { key: 'associacao', label: 'Associação' },
  { key: 'unidade', label: 'Unidade' },
  { key: 'comunidades', label: 'Comunidade', render: v => v?.nome ?? '—' },
]

export default function Funcionarios() {
  const [data, setData] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [funcRes, comRes] = await Promise.all([
      supabase.from('funcionarios_associacao').select('*, comunidades(nome)').order('created_at', { ascending: false }),
      supabase.from('comunidades').select('id, nome').order('nome'),
    ])
    setData(funcRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = (row) => {
    setForm({ ...row, comunidade_id: row.comunidade_id ?? '' })
    setEditId(row.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { funcionario_nome, associacao, unidade, comunidade_id } = form
    const payload = { funcionario_nome, associacao, unidade, comunidade_id: comunidade_id || null }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-laranja-light rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Funcionários da Associação</h1>
            <p className="text-gray-400 text-sm">Funcionários vinculados às associações</p>
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
            {[
              { key: 'funcionario_nome', label: 'Nome', required: true },
              { key: 'associacao', label: 'Associação' },
              { key: 'unidade', label: 'Unidade' },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required={required} className={inputCls} />
              </div>
            ))}
            <div>
              <label className={labelCls}>Comunidade</label>
              <select value={form.comunidade_id} onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value }))} className={inputCls}>
                <option value="">— Sem comunidade —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
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
