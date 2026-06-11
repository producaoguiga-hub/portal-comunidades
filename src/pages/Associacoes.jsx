import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus } from 'lucide-react'

const empty = { nome: '', sigla: '', representante_legal: '', telefone: '' }
const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const columns = [
  { key: 'nome', label: 'Associação' },
  { key: 'sigla', label: 'Sigla', render: v => v ? <span className="px-2 py-0.5 bg-oceano/15 text-oceano rounded font-mono text-xs">{v}</span> : '—' },
  { key: 'representante_legal', label: 'Representante Legal' },
  { key: 'telefone', label: 'Telefone / WhatsApp' },
]

export default function Associacoes() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('associacoes').select('*').order('nome')
    setData(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { nome, sigla, representante_legal, telefone } = form
    const payload = { nome, sigla: sigla || null, representante_legal: representante_legal || null, telefone: telefone || null }
    if (editId) {
      await supabase.from('associacoes').update(payload).eq('id', editId)
    } else {
      await supabase.from('associacoes').insert(payload)
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('associacoes').delete().eq('id', id)
    load()
  }

  const filtered = data.filter(a =>
    a.nome?.toLowerCase().includes(search.toLowerCase()) ||
    a.sigla?.toLowerCase().includes(search.toLowerCase()) ||
    a.representante_legal?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Associações</h1>
            <p className="text-gray-400 text-sm">Associações comunitárias parceiras</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Nova Associação
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, sigla ou representante..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
        ) : (
          <Table columns={columns} data={filtered} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Associação' : 'Nova Associação'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Nome da Associação *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                required className={inputCls} placeholder="Nome completo" />
            </div>
            <div>
              <label className={labelCls}>Sigla</label>
              <input value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))}
                className={inputCls} placeholder="Ex: ATDEA" maxLength={20} />
            </div>
            <div>
              <label className={labelCls}>Representante Legal</label>
              <input value={form.representante_legal} onChange={e => setForm(f => ({ ...f, representante_legal: e.target.value }))}
                className={inputCls} placeholder="Nome do representante" />
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                className={inputCls} placeholder="(75) 9 9999-9999" />
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
