import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { Plus, Users, Download, FileText, Building2, MapPin, UserPlus, Check } from 'lucide-react'
import WhatsAppIcon from '../components/WhatsAppIcon'

const avatarColors = [
  'bg-oceano/20 text-oceano',
  'bg-verde/40 text-petroleum',
  'bg-laranja/20 text-laranja',
  'bg-petroleum/10 text-petroleum',
]
const getInitials = (nome) => nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const getAvatarColor = (nome) => avatarColors[nome.charCodeAt(0) % avatarColors.length]

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const statusBadge = {
  aberta:       'bg-verde text-petroleum',
  em_andamento: 'bg-laranja/20 text-laranja',
  fechada:      'bg-cinza-light text-gray-500',
}

const emptyVaga    = { titulo: '', unidade_id: '', funcao: '', status: 'aberta', comunidade_id: '' }
const emptyTalento = { nome: '', funcao: '', contato: '', observacoes: '', curriculo_url: null, associacao_id: '' }

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

  const [curriculo, setCurriculo] = useState(null)

  // candidaturas
  const [modalCandidatos, setModalCandidatos] = useState(false)
  const [vagaCandidatosObj, setVagaCandidatosObj] = useState(null)
  const [candidatosVaga, setCandidatosVaga] = useState([])
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)

  // inscrever talento em vaga (líder)
  const [modalInscrever, setModalInscrever] = useState(false)
  const [vagaInscreverObj, setVagaInscreverObj] = useState(null)
  const [minhasCandidaturas, setMinhasCandidaturas] = useState({}) // { vagaId: Set<talentoId> }
  const [inscrevendo, setInscrevendo] = useState(null)

  // modal "ver talentos" de uma vaga
  const [modalMatch, setModalMatch] = useState(false)
  const [vagaSelecionada, setVagaSelecionada] = useState(null)
  const [talentosFiltro, setTalentosFiltro] = useState([])

  // filtros banco de talentos
  const [filtroFuncao, setFiltroFuncao] = useState('')
  const [filtroComId, setFiltroComId] = useState('')

  const [comunidades, setComunidades] = useState([])
  const [associacoes, setAssociacoes] = useState([])
  const [unidades, setUnidades] = useState([])

  const loadVagas = async () => {
    setLoadingVagas(true)
    const { data } = await supabase.from('vagas').select('*, comunidades(nome), unidades(nome)').order('created_at', { ascending: false })
    setVagas(data ?? [])
    setLoadingVagas(false)
  }

  const loadTalentos = async () => {
    setLoadingTalentos(true)
    let q = supabase.from('banco_talentos').select('*, comunidades(nome), associacoes(nome, sigla)').order('created_at', { ascending: false })
    if (isLider) q = q.eq('comunidade_id', liderSession.comunidadeId)
    const { data } = await q
    setTalentos(data ?? [])
    setLoadingTalentos(false)
  }

  const loadComunidades = async () => {
    const [comRes, assocRes, unidRes] = await Promise.all([
      supabase.from('comunidades').select('id, nome').order('nome'),
      supabase.from('associacoes').select('id, nome, sigla, comunidade_id').order('nome'),
      supabase.from('unidades').select('id, nome').order('nome'),
    ])
    setComunidades(comRes.data ?? [])
    setAssociacoes(assocRes.data ?? [])
    setUnidades(unidRes.data ?? [])
  }

  const loadMinhasCandidaturas = async () => {
    const { data } = await supabase.from('candidaturas').select('vaga_id, talento_id')
    const map = {}
    for (const c of data ?? []) {
      if (!map[c.vaga_id]) map[c.vaga_id] = new Set()
      map[c.vaga_id].add(c.talento_id)
    }
    setMinhasCandidaturas(map)
  }

  useEffect(() => {
    loadComunidades()
    loadVagas()
    loadTalentos()
    loadMinhasCandidaturas()
  }, [])

  const abrirCandidatos = async (vaga) => {
    setVagaCandidatosObj(vaga)
    setLoadingCandidatos(true)
    setModalCandidatos(true)
    const { data } = await supabase
      .from('candidaturas')
      .select('*, banco_talentos(nome, funcao, contato, curriculo_url, comunidades(nome), associacoes(nome, sigla))')
      .eq('vaga_id', vaga.id)
      .order('created_at', { ascending: false })
    setCandidatosVaga(data ?? [])
    setLoadingCandidatos(false)
  }

  const changeStatusCandidatura = async (id, status) => {
    await supabase.from('candidaturas').update({ status }).eq('id', id)
    setCandidatosVaga(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const abrirInscrever = (vaga) => {
    setVagaInscreverObj(vaga)
    setModalInscrever(true)
  }

  const handleInscrever = async (talentoId) => {
    setInscrevendo(talentoId)
    await supabase.from('candidaturas').insert({ vaga_id: vagaInscreverObj.id, talento_id: talentoId })
    await loadMinhasCandidaturas()
    setInscrevendo(null)
  }

  // ── VAGAS ──
  const openNovaVaga    = () => { setFormVaga(emptyVaga); setEditVagaId(null); setModalVaga(true) }
  const openEditVaga    = (row) => { setFormVaga({ ...row, comunidade_id: row.comunidade_id ?? '', unidade_id: row.unidade_id ?? '' }); setEditVagaId(row.id); setModalVaga(true) }

  const handleSaveVaga = async (e) => {
    e.preventDefault()
    setSavingVaga(true)
    const { titulo, unidade_id, funcao, status, comunidade_id } = formVaga
    const payload = { titulo, unidade_id: unidade_id || null, funcao: funcao || null, status, comunidade_id: comunidade_id || null }
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
  const openNovoTalento = () => { setFormTalento(emptyTalento); setCurriculo(null); setEditTalentoId(null); setModalTalento(true) }
  const openEditTalento = (row) => { setFormTalento({ ...row, associacao_id: row.associacao_id ?? '' }); setCurriculo(null); setEditTalentoId(row.id); setModalTalento(true) }

  const assocsDaComunidade = associacoes.filter(a =>
    a.comunidade_id === (isLider ? liderSession.comunidadeId : formTalento.comunidade_id)
  )

  const handleSaveTalento = async (e) => {
    e.preventDefault()
    setSavingTalento(true)
    const { nome, funcao, contato, observacoes } = formTalento
    let curriculo_url = formTalento.curriculo_url ?? null

    if (curriculo) {
      const ext = curriculo.name.split('.').pop()
      const path = `${Date.now()}_${nome.replace(/\s+/g, '_')}.${ext}`
      const { error: upErr } = await supabase.storage.from('curriculos').upload(path, curriculo, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('curriculos').getPublicUrl(path)
        curriculo_url = urlData.publicUrl
      }
    }

    const payload = {
      nome, funcao: funcao || null, contato: contato || null, observacoes: observacoes || null,
      curriculo_url,
      associacao_id: formTalento.associacao_id || null,
      comunidade_id: isLider ? liderSession.comunidadeId : (formTalento.comunidade_id || null),
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
        {isLider && (
          <button onClick={() => setTab('vagas-abertas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'vagas-abertas' ? 'bg-petroleum text-verde shadow-sm' : 'text-gray-400 hover:text-petroleum'}`}>
            Vagas Abertas
          </button>
        )}
      </div>

      {/* ── ABA VAGAS ── */}
      {tab === 'vagas' && !isLider && (
        <div>
          {loadingVagas ? (
            <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
          ) : vagas.length === 0 ? (
            <div className="py-14 text-center text-cinza text-sm">Nenhuma vaga cadastrada.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vagas.map(v => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  {/* Topo: status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-petroleum leading-tight truncate">{v.titulo}</p>
                      {v.funcao && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{v.funcao}</span>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusBadge[v.status] ?? 'bg-cinza-light text-gray-500'}`}>
                      {v.status?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    {v.unidades && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-petroleum/80">
                        <Building2 size={11} className="shrink-0 text-oceano" /> {v.unidades.nome}
                      </div>
                    )}
                    {v.comunidades && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-petroleum/60">
                        <MapPin size={11} className="shrink-0 text-laranja/70" /> {v.comunidades.nome}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button onClick={() => abrirCandidatos(v)}
                        className="flex items-center gap-1 text-xs text-petroleum font-medium px-2 py-1.5 rounded-lg bg-oceano/15 hover:bg-oceano/25 transition-colors">
                        <UserPlus size={12} /> Candidatos
                      </button>
                      <button onClick={() => abrirInscrever(v)}
                        className="flex items-center gap-1 text-xs text-petroleum font-semibold px-2 py-1.5 rounded-lg bg-verde hover:bg-verde-light transition-colors">
                        <UserPlus size={12} /> Inscrever
                      </button>
                      {v.funcao && (
                        <button onClick={() => abrirMatch(v)}
                          className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors">
                          <Users size={12} /> Talentos
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditVaga(v)}
                        className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-oceano/10 transition-colors">
                        Editar
                      </button>
                      {role === 'admin' && (
                        <button onClick={() => handleDeleteVaga(v.id)}
                          className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1.5 rounded-lg hover:bg-laranja/10 transition-colors">
                          Excluir
                        </button>
                      )}
                    </div>
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

          {loadingTalentos ? (
            <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
          ) : talentosFiltrados.length === 0 ? (
            <div className="py-14 text-center text-cinza text-sm">
              {isLider ? 'Nenhum talento cadastrado ainda. Adicione o primeiro!' : 'Nenhum talento encontrado.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {talentosFiltrados.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(t.nome)}`}>
                      {getInitials(t.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-petroleum leading-tight">{t.nome}</p>
                      {t.funcao && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{t.funcao}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                      <Building2 size={11} className={`shrink-0 ${t.associacoes ? 'text-oceano' : 'text-gray-300'}`} />
                      <span className={t.associacoes ? 'text-oceano' : 'text-gray-300'}>
                        {t.associacoes ? (t.associacoes.sigla ?? t.associacoes.nome) : 'Sem associação'}
                      </span>
                    </div>
                    {!isLider && t.comunidades && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{t.comunidades.nome}</span>
                      </div>
                    )}
                    {t.observacoes && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">{t.observacoes}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                    {t.contato ? (
                      <a href={`https://wa.me/55${t.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600 font-medium transition-colors">
                        <WhatsAppIcon size={13} /> {t.contato}
                      </a>
                    ) : <span />}
                    <div className="flex items-center gap-1">
                      {t.curriculo_url && (
                        <a href={t.curriculo_url} target="_blank" rel="noreferrer" title="Baixar Currículo"
                          className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-oceano/10 transition-colors">
                          <Download size={12} /> CV
                        </a>
                      )}
                      <button onClick={() => openEditTalento(t)}
                        className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-oceano/10 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => handleDeleteTalento(t.id)}
                        className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-laranja/10 transition-colors">
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA VAGAS ABERTAS (líder) ── */}
      {tab === 'vagas-abertas' && isLider && (
        <div>
          {loadingVagas ? (
            <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
          ) : vagas.filter(v => v.status === 'aberta').length === 0 ? (
            <div className="py-14 text-center text-cinza text-sm">Nenhuma vaga aberta no momento.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vagas.filter(v => v.status === 'aberta').map(v => {
                const inscritos = minhasCandidaturas[v.id]
                const qtd = inscritos?.size ?? 0
                return (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-petroleum">{v.titulo}</p>
                        {v.funcao && <span className="inline-block mt-1 px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{v.funcao}</span>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-verde text-petroleum shrink-0">aberta</span>
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {v.unidades && <p>Unidade: {v.unidades.nome}</p>}
                      {v.comunidades && <p>Comunidade: {v.comunidades.nome}</p>}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                      {qtd > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-verde font-medium">
                          <Check size={12} /> {qtd} talento{qtd > 1 ? 's' : ''} inscrito{qtd > 1 ? 's' : ''}
                        </span>
                      ) : <span />}
                      <button onClick={() => abrirInscrever(v)}
                        className="flex items-center gap-1.5 text-xs bg-verde hover:bg-verde-light text-petroleum px-3 py-1.5 rounded-lg font-semibold transition-colors">
                        <UserPlus size={13} /> Inscrever Talento
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
                <select value={formVaga.unidade_id ?? ''} onChange={e => setFormVaga(f => ({ ...f, unidade_id: e.target.value }))} className={inputCls}>
                  <option value="">— Sem unidade —</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
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
              <label className={labelCls}>Associação</label>
              <select value={formTalento.associacao_id ?? ''} onChange={e => setFormTalento(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                <option value="">— Selecione a associação —</option>
                {assocsDaComunidade.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Observações</label>
              <textarea value={formTalento.observacoes ?? ''} onChange={e => setFormTalento(f => ({ ...f, observacoes: e.target.value }))}
                rows={2} className={`${inputCls} resize-none`} placeholder="Experiência, disponibilidade..." />
            </div>
            <div>
              <label className={labelCls}>Currículo (PDF, DOC)</label>
              {formTalento.curriculo_url && !curriculo && (
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-oceano shrink-0" />
                  <a href={formTalento.curriculo_url} target="_blank" rel="noreferrer"
                    className="text-xs text-oceano hover:underline truncate">Ver currículo atual</a>
                </div>
              )}
              <input type="file" accept=".pdf,.doc,.docx,.odt"
                onChange={e => setCurriculo(e.target.files[0] || null)}
                className="w-full text-sm text-petroleum/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-oceano/10 file:text-oceano hover:file:bg-oceano/20 cursor-pointer" />
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
                    {t.associacoes && (
                      <p className="text-xs text-oceano font-medium">{t.associacoes.sigla ?? t.associacoes.nome}</p>
                    )}
                    <p className="text-xs text-gray-400">{t.comunidades?.nome ?? '—'}</p>
                    {t.observacoes && <p className="text-xs text-gray-400 mt-0.5">{t.observacoes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {t.curriculo_url && (
                      <a href={t.curriculo_url} target="_blank" rel="noreferrer" title="Baixar Currículo"
                        className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium">
                        <Download size={13} /> CV
                      </a>
                    )}
                    {t.contato && (
                      <a href={`https://wa.me/55${t.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-600 font-medium">
                        <WhatsAppIcon size={14} /> {t.contato}
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Modal — Candidatos inscritos (gestor) */}
      {modalCandidatos && vagaCandidatosObj && (
        <Modal title={`Candidatos — ${vagaCandidatosObj.titulo}`} onClose={() => setModalCandidatos(false)}>
          {loadingCandidatos ? (
            <div className="py-8 text-center text-cinza text-sm">Carregando...</div>
          ) : candidatosVaga.length === 0 ? (
            <p className="text-sm text-cinza text-center py-8">Nenhum candidato inscrito ainda.</p>
          ) : (
            <div className="space-y-3">
              {candidatosVaga.map(c => {
                const t = c.banco_talentos
                return (
                  <div key={c.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(t?.nome ?? 'A')}`}>
                        {getInitials(t?.nome ?? 'A')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-petroleum">{t?.nome ?? '—'}</p>
                        {t?.funcao && <span className="inline-block px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{t.funcao}</span>}
                        {t?.associacoes && <p className="text-xs text-oceano font-medium mt-0.5">{t.associacoes.sigla ?? t.associacoes.nome}</p>}
                        {t?.comunidades && <p className="text-xs text-gray-400">{t.comunidades.nome}</p>}
                        {t?.contato && (
                          <a href={`https://wa.me/55${t.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-green-500 hover:text-green-600 font-medium mt-1">
                            <WhatsAppIcon size={12} /> {t.contato}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {t?.curriculo_url && (
                        <a href={t.curriculo_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-oceano hover:text-petroleum font-medium">
                          <Download size={12} /> CV
                        </a>
                      )}
                      {role === 'admin' ? (
                        <select value={c.status} onChange={e => changeStatusCandidatura(c.id, e.target.value)}
                          className="text-xs border border-cinza rounded-lg px-2 py-1 text-petroleum focus:outline-none focus:ring-1 focus:ring-oceano">
                          <option value="inscrito">Inscrito</option>
                          <option value="em_analise">Em análise</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="reprovado">Reprovado</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.status === 'aprovado' ? 'bg-verde/30 text-petroleum' :
                          c.status === 'reprovado' ? 'bg-red-100 text-red-500' :
                          c.status === 'em_analise' ? 'bg-laranja/15 text-laranja' :
                          'bg-oceano/15 text-oceano'
                        }`}>{c.status?.replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Modal — Inscrever talento em vaga (líder) */}
      {modalInscrever && vagaInscreverObj && (
        <Modal title={`Inscrever em: ${vagaInscreverObj.titulo}`} onClose={() => setModalInscrever(false)}>
          <div className="space-y-3">
            {talentos.length === 0 ? (
              <p className="text-sm text-cinza text-center py-6">Cadastre talentos no Banco de Talentos primeiro.</p>
            ) : (
              talentos.map(t => {
                const jaInscrito = minhasCandidaturas[vagaInscreverObj.id]?.has(t.id)
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(t.nome)}`}>
                        {getInitials(t.nome)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-petroleum">{t.nome}</p>
                        {t.funcao && <span className="px-1.5 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-semibold">{t.funcao}</span>}
                        {t.associacoes && <p className="text-xs text-oceano mt-0.5">{t.associacoes.sigla ?? t.associacoes.nome}</p>}
                      </div>
                    </div>
                    {jaInscrito ? (
                      <span className="flex items-center gap-1 text-xs text-verde font-semibold shrink-0">
                        <Check size={13} /> Inscrito
                      </span>
                    ) : (
                      <button onClick={() => handleInscrever(t.id)} disabled={inscrevendo === t.id}
                        className="flex items-center gap-1 text-xs bg-verde hover:bg-verde-light disabled:opacity-50 text-petroleum px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0">
                        <UserPlus size={12} /> {inscrevendo === t.id ? '...' : 'Inscrever'}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
