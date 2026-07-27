import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, ChevronRight, CheckCircle, LogOut, GraduationCap, Award, Download, Lock, FileText, Play, Layers, Clock, ChevronDown, ChevronUp, Menu } from 'lucide-react'

const NOTA_MINIMA = 0.7

const BADGES = {
  primeiro_passo: { label: 'Primeiro Passo', emoji: '🎯', desc: 'Primeira aula concluída' },
  nota_perfeita: { label: 'Nota Perfeita', emoji: '⭐', desc: '100% no quiz' },
  graduado: { label: 'Graduado', emoji: '🎓', desc: 'Primeiro certificado' },
  maratonista: { label: 'Maratonista', emoji: '🏃', desc: '3 cursos concluídos' },
}

const getEmbedUrl = (url) => {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return url
}

function MediaPlayer({ aula }) {
  if (!aula.video_url) return null
  const tipo = aula.tipo || 'youtube'

  if (tipo === 'pdf') {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-100 mt-4">
        <iframe src={aula.video_url} className="w-full" style={{ height: '65vh' }}
          title={aula.titulo} />
      </div>
    )
  }
  if (tipo === 'video') {
    return (
      <div className="mt-4">
        <video controls src={aula.video_url} className="w-full rounded-xl" style={{ maxHeight: '60vh' }}>
          Seu navegador não suporta este formato de vídeo.
        </video>
      </div>
    )
  }
  const embedUrl = getEmbedUrl(aula.video_url)
  if (!embedUrl) return null
  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe src={embedUrl} className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen title={aula.titulo} />
    </div>
  )
}

function CertificadoView({ aluno, curso, cert, onVoltar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundImage: 'url(/fundo-tela.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <style>{`@media print { body > * { display: none; } #cert-print { display: flex !important; position: fixed; inset: 0; z-index: 9999; align-items: center; justify-content: center; background: white; } }`}</style>
      <div className="absolute inset-0 bg-petroleum/50 print:hidden" />
      <div id="cert-print" className="relative z-10 w-full max-w-2xl mx-4">
        <div className="bg-white/97 backdrop-blur rounded-2xl p-10 text-center shadow-2xl border border-white/60">
          <div className="flex justify-center mb-4">
            <img src="/logo-colorida-2.png" alt="Logo" className="h-20 object-contain" />
          </div>
          <p className="text-xs font-bold tracking-[0.4em] uppercase text-oceano mb-1">Comissão de Comunidades</p>
          <h1 className="text-3xl font-black text-petroleum tracking-tight mb-6">Certificado de Conclusão</h1>
          <div className="border-t border-b border-laranja/30 py-6 mb-6">
            <p className="text-sm text-gray-500 mb-2">Certificamos que</p>
            <p className="text-2xl font-bold text-petroleum mb-4">{aluno.alunoNome}</p>
            <p className="text-sm text-gray-500 mb-1">concluiu com aproveitamento o curso</p>
            <p className="text-lg font-semibold text-oceano">{curso?.titulo}</p>
          </div>
          <p className="text-xs text-gray-400 mb-1">
            {cert?.emitido_em ? new Date(cert.emitido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
          </p>
          <p className="text-xs text-gray-300 font-mono">Código: {cert?.codigo}</p>
          <div className="flex gap-3 justify-center mt-8 print:hidden">
            <button onClick={onVoltar}
              className="flex items-center gap-2 border border-cinza text-petroleum/70 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <ChevronLeft size={15} /> Voltar
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Download size={15} /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const FILTROS_AULA = [
  { id: 'todos', label: 'Todos' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'nao-iniciado', label: 'Não iniciado' },
]

function CapituloCard({ titulo, aulasGrupo, aulas, progresso, aulaAtivaId, expandido, onToggle, onSelecionarAula, filtro, onSetFiltro }) {
  const concluidas = aulasGrupo.filter(a => progresso.has(a.id)).length
  const total = aulasGrupo.length
  const finalizado = total > 0 && concluidas === total
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0

  const estadoAula = (aula) => {
    const idx = aulas.findIndex(a => a.id === aula.id)
    const concluida = progresso.has(aula.id)
    const desbloqueada = idx === 0 || progresso.has(aulas[idx - 1]?.id)
    return { idx, concluida, desbloqueada }
  }

  const aulasFiltradas = aulasGrupo.filter(aula => {
    const { concluida, desbloqueada } = estadoAula(aula)
    if (filtro === 'andamento') return !concluida && desbloqueada
    if (filtro === 'nao-iniciado') return !desbloqueada
    return true
  })

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left hover:bg-gray-50/60 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-bold text-petroleum leading-tight truncate">{titulo}</p>
          {finalizado ? (
            <span className="flex items-center gap-1 text-xs text-verde font-semibold mt-0.5">
              <CheckCircle size={11} /> Finalizado
            </span>
          ) : (
            <span className="text-xs text-gray-400 mt-0.5">{concluidas}/{total} aulas</span>
          )}
        </div>
        {expandido ? <ChevronUp size={15} className="text-gray-300 shrink-0" /> : <ChevronDown size={15} className="text-gray-300 shrink-0" />}
      </button>

      {expandido && (
        <div className="pb-3">
          <div className="px-3 mb-2">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-verde rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{concluidas}/{total} aulas</span>
              <button onClick={onToggle} className="text-oceano font-semibold hover:text-petroleum transition-colors">Recolher</button>
            </div>
          </div>

          <div className="flex gap-1 px-3 mb-2 overflow-x-auto no-scrollbar">
            {FILTROS_AULA.map(f => (
              <button key={f.id} onClick={() => onSetFiltro(f.id)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filtro === f.id ? 'bg-petroleum text-verde' : 'bg-gray-100 text-gray-400 hover:text-petroleum'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {aulasFiltradas.length === 0 ? (
            <p className="text-xs text-gray-300 px-3 py-2">Nenhuma aula nesse filtro.</p>
          ) : (
            aulasFiltradas.map(aula => {
              const { idx, concluida, desbloqueada } = estadoAula(aula)
              const ativa = aulaAtivaId === aula.id
              return (
                <button key={aula.id}
                  onClick={() => desbloqueada && onSelecionarAula(aula)}
                  disabled={!desbloqueada}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${ativa ? 'bg-oceano/8' : ''} ${desbloqueada ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${concluida ? 'bg-verde text-petroleum' : ativa ? 'bg-oceano text-white' : desbloqueada ? 'bg-oceano/15 text-oceano' : 'bg-gray-100 text-gray-300'}`}>
                    {concluida ? <CheckCircle size={12} /> : desbloqueada ? idx + 1 : <Lock size={10} />}
                  </div>
                  <span className={`text-xs font-semibold flex-1 min-w-0 truncate ${ativa ? 'text-oceano' : concluida ? 'text-petroleum/60' : 'text-petroleum'}`}>
                    {aula.titulo}
                  </span>
                  {concluida && <CheckCircle size={13} className="text-verde shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function PortalAluno() {
  const { alunoSession, signOut } = useAuth()
  const [view, setView] = useState('home')
  const [cursos, setCursos] = useState([])
  const [matriculas, setMatriculas] = useState([])
  const [certificados, setCertificados] = useState([])
  const [conquistasList, setConquistasList] = useState([])
  const [loading, setLoading] = useState(true)

  const [cursoAtual, setCursoAtual] = useState(null)
  const [aulas, setAulas] = useState([])
  const [capitulos, setCapitulos] = useState([])
  const [progresso, setProgresso] = useState(new Set())
  const [aulaAtiva, setAulaAtiva] = useState(null)
  const [capExpandidoId, setCapExpandidoId] = useState(null)
  const [filtroPorCapitulo, setFiltroPorCapitulo] = useState({})

  const [questoes, setQuestoes] = useState([])
  const [respostas, setRespostas] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState(null)

  const [certAtual, setCertAtual] = useState(null)
  const [novaBadge, setNovaBadge] = useState(null)

  const load = async () => {
    setLoading(true)
    const [matsRes, certsRes, conquRes] = await Promise.all([
      supabase.from('matriculas').select('*, cursos(*)').eq('aluno_id', alunoSession.alunoId),
      supabase.from('certificados').select('*, cursos(titulo)').eq('aluno_id', alunoSession.alunoId),
      supabase.from('conquistas').select('*').eq('aluno_id', alunoSession.alunoId),
    ])
    const mats = matsRes.data ?? []
    setMatriculas(mats)
    setCursos(mats.map(m => m.cursos).filter(Boolean))
    setCertificados(certsRes.data ?? [])
    setConquistasList(conquRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const ganharBadge = async (tipo, certsAtualizado) => {
    const lista = certsAtualizado ?? conquistasList
    if (lista.some(c => c.tipo === tipo)) return
    const { data } = await supabase.from('conquistas')
      .insert({ aluno_id: alunoSession.alunoId, tipo })
      .select().single()
    if (data) {
      setConquistasList(prev => [...prev, data])
      setNovaBadge(BADGES[tipo])
      setTimeout(() => setNovaBadge(null), 3500)
    }
  }

  const abrirCurso = async (curso) => {
    setCursoAtual(curso)
    setView('curso')
    setRespostas({})
    setResultado(null)
    setFiltroPorCapitulo({})

    const [aulasRes, progRes, capitulosRes] = await Promise.all([
      supabase.from('aulas').select('*').eq('curso_id', curso.id).order('ordem'),
      supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', alunoSession.alunoId),
      supabase.from('capitulos').select('*').eq('curso_id', curso.id).order('ordem'),
    ])
    const aulasList = aulasRes.data ?? []
    const progressoSet = new Set((progRes.data ?? []).map(p => p.aula_id))
    setAulas(aulasList)
    setProgresso(progressoSet)
    setCapitulos(capitulosRes.data ?? [])

    const firstIncomplete = aulasList.find(a => !progressoSet.has(a.id))
    const ativa = firstIncomplete ?? (aulasList.length > 0 ? aulasList[aulasList.length - 1] : null)
    setAulaAtiva(ativa)
    setCapExpandidoId(ativa && !ativa.capitulo_id ? '__sem_capitulo__' : ativa?.capitulo_id ?? null)
  }

  const irParaAula = (aula) => {
    if (!aula) return
    setAulaAtiva(aula)
    setCapExpandidoId(aula.capitulo_id ?? '__sem_capitulo__')
  }

  const concluirAula = async (aulaId) => {
    if (progresso.has(aulaId)) return
    const isFirst = progresso.size === 0
    await supabase.from('progresso_aulas').insert({ aluno_id: alunoSession.alunoId, aula_id: aulaId })
    const newProgresso = new Set([...progresso, aulaId])
    setProgresso(newProgresso)
    if (isFirst) await ganharBadge('primeiro_passo')

    const currentIdx = aulas.findIndex(a => a.id === aulaId)
    if (currentIdx < aulas.length - 1) irParaAula(aulas[currentIdx + 1])
  }

  const avancarAula = () => {
    if (!aulaAtiva) return
    if (!progresso.has(aulaAtiva.id)) { concluirAula(aulaAtiva.id); return }
    const currentIdx = aulas.findIndex(a => a.id === aulaAtiva.id)
    if (currentIdx < aulas.length - 1) irParaAula(aulas[currentIdx + 1])
  }

  const voltarAula = () => {
    if (!aulaAtiva) return
    const currentIdx = aulas.findIndex(a => a.id === aulaAtiva.id)
    if (currentIdx > 0) irParaAula(aulas[currentIdx - 1])
  }

  const abrirQuiz = async () => {
    const { data } = await supabase.from('questoes').select('*').eq('curso_id', cursoAtual.id).order('ordem')
    setQuestoes(data ?? [])
    setRespostas({})
    setView('quiz')
  }

  const submeterQuiz = async () => {
    if (questoes.length === 0) return
    setSubmitting(true)
    let acertos = 0
    for (const q of questoes) {
      if (respostas[q.id] === q.resposta_correta) acertos++
    }
    const total = questoes.length
    const nota = acertos / total
    const aprovado = nota >= NOTA_MINIMA

    await supabase.from('tentativas_quiz').insert({
      aluno_id: alunoSession.alunoId, curso_id: cursoAtual.id,
      respostas, acertos, total, aprovado,
    })

    let certsAtualizados = certificados
    if (aprovado) {
      const jaTemCert = certificados.find(c => c.curso_id === cursoAtual.id)
      if (!jaTemCert) {
        const { data: novoCert } = await supabase.from('certificados')
          .insert({ aluno_id: alunoSession.alunoId, curso_id: cursoAtual.id })
          .select().single()
        if (novoCert) {
          certsAtualizados = [...certificados, { ...novoCert, cursos: { titulo: cursoAtual.titulo } }]
          setCertificados(certsAtualizados)
        }
      }
      await supabase.from('matriculas').update({ status: 'concluido', concluido_em: new Date().toISOString() })
        .eq('aluno_id', alunoSession.alunoId).eq('curso_id', cursoAtual.id)
      setMatriculas(prev => prev.map(m => m.curso_id === cursoAtual.id ? { ...m, status: 'concluido' } : m))

      if (nota === 1) await ganharBadge('nota_perfeita')
      if (certsAtualizados.length === 1) await ganharBadge('graduado')
      if (certsAtualizados.length >= 3) await ganharBadge('maratonista')
    }

    setResultado({ acertos, total, nota, aprovado })
    setSubmitting(false)
    setView('resultado')
  }

  const abrirCertificado = (cert, curso) => {
    setCertAtual(cert)
    if (curso) setCursoAtual(curso)
    setView('certificado')
  }

  const todasAulasConcluidas = aulas.length > 0 && aulas.every(a => progresso.has(a.id))
  const certDoCurso = certificados.find(c => c.curso_id === cursoAtual?.id)

  const totalHoras = aulas.reduce((s, a) => s + (Number(a.duracao_horas) || 0), 0)
  const horasConcluidas = aulas.filter(a => progresso.has(a.id)).reduce((s, a) => s + (Number(a.duracao_horas) || 0), 0)
  const capitulosConcluidos = capitulos.filter(cap => {
    const as = aulas.filter(a => a.capitulo_id === cap.id)
    return as.length > 0 && as.every(a => progresso.has(a.id))
  }).length
  const progressoPct = totalHoras > 0
    ? (horasConcluidas / totalHoras) * 100
    : (aulas.length > 0 ? (progresso.size / aulas.length) * 100 : 0)

  const aulasSemCapitulo = aulas.filter(a => !a.capitulo_id)
  const gruposCapitulos = [
    ...capitulos.map(cap => ({ id: cap.id, titulo: cap.titulo, aulasGrupo: aulas.filter(a => a.capitulo_id === cap.id) })),
    ...(aulasSemCapitulo.length > 0 ? [{ id: '__sem_capitulo__', titulo: capitulos.length > 0 ? 'Outras aulas' : cursoAtual?.titulo ?? 'Aulas', aulasGrupo: aulasSemCapitulo }] : []),
  ]
  const aulaIndexAtual = aulas.findIndex(a => a.id === aulaAtiva?.id)

  const setFiltroCapitulo = (capId, valor) => setFiltroPorCapitulo(prev => ({ ...prev, [capId]: valor }))

  if (view === 'certificado' && certAtual) {
    return (
      <CertificadoView
        aluno={alunoSession}
        curso={cursoAtual ?? certAtual.cursos}
        cert={certAtual}
        onVoltar={() => setView(resultado ? 'resultado' : cursoAtual ? 'curso' : 'home')}
      />
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-petroleum shadow-sm z-40 shrink-0">
        <div className="px-6 py-3 flex items-center gap-4">
          <img src="/logo-colorida.png" alt="Logo" className="h-10 object-contain" />
          {view === 'curso' && cursoAtual && (
            <div className="flex items-center gap-2 text-white/50">
              <ChevronLeft size={14} />
              <button onClick={() => setView('home')} className="text-xs text-white/50 hover:text-verde transition-colors font-medium">
                Meus Cursos
              </button>
              <ChevronLeft size={14} className="rotate-180" />
              <span className="text-xs text-white/80 font-semibold truncate max-w-xs">{cursoAtual.titulo}</span>
            </div>
          )}
          <div className="flex-1" />
          <div className="text-right mr-2">
            <p className="text-white/90 text-sm font-semibold leading-none">{alunoSession.alunoNome}</p>
            <p className="text-oceano/70 text-xs mt-0.5">Aluno</p>
          </div>
          <button onClick={signOut}
            className="flex items-center gap-1.5 text-cinza hover:text-laranja text-xs font-medium transition-colors p-2 rounded-lg hover:bg-petroleum/80">
            <LogOut size={15} /> Sair
          </button>
        </div>
      </header>

      {/* Toast conquista */}
      {novaBadge && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-petroleum text-white px-4 py-3 rounded-xl shadow-2xl border border-verde/30 animate-fade-in">
          <span className="text-3xl">{novaBadge.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-verde leading-none mb-0.5">Nova conquista!</p>
            <p className="text-sm font-bold">{novaBadge.label}</p>
            <p className="text-xs text-white/50">{novaBadge.desc}</p>
          </div>
        </div>
      )}

      {/* ── CURSO: sidebar de capítulos (esquerda) + conteúdo (direita) ── */}
      {view === 'curso' && cursoAtual && (
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT: Sidebar */}
          <div className="w-80 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0">

            {/* Course header */}
            <div className="p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-petroleum text-base leading-tight">{cursoAtual.titulo}</h3>
                <button onClick={() => setView('home')} title="Meus Cursos" className="p-1 text-gray-300 hover:text-petroleum transition-colors shrink-0">
                  <Menu size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{horasConcluidas % 1 === 0 ? horasConcluidas : horasConcluidas.toFixed(1)}/{totalHoras || 0} horas</span>
                <span>{capitulosConcluidos}/{capitulos.length} capítulos</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-verde rounded-full transition-all duration-300" style={{ width: `${progressoPct}%` }} />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-1 text-xs">
                  <span className="text-oceano font-bold">{conquistasList.length}</span>
                  <span className="text-gray-400 font-medium">/ {Object.keys(BADGES).length} conquistas</span>
                </div>
                <button onClick={() => certDoCurso && abrirCertificado(certDoCurso, cursoAtual)} disabled={!certDoCurso}
                  className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${certDoCurso ? 'text-laranja border-laranja/30 bg-laranja/10 hover:bg-laranja/20' : 'text-gray-300 border-gray-100 bg-gray-50 cursor-not-allowed'}`}>
                  {certDoCurso ? <Award size={12} /> : <Lock size={11} />} Certificado
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <p className="text-xs font-bold text-petroleum/50 uppercase tracking-wide">Conteúdo</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {gruposCapitulos.length === 0 ? (
                <p className="text-xs text-gray-300 px-4 py-3">Nenhuma aula cadastrada ainda.</p>
              ) : (
                gruposCapitulos.map(grupo => (
                  <CapituloCard
                    key={grupo.id}
                    titulo={grupo.titulo}
                    aulasGrupo={grupo.aulasGrupo}
                    aulas={aulas}
                    progresso={progresso}
                    aulaAtivaId={aulaAtiva?.id}
                    expandido={capExpandidoId === grupo.id}
                    onToggle={() => setCapExpandidoId(prev => prev === grupo.id ? null : grupo.id)}
                    onSelecionarAula={irParaAula}
                    filtro={filtroPorCapitulo[grupo.id] ?? 'todos'}
                    onSetFiltro={(v) => setFiltroCapitulo(grupo.id, v)}
                  />
                ))
              )}
            </div>

            {/* Bottom: prova final */}
            <div className="p-3 border-t border-gray-100 shrink-0">
              {todasAulasConcluidas && !certDoCurso && (
                <button onClick={abrirQuiz}
                  className="w-full bg-verde hover:bg-verde-light text-petroleum py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
                  Fazer Prova Final
                </button>
              )}
              {!todasAulasConcluidas && (
                <p className="text-xs text-center text-gray-300 py-1">Conclua todas as aulas para desbloquear a prova</p>
              )}
            </div>
          </div>

          {/* RIGHT: Conteúdo da aula */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* barra de progresso fina no topo */}
            <div className="h-1.5 bg-gray-100 shrink-0">
              <div className="h-full bg-verde transition-all duration-300" style={{ width: `${progressoPct}%` }} />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {aulaAtiva ? (
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 mb-1">
                    {aulaAtiva.tipo === 'pdf' && (
                      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded font-medium">
                        <FileText size={10} /> PDF
                      </span>
                    )}
                    {aulaAtiva.tipo === 'video' && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-500 px-2 py-0.5 rounded font-medium">
                        <Play size={10} /> Vídeo
                      </span>
                    )}
                    {(!aulaAtiva.tipo || aulaAtiva.tipo === 'youtube') && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded font-medium">
                        <Play size={10} /> YouTube
                      </span>
                    )}
                    <span className="text-xs text-gray-300">Aula {aulaIndexAtual + 1} de {aulas.length}</span>
                    {!!aulaAtiva.duracao_horas && (
                      <span className="flex items-center gap-1 text-xs text-gray-300"><Clock size={10} /> {aulaAtiva.duracao_horas}h</span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-petroleum mb-1">{aulaAtiva.titulo}</h2>
                  {aulaAtiva.descricao && <p className="text-sm text-gray-500 mb-2">{aulaAtiva.descricao}</p>}

                  <MediaPlayer aula={aulaAtiva} />

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                    {aulaAtiva.material_url && (
                      <a href={aulaAtiva.material_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-laranja hover:text-petroleum font-medium transition-colors">
                        <FileText size={14} /> Material complementar
                      </a>
                    )}
                    {progresso.has(aulaAtiva.id) && (
                      <span className="flex items-center gap-1.5 text-sm text-verde font-semibold ml-auto">
                        <CheckCircle size={16} /> Aula concluída
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold text-petroleum mb-1">Todas as aulas concluídas!</h3>
                    <p className="text-gray-400 text-sm mb-4">Faça a prova na barra lateral para obter seu certificado.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Voltar / Avançar */}
            {aulaAtiva && (
              <div className="border-t border-gray-100 bg-white px-6 py-4 flex items-center justify-between shrink-0">
                <button onClick={voltarAula} disabled={aulaIndexAtual <= 0}
                  className="flex items-center gap-1.5 text-sm font-semibold text-petroleum/60 hover:text-petroleum disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg border border-cinza transition-colors">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={avancarAula} disabled={aulaIndexAtual >= aulas.length - 1 && progresso.has(aulaAtiva.id)}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-petroleum hover:bg-petroleum-light px-5 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {progresso.has(aulaAtiva.id) ? 'Avançar' : 'Concluir e avançar'} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HOME / QUIZ / RESULTADO ── */}
      {view !== 'curso' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">

            {/* HOME */}
            {view === 'home' && (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-1 h-7 bg-verde rounded-full" />
                  <div>
                    <h1 className="text-xl font-bold text-petroleum">Meus Cursos</h1>
                    <p className="text-gray-400 text-sm">Cursos em que você está inscrito</p>
                  </div>
                </div>

                {conquistasList.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
                    <p className="text-xs font-bold text-petroleum/60 uppercase tracking-wide mb-3">Minhas Conquistas</p>
                    <div className="flex flex-wrap gap-2">
                      {conquistasList.map(c => {
                        const b = BADGES[c.tipo]
                        if (!b) return null
                        return (
                          <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-petroleum/5 border border-gray-100 rounded-xl">
                            <span className="text-xl">{b.emoji}</span>
                            <div>
                              <p className="text-xs font-bold text-petroleum leading-tight">{b.label}</p>
                              <p className="text-xs text-gray-400">{b.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {certificados.length > 0 && (
                  <div className="bg-white rounded-xl border border-laranja/20 shadow-sm p-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Award size={15} className="text-laranja" />
                      <span className="text-sm font-bold text-petroleum uppercase tracking-wide">Certificados Conquistados</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {certificados.map(cert => (
                        <button key={cert.id} onClick={() => abrirCertificado(cert, cert.cursos)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-laranja/10 hover:bg-laranja/20 border border-laranja/20 rounded-lg text-sm text-petroleum font-medium transition-colors">
                          <Award size={13} className="text-laranja" /> {cert.cursos?.titulo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
                ) : cursos.length === 0 ? (
                  <div className="py-16 text-center">
                    <GraduationCap size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm font-medium">Nenhum curso inscrito ainda.</p>
                    <p className="text-gray-300 text-xs mt-1">Aguarde seu líder ou administrador inscrever você em um curso.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cursos.map(curso => {
                      const mat = matriculas.find(m => m.curso_id === curso.id)
                      const cert = certificados.find(c => c.curso_id === curso.id)
                      return (
                        <button key={curso.id} onClick={() => abrirCurso(curso)} className="text-left">
                          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            {curso.thumbnail_url ? (
                              <div className="h-32 overflow-hidden">
                                <img src={curso.thumbnail_url} alt={curso.titulo} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-24 bg-gradient-to-br from-oceano/20 to-verde/20 flex items-center justify-center">
                                <GraduationCap size={32} className="text-oceano/40" />
                              </div>
                            )}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-petroleum text-sm">{curso.titulo}</p>
                                {cert ? (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-laranja/15 text-laranja rounded-full text-xs font-bold shrink-0">
                                    <Award size={10} /> Certificado
                                  </span>
                                ) : mat?.status === 'concluido' ? (
                                  <span className="px-2 py-0.5 bg-verde/15 text-verde rounded-full text-xs font-semibold shrink-0">Concluído</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-oceano/15 text-oceano rounded-full text-xs font-semibold shrink-0">Inscrito</span>
                                )}
                              </div>
                              {curso.descricao && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{curso.descricao}</p>}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* QUIZ */}
            {view === 'quiz' && (
              <>
                <button onClick={() => setView('curso')} className="flex items-center gap-1 text-sm text-petroleum/60 hover:text-petroleum font-medium mb-4 transition-colors">
                  <ChevronLeft size={16} /> Voltar ao curso
                </button>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
                  <h2 className="text-lg font-bold text-petroleum mb-1">Prova — {cursoAtual?.titulo}</h2>
                  <p className="text-xs text-gray-400">Responda todas as questões e clique em Enviar. Nota mínima: 70%.</p>
                </div>
                <div className="space-y-4 mb-6">
                  {questoes.map((q, i) => (
                    <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                      <p className="text-sm font-semibold text-petroleum mb-3">
                        <span className="text-petroleum/40 mr-2">{i + 1}.</span>{q.pergunta}
                      </p>
                      <div className="space-y-2">
                        {['a', 'b', 'c', 'd'].map(op => q[`opcao_${op}`] && (
                          <button key={op} onClick={() => setRespostas(r => ({ ...r, [q.id]: op }))}
                            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 text-sm transition-all ${respostas[q.id] === op ? 'border-oceano bg-oceano/10 text-petroleum font-semibold' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${respostas[q.id] === op ? 'bg-oceano text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {op.toUpperCase()}
                            </span>
                            {q[`opcao_${op}`]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={submeterQuiz}
                  disabled={submitting || Object.keys(respostas).length < questoes.length}
                  className="w-full bg-verde hover:bg-verde-light disabled:opacity-50 text-petroleum py-3 rounded-xl font-bold text-sm transition-colors shadow-sm">
                  {submitting ? 'Enviando...' : 'Enviar Respostas'}
                </button>
              </>
            )}

            {/* RESULTADO */}
            {view === 'resultado' && resultado && (
              <div className="max-w-md mx-auto text-center">
                <div className={`rounded-2xl p-8 shadow-sm border ${resultado.aprovado ? 'bg-verde/10 border-verde/30' : 'bg-red-50 border-red-100'}`}>
                  <div className="text-6xl mb-4">{resultado.aprovado ? '🎉' : '😔'}</div>
                  <h2 className={`text-2xl font-black mb-1 ${resultado.aprovado ? 'text-petroleum' : 'text-red-500'}`}>
                    {resultado.aprovado ? 'Aprovado!' : 'Não foi dessa vez'}
                  </h2>
                  <p className={`text-sm mb-5 ${resultado.aprovado ? 'text-petroleum/70' : 'text-red-400'}`}>
                    Você acertou {resultado.acertos} de {resultado.total} questões ({Math.round(resultado.nota * 100)}%)
                  </p>
                  {resultado.aprovado ? (() => {
                    const cert = certificados.find(c => c.curso_id === cursoAtual?.id)
                    return cert ? (
                      <button onClick={() => abrirCertificado(cert, cursoAtual)}
                        className="flex items-center gap-2 bg-laranja hover:bg-laranja-light text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors mx-auto mb-3">
                        <Award size={16} /> Ver Meu Certificado
                      </button>
                    ) : null
                  })() : (
                    <button onClick={abrirQuiz}
                      className="bg-oceano hover:bg-oceano/80 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors mx-auto mb-3 block">
                      Tentar Novamente
                    </button>
                  )}
                  <button onClick={() => setView('curso')} className="text-sm text-petroleum/60 hover:text-petroleum transition-colors mt-1 block mx-auto">
                    Voltar ao curso
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
