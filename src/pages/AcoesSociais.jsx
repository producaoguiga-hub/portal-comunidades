import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { Plus, Download, CheckCircle, XCircle, Clock, Building2, MapPin, CalendarDays, Banknote } from 'lucide-react'

const TIPOS = ['Financeiro', 'Material', 'Infraestrutura', 'Saúde', 'Educação', 'Evento', 'Outro']

const statusConfig = {
  pendente:  { label: 'Pendente',  cls: 'bg-laranja/15 text-laranja',    Icon: Clock        },
  aprovado:  { label: 'Aprovado',  cls: 'bg-verde/30 text-petroleum',    Icon: CheckCircle  },
  rejeitado: { label: 'Rejeitado', cls: 'bg-red-100 text-red-500',       Icon: XCircle      },
}

const empty = { titulo: '', tipo_apoio: '', descricao: '', valor_solicitado: '', data: '', comunidade_id: '', associacao_id: '' }
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
  const [associacoes, setAssociacoes] = useState([])
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
      .select('*, comunidades(nome), associacoes(nome, sigla)')
      .order('created_at', { ascending: false })

    if (isLider) query = query.eq('comunidade_id', liderSession.comunidadeId)

    const [acaoRes, comRes, assocRes] = await Promise.all([
      query,
      supabase.from('comunidades').select('id, nome').order('nome'),
      supabase.from('associacoes').select('id, nome, sigla, comunidade_id').order('nome'),
    ])
    setData(acaoRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setAssociacoes(assocRes.data ?? [])
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
    setForm({ ...row, comunidade_id: row.comunidade_id ?? '', valor_solicitado: row.valor_solicitado ?? '', associacao_id: row.associacao_id ?? '' })
    setOficio(null)
    setEditId(row.id)
    setModal(true)
  }

  const assocsDaComSelecionada = associacoes.filter(a =>
    a.comunidade_id === (isLider ? liderSession.comunidadeId : form.comunidade_id)
  )

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

    const { titulo, tipo_apoio, descricao, valor_solicitado, data: dataVal, comunidade_id, associacao_id } = form
    const payload = {
      titulo,
      tipo_apoio: tipo_apoio || null,
      descricao: descricao || null,
      valor_solicitado: valor_solicitado ? Number(valor_solicitado) : null,
      data: dataVal || null,
      comunidade_id: comunidade_id || null,
      associacao_id: associacao_id || null,
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

      {loading ? (
        <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
      ) : data.length === 0 ? (
        <div className="py-14 text-center text-cinza text-sm">Nenhuma solicitação cadastrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map(row => (
            <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">

              {/* Topo: status + data */}
              <div className="flex items-center justify-between">
                <StatusBadge status={row.status} />
                {row.data && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays size={11} />
                    {new Date(row.data).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Título + tipo */}
              <div>
                <p className="font-semibold text-petroleum leading-tight">{row.titulo ?? '—'}</p>
                {row.tipo_apoio && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-petroleum/10 text-petroleum rounded text-xs font-semibold">{row.tipo_apoio}</span>
                )}
              </div>

              {/* Associação + comunidade */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Building2 size={11} className={`shrink-0 ${row.associacoes ? 'text-oceano' : 'text-gray-300'}`} />
                  <span className={row.associacoes ? 'text-oceano' : 'text-gray-300'}>
                    {row.associacoes ? (row.associacoes.sigla ?? row.associacoes.nome) : 'Sem associação'}
                  </span>
                </div>
                {!isLider && row.comunidades && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin size={11} className="shrink-0" />
                    {row.comunidades.nome}
                  </div>
                )}
              </div>

              {/* Descrição */}
              {row.descricao && (
                <p className="text-xs text-gray-400 line-clamp-2">{row.descricao}</p>
              )}

              {/* Rodapé: valor + ações */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-petroleum">
                  <Banknote size={14} className="text-verde shrink-0" />
                  {row.valor_solicitado ? `R$ ${Number(row.valor_solicitado).toLocaleString('pt-BR')}` : '—'}
                </div>
                <div className="flex items-center gap-1">
                  {row.oficio_url && (
                    <a href={row.oficio_url} target="_blank" rel="noreferrer" title="Ver Ofício"
                      className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-oceano/10 transition-colors">
                      <Download size={12} /> Ofício
                    </a>
                  )}
                  {!isLider && row.status !== 'aprovado' && (
                    <button onClick={() => changeStatus(row.id, 'aprovado')} disabled={updatingStatus === row.id}
                      title="Aprovar" className="p-1.5 text-verde hover:bg-verde/20 rounded-lg transition-colors disabled:opacity-40">
                      <CheckCircle size={15} />
                    </button>
                  )}
                  {!isLider && row.status !== 'rejeitado' && (
                    <button onClick={() => changeStatus(row.id, 'rejeitado')} disabled={updatingStatus === row.id}
                      title="Rejeitar" className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                      <XCircle size={15} />
                    </button>
                  )}
                  {((isLider && row.status === 'pendente') || role === 'admin') && (
                    <button onClick={() => openEdit(row)}
                      className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-oceano/10 transition-colors">
                      Editar
                    </button>
                  )}
                  {role === 'admin' && (
                    <button onClick={() => handleDelete(row.id)}
                      className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-laranja/10 transition-colors">
                      Excluir
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

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
                  <select value={form.comunidade_id} onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value, associacao_id: '' }))} className={inputCls}>
                    <option value="">— Selecione —</option>
                    {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Associação</label>
              <select value={form.associacao_id ?? ''} onChange={e => setForm(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                <option value="">— Selecione a associação —</option>
                {assocsDaComSelecionada.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
              </select>
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
