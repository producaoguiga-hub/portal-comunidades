import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus, Eye, EyeOff } from 'lucide-react'

const empty = { nome: '', pin: '', lat: '', lng: '' }
const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const columns = [
  { key: 'nome', label: 'Nome da Comunidade' },
  { key: 'pin', label: 'PIN', render: v => <span className="font-mono font-bold text-petroleum tracking-widest">{v}</span> },
  {
    key: 'lat', label: 'Mapa', render: (_v, row) => row.lat != null && row.lng != null
      ? <span className="text-xs font-semibold text-verde-light bg-verde/10 px-2 py-0.5 rounded-full">No mapa</span>
      : <span className="text-xs font-semibold text-laranja bg-laranja/10 px-2 py-0.5 rounded-full">Sem coordenadas</span>
  },
]

export default function Comunidades() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data: rows } = await supabase.from('comunidades').select('*').order('nome')
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditId(null); setShowPin(false); setModal(true) }
  const openEdit = (row) => {
    setForm({ ...row, lat: row.lat ?? '', lng: row.lng ?? '' })
    setEditId(row.id)
    setShowPin(false)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { nome, pin } = form
    const lat = form.lat === '' ? null : Number(form.lat)
    const lng = form.lng === '' ? null : Number(form.lng)
    if (editId) {
      await supabase.from('comunidades').update({ nome, pin, lat, lng }).eq('id', editId)
    } else {
      await supabase.from('comunidades').insert({ nome, pin, lat, lng })
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir comunidade? Líderes vinculados perderão o acesso.')) return
    await supabase.from('comunidades').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Comunidades</h1>
            <p className="text-gray-400 text-sm">Gerenciar comunidades e PINs de acesso</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Nova Comunidade
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
        <Modal title={editId ? 'Editar Comunidade' : 'Nova Comunidade'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Nome da Comunidade</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                required
                className={inputCls}
                placeholder="Ex: Vila Nova"
              />
            </div>
            <div>
              <label className={labelCls}>PIN de Acesso</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                  required
                  maxLength={10}
                  className={`${inputCls} pr-10`}
                  placeholder="Ex: 1234"
                />
                <button type="button" onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza hover:text-petroleum transition-colors">
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Entre 4 e 10 caracteres. Compartilhe com os líderes da comunidade.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                  className={inputCls}
                  placeholder="Ex: -12.16"
                />
              </div>
              <div>
                <label className={labelCls}>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                  className={inputCls}
                  placeholder="Ex: -38.4"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Sem essas coordenadas a comunidade não aparece no Mapa. Encontre lat/lng abrindo o local no Google Maps, clicando com o botão direito e copiando as coordenadas.
            </p>
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
