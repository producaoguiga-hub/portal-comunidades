import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { Plus, Download, CheckCircle, XCircle, Clock } from 'lucide-react'

const TIPOS = ['Financeiro', 'Material', 'Infraestrutura', 'Saúde', 'Educação', 'Evento', 'Outro']

const statusConfig = {
  pendente:  { label: 'Pendente',  cls: 'bg-laranja/15 text-laranja',    Icon: Clock        },
  aprovado:  { label: 'Aprovado',  cls: 'bg-verde/30 text-petroleum',    Icon: CheckCircle  },
  rejeitado: { label: 'Rejeitado', cls: 'bg-red-100 text-red-500',       Icon: XCircle      },
}

const empty = { titulo: '', tipo_apoio: '', descricao: '', valor_solicitado: '', data: '', comunidade_id: '' }
const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

function StatusBadge({ status }) {
  const cfg = statusConfig[status] ?? statusConfig.pendente
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  )
}

export default function AcoesSociais() {
  const { role, liderSession } = useAuth()
  const isLider = !!liderSession

  const [data, setData] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [oficio, setOficio] = useState(null)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  const load = async () => {
    setLoading(true)
    let query = supabase
      .from('acoes_sociais')
      .select('*, comunidades(nome)')
      .order('created_at', { ascending: false })

    if (isLider) query = query.eq('comunidade_id', liderSession.comunidadeId)

    const [acaoRes, comRes] = await Promise.all([
      query,
      supabase.from('comunidades').select('id, nome').order('nome'),
    ])
    setData(acaoRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ ...empty, comunidade_id: isLider ? liderSession.comunidadeId : '' })
    setOficio(null)
    setEditId(null)
    setModal(true)
  }

  const openEdit = (row) => {
    setForm({ ...row, comunidade_id: row.comunidade_id ?? '', valor_solicitado: row.valor_solicitado ?? '' })
    setOficio(null)
    setEditId(row.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    let oficio_url = form.oficio_url ?? null

    if (oficio) {
      const path = `${Date.now()}-${oficio.name}`
      const { error: upErr } = await supabase.storage.from('oficios').upload(path, oficio)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('oficios').getPublicUrl(path)
        oficio_url = publicUrl
      }
    }

    const { titulo, tipo_apoio, descricao, valor_solicitado, data: dataVal, comunidade_id } = form
    const payload = {
      titulo,
      tipo_apoio: tipo_apoio || null,
      descricao: descricao || null,
      valor_solicitado: valor_solicitado ? Number(valor_solicitado) : null,
      data: dataVal || null,
      comunidade_id: comunidade_id || null,
      oficio_url,
      ...(editId ? {} : { status: 'pendente' }),
    }

    if (editId) {
      await supabase.from('acoes_sociais').update(payload).eq('id', editId)
    } else {
      await supabase.from('acoes_sociais').insert(payload)
    }

    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('acoes_sociais').delete().eq('id', id)
    load()
  }

  const changeStatus = async (id, status) => {
    setUpdatingStatus(id)
    await supabase.from('acoes_sociais').update({ status }).eq('id', id)
    setUpdatingStatus(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-laranja rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Ações Sociais</h1>
            <p className="text-gray-400 text-sm">
              {isLider ? 'Envie e acompanhe suas solicitações' : 'Solicitações das comunidades'}
            </p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Nova Solicitação
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="py-14 text-center text-cinza text-sm">Nenhuma solicitação cadastrada.</div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-petroleum/5 border-b text-xs font-semibold text-petroleum/70 uppercase tracking-wider">
              <span className="col-span-3">Título</span>
              <span className="col-span-2">Tipo</span>
              <span className="col-span-2">{isLider ? 'Data' : 'Comunidade'}</span>
              <span className="col-span-1">Valor</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2 text-right">Ações</span>
            </div>

            {data.map(row => (
              <div key={row.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b last:border-0 hover:bg-verde/5 transition-colors">
                <div className="col-span-3">
                  <p className="text-sm font-medium text-petroleum truncate">{row.titulo ?? '—'}</p>
                  {row.descricao && <p className="text-xs text-gray-400 truncate">{row.descricao}</p>}
                </div>
                <span className="col-span-2 text-xs text-gray-500">{row.tipo_apoio ?? '—'}</span>
                <span className="col-span-2 text-xs text-gray-500 truncate">
                  {isLider
                    ? (row.data ? new Date(row.data).toLocaleDateString('pt-BR') : '—')
                    : (row.comunidades?.nome ?? '—')}
                </span>
                <span className="col-span-1 text-xs text-gray-500">
                  {row.valor_solicitado ? `R$ ${Number(row.valor_solicitado).toLocaleString('pt-BR')}` : '—'}
                </span>
                <div className="col-span-2">
                  <StatusBadge status={row.status} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {row.oficio_url && (
                    <a href={row.oficio_url} target="_blank" rel="noreferrer"
                      title="Ver Ofício"
                      className="p-1.5 text-oceano hover:bg-oceano/10 rounded-lg transition-colors">
                      <Download size={14} />
                    </a>
                  )}
                  {!isLider && row.status !== 'aprovado' && (
                    <button onClick={() => changeStatus(row.id, 'aprovado')} disabled={updatingStatus === row.id}
                      title="Aprovar" className="p-1.5 text-verde hover:bg-verde/20 rounded-lg transition-colors disabled:opacity-40">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {!isLider && row.status !== 'rejeitado' && (
                    <button onClick={() => changeStatus(row.id, 'rejeitado')} disabled={updatingStatus === row.id}
                      title="Rejeitar" className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                      <XCircle size={14} />
                    </button>
                  )}
                  {(isLider && row.status === 'pendente') || role === 'admin' ? (
                    <button onClick={() => openEdit(row)}
                      className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors">
                      Editar
                    </button>
                  ) : null}
                  {role === 'admin' && (
                    <button onClick={() => handleDelete(row.id)}
                      className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors">
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Solicitação' : 'Nova Solicitação'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Título *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                required className={inputCls} placeholder="Ex: Solicitação de reforma da quadra" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de Apoio</label>
                <select value={form.tipo_apoio} onChange={e => setForm(f => ({ ...f, tipo_apoio: e.target.value }))} className={inputCls}>
                  <option value="">— Selecione —</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Valor Solicitado (R$)</label>
                <input type="number" min="0" step="0.01" value={form.valor_solicitado}
                  onChange={e => setForm(f => ({ ...f, valor_solicitado: e.target.value }))}
                  className={inputCls} placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`} placeholder="Detalhe a solicitação..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data</label>
                <input type="date" value={form.data ?? ''} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={inputCls} />
              </div>
              {!isLider && (
                <div>
                  <label className={labelCls}>Comunidade</label>
                  <select value={form.comunidade_id} onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value }))} className={inputCls}>
                    <option value="">— Selecione —</option>
                    {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Upload do Ofício (PDF ou imagem)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setOficio(e.target.files[0] ?? null)}
                className="w-full text-sm text-petroleum/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-oceano/15 file:text-oceano hover:file:bg-oceano/25 transition-colors cursor-pointer" />
              {form.oficio_url && !oficio && (
                <a href={form.oficio_url} target="_blank" rel="noreferrer"
                  className="text-xs text-oceano hover:underline mt-1 inline-flex items-center gap-1">
                  <Download size={11} /> Ver ofício atual
                </a>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
