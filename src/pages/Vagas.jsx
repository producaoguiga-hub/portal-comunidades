import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus, Users, MessageCircle } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const statusBadge = {
  aberta:       'bg-verde text-petroleum',
  em_andamento: 'bg-laranja/20 text-laranja',
  fechada:      'bg-cinza-light text-gray-500',
}

const emptyVaga    = { titulo: '', unidade: '', funcao: '', status: 'aberta', comunidade_id: '' }
const emptyTalento = { nome: '', funcao: '', contato: '', observacoes: '' }

export default function Vagas() {
  const { role, liderSession } = useAuth()
  const isLider = !!liderSession

  const [tab, setTab] = useState(isLider ? 'banco' : 'vagas')

  // vagas
  const [vagas, setVagas] = useState([])
  const [loadingVagas, setLoadingVagas] = useState(true)
  const [modalVaga, setModalVaga] = useState(false)
  const [formVaga, setFormVaga] = useState(emptyVaga)
  const [editVagaId, setEditVagaId] = useState(null)
  const [savingVaga, setSavingVaga] = useState(false)

  // talentos
  const [talentos, setTalentos] = useState([])
  const [loadingTalentos, setLoadingTalentos] = useState(true)
  const [modalTalento, setModalTalento] = useState(false)
  const [formTalento, setFormTalento] = useState(emptyTalento)
  const [editTalentoId, setEditTalentoId] = useState(null)
  const [savingTalento, setSavingTalento] = useState(false)

  // modal "ver talentos" de uma vaga
  const [modalMatch, setModalMatch] = useState(false)
  const [vagaSelecionada, setVagaSelecionada] = useState(null)
  const [talentosFiltro, setTalentosFiltro] = useState([])

  // filtros banco de talentos
  const [filtroFuncao, setFiltroFuncao] = useState('')
  const [filtroComId, setFiltroComId] = useState('')

  const [comunidades, setComunidades] = useState([])

  const loadVagas = async () => {
    setLoadingVagas(true)
    const { data } = await supabase.from('vagas').select('*, comunidades(nome)').order('created_at', { ascending: false })
    setVagas(data ?? [])
    setLoadingVagas(false)
  }

  const loadTalentos = async () => {
    setLoadingTalentos(true)
    let q = supabase.from('banco_talentos').select('*, comunidades(nome)').order('created_at', { ascending: false })
    if (isLider) q = q.eq('comunidade_id', liderSession.comunidadeId)
    const { data } = await q
    setTalentos(data ?? [])
    setLoadingTalentos(false)
  }

  const loadComunidades = async () => {
    const { data } = await supabase.from('comunidades').select('id, nome').order('nome')
    setComunidades(data ?? [])
  }

  useEffect(() => {
    loadComunidades()
    loadVagas()
    loadTalentos()
  }, [])

  // ── VAGAS ──
  const openNovaVaga    = () => { setFormVaga(emptyVaga); setEditVagaId(null); setModalVaga(true) }
  const openEditVaga    = (row) => { setFormVaga({ ...row, comunidade_id: row.comunidade_id ?? '' }); setEditVagaId(row.id); setModalVaga(true) }

  const handleSaveVaga = async (e) => {
    e.preventDefault()
    setSavingVaga(true)
    const { titulo, unidade, funcao, status, comunidade_id } = formVaga
    const payload = { titulo, unidade, funcao: funcao || null, status, comunidade_id: comunidade_id || null }
    if (editVagaId) {
      await supabase.from('vagas').update(payload).eq('id', editVagaId)
    } else {
      await supabase.from('vagas').insert(payload)
    }
    setSavingVaga(false)
    setModalVaga(false)
    loadVagas()
  }

  const handleDeleteVaga = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('vagas').delete().eq('id', id)
    loadVagas()
  }

  const abrirMatch = (vaga) => {
    setVagaSelecionada(vaga)
    const matches = talentos.filter(t =>
      vaga.funcao && t.funcao?.toLowerCase().includes(vaga.funcao.toLowerCase())
    )
    setTalentosFiltro(matches)
    setModalMatch(true)
  }

  const vagaColumns = [
    { key: 'titulo', label: 'Título' },
    { key: 'funcao', label: 'Função', render: v => v ? <span className="px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{v}</span> : '—' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'comunidades', label: 'Comunidade', render: v => v?.nome ?? '—' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[v] ?? 'bg-cinza-light text-gray-500'}`}>
        {v?.replace('_', ' ')}
      </span>
    )},
  ]

  // ── BANCO DE TALENTOS ──
  const openNovoTalento = () => { setFormTalento(emptyTalento); setEditTalentoId(null); setModalTalento(true) }
  const openEditTalento = (row) => { setFormTalento({ ...row }); setEditTalentoId(row.id); setModalTalento(true) }

  const handleSaveTalento = async (e) => {
    e.preventDefault()
    setSavingTalento(true)
    const { nome, funcao, contato, observacoes } = formTalento
    const payload = {
      nome, funcao: funcao || null, contato: contato || null, observacoes: observacoes || null,
      comunidade_id: isLider ? liderSession.comunidadeId : null,
    }
    if (editTalentoId) {
      await supabase.from('banco_talentos').update(payload).eq('id', editTalentoId)
    } else {
      await supabase.from('banco_talentos').insert(payload)
    }
    setSavingTalento(false)
    setModalTalento(false)
    loadTalentos()
  }

  const handleDeleteTalento = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('banco_talentos').delete().eq('id', id)
    loadTalentos()
  }

  const talentosFiltrados = talentos.filter(t => {
    const matchFuncao = !filtroFuncao || t.funcao?.toLowerCase().includes(filtroFuncao.toLowerCase())
    const matchCom = !filtroComId || t.comunidade_id === filtroComId
    return matchFuncao && matchCom
  })

  const funcoesUnicas = [...new Set(talentos.map(t => t.funcao).filter(Boolean))].sort()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-verde rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Vagas</h1>
            <p className="text-gray-400 text-sm">Gestão de vagas e banco de talentos</p>
          </div>
        </div>
        {tab === 'vagas' && !isLider && (
          <button onClick={openNovaVaga} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> Nova Vaga
          </button>
        )}
        {tab === 'banco' && (
          <button onClick={openNovoTalento} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> Novo Talento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {!isLider && (
          <button onClick={() => setTab('vagas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'vagas' ? 'bg-petroleum text-verde shadow-sm' : 'text-gray-400 hover:text-petroleum'}`}>
            Vagas
          </button>
        )}
        <button onClick={() => setTab('banco')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'banco' ? 'bg-petroleum text-verde shadow-sm' : 'text-gray-400 hover:text-petroleum'}`}>
          Banco de Talentos
        </button>
      </div>

      {/* ── ABA VAGAS ── */}
      {tab === 'vagas' && !isLider && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingVagas ? (
            <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
          ) : vagas.length === 0 ? (
            <div className="py-14 text-center text-cinza text-sm">Nenhuma vaga cadastrada.</div>
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-petroleum/5 border-b text-xs font-semibold text-petroleum/70 uppercase tracking-wider">
                <span className="col-span-3">Título</span>
                <span className="col-span-2">Função</span>
                <span className="col-span-2">Unidade</span>
                <span className="col-span-2">Comunidade</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-2 text-right">Ações</span>
              </div>
              {vagas.map(v => (
                <div key={v.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b last:border-0 hover:bg-verde/5 transition-colors">
                  <span className="col-span-3 text-sm font-medium text-petroleum truncate">{v.titulo}</span>
                  <span className="col-span-2">
                    {v.funcao ? <span className="px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{v.funcao}</span> : <span className="text-xs text-gray-400">—</span>}
                  </span>
                  <span className="col-span-2 text-xs text-gray-500 truncate">{v.unidade ?? '—'}</span>
                  <span className="col-span-2 text-xs text-gray-500 truncate">{v.comunidades?.nome ?? '—'}</span>
                  <span className="col-span-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[v.status] ?? 'bg-cinza-light text-gray-500'}`}>
                      {v.status?.replace('_', ' ')}
                    </span>
                  </span>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {v.funcao && (
                      <button onClick={() => abrirMatch(v)} title="Ver talentos compatíveis"
                        className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors">
                        <Users size={12} /> Talentos
                      </button>
                    )}
                    <button onClick={() => openEditVaga(v)}
                      className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleDeleteVaga(v.id)}
                      className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA BANCO DE TALENTOS ── */}
      {tab === 'banco' && (
        <div>
          {/* Filtros */}
          {!isLider && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <select value={filtroComId} onChange={e => setFiltroComId(e.target.value)}
                className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano w-56">
                <option value="">Todas as comunidades</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={filtroFuncao} onChange={e => setFiltroFuncao(e.target.value)}
                className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano w-48">
                <option value="">Todas as funções</option>
                {funcoesUnicas.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingTalentos ? (
              <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
            ) : talentosFiltrados.length === 0 ? (
              <div className="py-14 text-center text-cinza text-sm">
                {isLider ? 'Nenhum talento cadastrado ainda. Adicione o primeiro!' : 'Nenhum talento encontrado.'}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-petroleum/5 border-b text-xs font-semibold text-petroleum/70 uppercase tracking-wider">
                  <span className="col-span-3">Nome</span>
                  <span className="col-span-2">Função</span>
                  {!isLider && <span className="col-span-2">Comunidade</span>}
                  <span className="col-span-3">Contato</span>
                  <span className={`${isLider ? 'col-span-4' : 'col-span-2'} text-right`}>Ações</span>
                </div>
                {talentosFiltrados.map(t => (
                  <div key={t.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b last:border-0 hover:bg-verde/5 transition-colors">
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-petroleum">{t.nome}</p>
                      {t.observacoes && <p className="text-xs text-gray-400 truncate">{t.observacoes}</p>}
                    </div>
                    <span className="col-span-2">
                      {t.funcao ? <span className="px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{t.funcao}</span> : <span className="text-xs text-gray-400">—</span>}
                    </span>
                    {!isLider && <span className="col-span-2 text-xs text-gray-500 truncate">{t.comunidades?.nome ?? '—'}</span>}
                    <div className="col-span-3 flex items-center gap-2">
                      {t.contato ? (
                        <>
                          <span className="text-xs text-gray-500">{t.contato}</span>
                          <a href={`https://wa.me/55${t.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                            className="text-green-500 hover:text-green-600 transition-colors shrink-0">
                            <MessageCircle size={14} />
                          </a>
                        </>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                    <div className={`${isLider ? 'col-span-4' : 'col-span-2'} flex items-center justify-end gap-1`}>
                      <button onClick={() => openEditTalento(t)}
                        className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => handleDeleteTalento(t.id)}
                        className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors">
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — Nova/Editar Vaga */}
      {modalVaga && (
        <Modal title={editVagaId ? 'Editar Vaga' : 'Nova Vaga'} onClose={() => setModalVaga(false)}>
          <form onSubmit={handleSaveVaga} className="space-y-4">
            <div>
              <label className={labelCls}>Título *</label>
              <input value={formVaga.titulo} onChange={e => setFormVaga(f => ({ ...f, titulo: e.target.value }))}
                required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Função</label>
                <input value={formVaga.funcao} onChange={e => setFormVaga(f => ({ ...f, funcao: e.target.value }))}
                  className={inputCls} placeholder="Ex: Motorista, Ajudante..." />
              </div>
              <div>
                <label className={labelCls}>Unidade</label>
                <input value={formVaga.unidade ?? ''} onChange={e => setFormVaga(f => ({ ...f, unidade: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Comunidade</label>
              <select value={formVaga.comunidade_id} onChange={e => setFormVaga(f => ({ ...f, comunidade_id: e.target.value }))} className={inputCls}>
                <option value="">— Selecione —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={formVaga.status} onChange={e => setFormVaga(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="fechada">Fechada</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalVaga(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={savingVaga}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {savingVaga ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal — Novo/Editar Talento */}
      {modalTalento && (
        <Modal title={editTalentoId ? 'Editar Talento' : 'Novo Talento'} onClose={() => setModalTalento(false)}>
          <form onSubmit={handleSaveTalento} className="space-y-4">
            <div>
              <label className={labelCls}>Nome *</label>
              <input value={formTalento.nome} onChange={e => setFormTalento(f => ({ ...f, nome: e.target.value }))}
                required className={inputCls} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Função / Cargo</label>
                <input value={formTalento.funcao ?? ''} onChange={e => setFormTalento(f => ({ ...f, funcao: e.target.value }))}
                  className={inputCls} placeholder="Ex: Motorista, Soldador..." />
              </div>
              <div>
                <label className={labelCls}>Contato / WhatsApp</label>
                <input value={formTalento.contato ?? ''} onChange={e => setFormTalento(f => ({ ...f, contato: e.target.value }))}
                  className={inputCls} placeholder="(75) 9 9999-9999" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Observações</label>
              <textarea value={formTalento.observacoes ?? ''} onChange={e => setFormTalento(f => ({ ...f, observacoes: e.target.value }))}
                rows={2} className={`${inputCls} resize-none`} placeholder="Experiência, disponibilidade..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalTalento(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={savingTalento}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {savingTalento ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal — Talentos compatíveis com vaga */}
      {modalMatch && vagaSelecionada && (
        <Modal title={`Talentos para: ${vagaSelecionada.funcao}`} onClose={() => setModalMatch(false)}>
          <div className="space-y-3">
            {talentosFiltro.length === 0 ? (
              <p className="text-sm text-cinza text-center py-6">Nenhum talento cadastrado com a função <strong>{vagaSelecionada.funcao}</strong>.</p>
            ) : (
              talentosFiltro.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-petroleum">{t.nome}</p>
                    <p className="text-xs text-gray-400">{t.comunidades?.nome ?? '—'}</p>
                    {t.observacoes && <p className="text-xs text-gray-400 mt-0.5">{t.observacoes}</p>}
                  </div>
                  {t.contato && (
                    <a href={`https://wa.me/55${t.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600 font-medium shrink-0 ml-3">
                      <MessageCircle size={14} /> {t.contato}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
