import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus, Layers } from 'lucide-react'

const empty = { nome: '', descricao: '' }
const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const columns = [
  { key: 'nome', label: 'Nome da Unidade' },
  { key: 'descricao', label: 'Descrição', render: v => v ?? '—' },
]

export default function Unidades() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data: rows } = await supabase.from('unidades').select('*').order('nome')
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = (row) => { setForm({ nome: row.nome, descricao: row.descricao ?? '' }); setEditId(row.id); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { nome, descricao } = form
    const payload = { nome, descricao: descricao || null }
    if (editId) {
      await supabase.from('unidades').update(payload).eq('id', editId)
    } else {
      await supabase.from('unidades').insert(payload)
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir unidade? Funcionários e vagas vinculados perderão esta referência.')) return
    await supabase.from('unidades').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Unidades</h1>
            <p className="text-gray-400 text-sm">Unidades internas para vincular funcionários e vagas</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Nova Unidade
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-14 text-center text-cinza text-sm flex flex-col items-center gap-3">
            <Layers size={32} className="text-gray-200" />
            <p>Nenhuma unidade cadastrada ainda.</p>
          </div>
        ) : (
          <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Unidade' : 'Nova Unidade'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Nome da Unidade *</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                required
                className={inputCls}
                placeholder="Ex: Equipe de Pintura, Manutenção..."
              />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Detalhe a função desta unidade..."
              />
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
