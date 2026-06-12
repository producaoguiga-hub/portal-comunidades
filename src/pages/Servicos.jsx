import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { Plus, CheckCircle, Clock, XCircle, Wrench, ImagePlus, X } from 'lucide-react'
import WhatsAppIcon from '../components/WhatsAppIcon'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const statusConfig = {
  pendente:  { label: 'Pendente',  cls: 'bg-laranja/15 text-laranja',   Icon: Clock       },
  aprovado:  { label: 'Aprovado',  cls: 'bg-verde/30 text-petroleum',   Icon: CheckCircle },
  concluido: { label: 'Concluído', cls: 'bg-oceano/15 text-oceano',     Icon: CheckCircle },
  cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-500',      Icon: XCircle     },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] ?? statusConfig.pendente
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  )
}

const emptyServico = { tipo: '', descricao: '', contato: '', disponivel: true, associacao_id: '', foto_url: null }
const emptySolicitacao = { descricao: '', solicitante: '' }

export default function Servicos() {
  const { role, liderSession } = useAuth()
  const isLider = !!liderSession

  const [servicos, setServicos] = useState([])
  const [solicitacoes, setSolicitacoes] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [associacoes, setAssociacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('catalogo')
  const [filtroComId, setFiltroComId] = useState('')

  const [foto, setFoto] = useState(null)
  const [modalServico, setModalServico] = useState(false)
  const [modalSolicitar, setModalSolicitar] = useState(false)
  const [servicoSelecionado, setServicoSelecionado] = useState(null)
  const [form, setForm] = useState(emptyServico)
  const [formSol, setFormSol] = useState(emptySolicitacao)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    let q = supabase.from('servicos_comunidade').select('*, comunidades(nome), associacoes(id, nome, sigla)').order('created_at', { ascending: false })
    if (isLider) q = q.eq('comunidade_id', liderSession.comunidadeId)

    let assocQ = supabase.from('associacoes').select('id, nome, sigla').order('nome')
    if (isLider) assocQ = assocQ.eq('comunidade_id', liderSession.comunidadeId)

    const [svcRes, solRes, comRes, assocRes] = await Promise.all([
      q,
      isLider ? Promise.resolve({ data: [] }) : supabase.from('solicitacoes_servico').select('*, servicos_comunidade(tipo, comunidades(nome))').order('created_at', { ascending: false }),
      supabase.from('comunidades').select('id, nome').order('nome'),
      assocQ,
    ])
    setServicos(svcRes.data ?? [])
    setSolicitacoes(solRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setAssociacoes(assocRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNovoServico = () => { setForm(emptyServico); setFoto(null); setEditId(null); setModalServico(true) }
  const openEditServico = (row) => {
    setForm({ tipo: row.tipo, descricao: row.descricao ?? '', contato: row.contato ?? '', disponivel: row.disponivel ?? true, associacao_id: row.associacao_id ?? '', foto_url: row.foto_url ?? null })
    setFoto(null)
    setEditId(row.id)
    setModalServico(true)
  }

  const handleSaveServico = async (e) => {
    e.preventDefault()
    setSaving(true)

    let foto_url = form.foto_url ?? null
    if (foto) {
      const ext = foto.name.split('.').pop()
      const path = `${Date.now()}_${form.tipo.replace(/\s+/g, '_')}.${ext}`
      const { error: upErr } = await supabase.storage.from('fotos-servicos').upload(path, foto, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('fotos-servicos').getPublicUrl(path)
        foto_url = urlData.publicUrl
      }
    }

    const payload = {
      tipo: form.tipo,
      descricao: form.descricao || null,
      contato: form.contato || null,
      disponivel: form.disponivel,
      associacao_id: form.associacao_id || null,
      foto_url,
      comunidade_id: isLider ? liderSession.comunidadeId : null,
    }
    if (editId) {
      await supabase.from('servicos_comunidade').update(payload).eq('id', editId)
    } else {
      await supabase.from('servicos_comunidade').insert(payload)
    }
    setSaving(false)
    setModalServico(false)
    load()
  }

  const handleDeleteServico = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('servicos_comunidade').delete().eq('id', id)
    load()
  }

  const openSolicitar = (servico) => { setServicoSelecionado(servico); setFormSol(emptySolicitacao); setModalSolicitar(true) }

  const handleSolicitar = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('solicitacoes_servico').insert({
      servico_id: servicoSelecionado.id,
      descricao: formSol.descricao || null,
      solicitante: formSol.solicitante || null,
      status: 'pendente',
    })
    setSaving(false)
    setModalSolicitar(false)
    load()
  }

  const changeStatus = async (id, status) => {
    await supabase.from('solicitacoes_servico').update({ status }).eq('id', id)
    load()
  }

  const servicosFiltrados = filtroComId
    ? servicos.filter(s => s.comunidade_id === filtroComId)
    : servicos

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Serviços Comunitários</h1>
            <p className="text-gray-400 text-sm">
              {isLider ? 'Gerencie os serviços disponíveis na sua comunidade' : 'Catálogo de serviços e solicitações'}
            </p>
          </div>
        </div>
        {isLider && (
          <button onClick={openNovoServico} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> Novo Serviço
          </button>
        )}
      </div>

      {/* Tabs — só para gestor/admin */}
      {!isLider && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { id: 'catalogo', label: 'Catálogo de Serviços' },
            { id: 'solicitacoes', label: `Solicitações (${solicitacoes.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-petroleum text-verde shadow-sm' : 'text-gray-400 hover:text-petroleum'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Filtro por comunidade — gestor/admin */}
      {!isLider && tab === 'catalogo' && (
        <div className="mb-4">
          <select value={filtroComId} onChange={e => setFiltroComId(e.target.value)}
            className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano w-64">
            <option value="">Todas as comunidades</option>
            {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
      ) : (

        /* ── CATÁLOGO ── */
        (tab === 'catalogo' || isLider) ? (
          servicosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-14 text-center text-cinza text-sm">
              {isLider ? 'Nenhum serviço cadastrado ainda. Adicione o primeiro!' : 'Nenhum serviço encontrado.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {servicosFiltrados.map(s => (
                <div key={s.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden ${!s.disponivel ? 'opacity-60' : ''}`}>
                  {s.foto_url ? (
                    <div className="h-36 overflow-hidden">
                      <img src={s.foto_url} alt={s.tipo} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-16 bg-oceano/10 flex items-center justify-center">
                      <Wrench size={22} className="text-oceano/40" />
                    </div>
                  )}

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-petroleum text-sm">{s.tipo}</p>
                        {!isLider && <p className="text-xs text-gray-400">{s.comunidades?.nome ?? '—'}</p>}
                        {s.associacoes && <p className="text-xs text-oceano font-medium">{s.associacoes.sigla ?? s.associacoes.nome}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${s.disponivel ? 'bg-verde/30 text-petroleum' : 'bg-cinza-light text-gray-400'}`}>
                        {s.disponivel ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>

                  {s.descricao && <p className="text-xs text-gray-500 leading-relaxed">{s.descricao}</p>}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                    {s.contato ? (
                      <a href={`https://wa.me/55${s.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600 font-medium transition-colors">
                        <WhatsAppIcon size={13} /> {s.contato}
                      </a>
                    ) : <span />}

                    {isLider ? (
                      <div className="flex gap-1">
                        <button onClick={() => openEditServico(s)}
                          className="text-xs text-oceano hover:text-petroleum px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors font-medium">
                          Editar
                        </button>
                        <button onClick={() => handleDeleteServico(s.id)}
                          className="text-xs text-laranja hover:text-petroleum px-2 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors font-medium">
                          Excluir
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => openSolicitar(s)} disabled={!s.disponivel}
                        className="text-xs bg-verde hover:bg-verde-light disabled:opacity-40 text-petroleum px-3 py-1.5 rounded-lg font-semibold transition-colors">
                        Solicitar
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )

        ) : (

          /* ── SOLICITAÇÕES ── */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {solicitacoes.length === 0 ? (
              <div className="py-14 text-center text-cinza text-sm">Nenhuma solicitação ainda.</div>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-petroleum/5 border-b text-xs font-semibold text-petroleum/70 uppercase tracking-wider">
                  <span className="col-span-3">Serviço</span>
                  <span className="col-span-2">Comunidade</span>
                  <span className="col-span-3">Descrição</span>
                  <span className="col-span-2">Solicitante</span>
                  <span className="col-span-2 text-right">Status</span>
                </div>
                {solicitacoes.map(sol => (
                  <div key={sol.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b last:border-0 hover:bg-verde/5 transition-colors">
                    <span className="col-span-3 text-sm font-medium text-petroleum truncate">{sol.servicos_comunidade?.tipo ?? '—'}</span>
                    <span className="col-span-2 text-xs text-gray-500 truncate">{sol.servicos_comunidade?.comunidades?.nome ?? '—'}</span>
                    <span className="col-span-3 text-xs text-gray-500 truncate">{sol.descricao ?? '—'}</span>
                    <span className="col-span-2 text-xs text-gray-500 truncate">{sol.solicitante ?? '—'}</span>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <StatusBadge status={sol.status} />
                      <select value={sol.status} onChange={e => changeStatus(sol.id, e.target.value)}
                        className="text-xs border border-cinza rounded px-1.5 py-1 text-petroleum ml-1 focus:outline-none focus:ring-1 focus:ring-oceano">
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Modal — Novo/Editar Serviço */}
      {modalServico && (
        <Modal title={editId ? 'Editar Serviço' : 'Novo Serviço'} onClose={() => setModalServico(false)}>
          <form onSubmit={handleSaveServico} className="space-y-4">
            <div>
              <label className={labelCls}>Tipo de Serviço *</label>
              <input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                required className={inputCls} placeholder="Ex: Pintura, Solda, Mecânica..." />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`} placeholder="Detalhes sobre o serviço..." />
            </div>
            <div>
              <label className={labelCls}>Contato / WhatsApp</label>
              <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))}
                className={inputCls} placeholder="(75) 9 9999-9999" />
            </div>
            <div>
              <label className={labelCls}>Associação</label>
              <select value={form.associacao_id} onChange={e => setForm(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                <option value="">— Sem associação —</option>
                {associacoes.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Foto do Serviço</label>
              {form.foto_url && !foto && (
                <div className="relative mb-2 w-full h-32 rounded-lg overflow-hidden">
                  <img src={form.foto_url} alt="Foto atual" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, foto_url: null }))}
                    className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-white text-laranja rounded-full p-0.5 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              )}
              {foto && (
                <div className="relative mb-2 w-full h-32 rounded-lg overflow-hidden">
                  <img src={URL.createObjectURL(foto)} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setFoto(null)}
                    className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-white text-laranja rounded-full p-0.5 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              )}
              {!foto && !form.foto_url && (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-cinza rounded-lg cursor-pointer hover:border-oceano hover:bg-oceano/5 transition-colors">
                  <ImagePlus size={20} className="text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">Clique para adicionar uma foto</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => setFoto(e.target.files[0] || null)} />
                </label>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="disponivel" checked={form.disponivel}
                onChange={e => setForm(f => ({ ...f, disponivel: e.target.checked }))}
                className="w-4 h-4 accent-verde rounded" />
              <label htmlFor="disponivel" className="text-sm text-petroleum font-medium cursor-pointer">Serviço disponível</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalServico(false)}
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

      {/* Modal — Solicitar Serviço */}
      {modalSolicitar && servicoSelecionado && (
        <Modal title={`Solicitar: ${servicoSelecionado.tipo}`} onClose={() => setModalSolicitar(false)}>
          <form onSubmit={handleSolicitar} className="space-y-4">
            <div className="bg-oceano/10 rounded-lg px-4 py-3 text-sm text-petroleum">
              <p className="font-semibold">{servicoSelecionado.tipo}</p>
              <p className="text-xs text-gray-500 mt-0.5">{servicoSelecionado.comunidades?.nome}</p>
            </div>
            <div>
              <label className={labelCls}>Solicitante</label>
              <input value={formSol.solicitante} onChange={e => setFormSol(f => ({ ...f, solicitante: e.target.value }))}
                className={inputCls} placeholder="Nome ou setor" />
            </div>
            <div>
              <label className={labelCls}>Descrição da Solicitação</label>
              <textarea value={formSol.descricao} onChange={e => setFormSol(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`} placeholder="Descreva o que precisa..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalSolicitar(false)}
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
