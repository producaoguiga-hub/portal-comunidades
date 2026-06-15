import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus, X } from 'lucide-react'
import WhatsAppIcon from '../components/WhatsAppIcon'

const empty = { nome: '', sigla: '', representante_legal: '', telefone: '', comunidade_id: '' }
const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const columns = [
  { key: 'nome', label: 'Associação' },
  { key: 'sigla', label: 'Sigla', render: v => v ? <span className="px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{v}</span> : '—' },
  { key: 'representante_legal', label: 'Representante(s) Legal', render: v => v ? (
    <div className="flex flex-col gap-0.5">
      {v.split(' | ').map((r, i) => <span key={i}>{r}</span>)}
    </div>
  ) : '—' },
  {
    key: 'telefone', label: 'Telefone / WhatsApp',
    render: (v) => {
      if (!v) return '—'
      const digits = v.replace(/\D/g, '')
      const url = `https://wa.me/55${digits}`
      return (
        <div className="flex items-center gap-2">
          <span>{v}</span>
          <a href={url} target="_blank" rel="noreferrer" title="Abrir no WhatsApp"
            className="text-green-500 hover:text-green-600 transition-colors shrink-0">
            <WhatsAppIcon size={15} />
          </a>
        </div>
      )
    }
  },
  { key: 'comunidades', label: 'Comunidade', render: v => v?.nome ?? '—' },
]

export default function Associacoes() {
  const [data, setData] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [representantes, setRepresentantes] = useState([''])

  const load = async () => {
    setLoading(true)
    const [assocRes, comRes] = await Promise.all([
      supabase.from('associacoes').select('*, comunidades(nome)').order('nome'),
      supabase.from('comunidades').select('id, nome').order('nome'),
    ])
    setData(assocRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setRepresentantes(['']); setEditId(null); setModal(true) }
  const openEdit = (row) => {
    setForm({ ...row, comunidade_id: row.comunidade_id ?? '' })
    setRepresentantes(row.representante_legal ? row.representante_legal.split(' | ') : [''])
    setEditId(row.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { nome, sigla, telefone, comunidade_id } = form
    const repFinal = representantes.filter(r => r.trim()).join(' | ') || null
    const payload = { nome, sigla: sigla || null, representante_legal: repFinal, telefone: telefone || null, comunidade_id: comunidade_id || null }
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
              <label className={labelCls}>Representante(s) Legal</label>
              <div className="space-y-2">
                {representantes.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={r} onChange={e => setRepresentantes(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                      className={inputCls} placeholder="Nome do representante" />
                    {representantes.length > 1 && (
                      <button type="button" onClick={() => setRepresentantes(prev => prev.filter((_, j) => j !== i))}
                        className="text-laranja hover:text-petroleum shrink-0 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setRepresentantes(prev => [...prev, ''])}
                  className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium mt-1 transition-colors">
                  <Plus size={13} /> Adicionar representante
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                className={inputCls} placeholder="(75) 9 9999-9999" />
            </div>
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
