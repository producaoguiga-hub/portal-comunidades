import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, CheckCircle, LogOut, GraduationCap, Award, Download, Lock, Play, FileText } from 'lucide-react'

const NOTA_MINIMA = 0.7

const getEmbedUrl = (url) => {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return url
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

export default function PortalAluno() {
  const { alunoSession, signOut } = useAuth()
  const [view, setView] = useState('home')
  const [cursos, setCursos] = useState([])
  const [matriculas, setMatriculas] = useState([])
  const [certificados, setCertificados] = useState([])
  const [loading, setLoading] = useState(true)

  const [cursoAtual, setCursoAtual] = useState(null)
  const [aulas, setAulas] = useState([])
  const [progresso, setProgresso] = useState(new Set())

  const [questoes, setQuestoes] = useState([])
  const [respostas, setRespostas] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState(null)

  const [certAtual, setCertAtual] = useState(null)

  const load = async () => {
    setLoading(true)
    const [cursosRes, matriculasRes, certsRes] = await Promise.all([
      supabase.from('cursos').select('*').eq('ativo', true).order('created_at', { ascending: false }),
      supabase.from('matriculas').select('*').eq('aluno_id', alunoSession.alunoId),
      supabase.from('certificados').select('*, cursos(titulo)').eq('aluno_id', alunoSession.alunoId),
    ])
    setCursos(cursosRes.data ?? [])
    setMatriculas(matriculasRes.data ?? [])
    setCertificados(certsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const abrirCurso = async (curso) => {
    setCursoAtual(curso)
    setView('curso')
    setRespostas({})
    setResultado(null)

    const { data: aulasData } = await supabase.from('aulas').select('*').eq('curso_id', curso.id).order('ordem')
    setAulas(aulasData ?? [])

    let mat = matriculas.find(m => m.curso_id === curso.id)
    if (!mat) {
      const { data: newMat } = await supabase.from('matriculas')
        .insert({ aluno_id: alunoSession.alunoId, curso_id: curso.id })
        .select().single()
      if (newMat) setMatriculas(prev => [...prev, newMat])
    }

    const { data: progData } = await supabase.from('progresso_aulas')
      .select('aula_id').eq('aluno_id', alunoSession.alunoId)
    setProgresso(new Set((progData ?? []).map(p => p.aula_id)))
  }

  const concluirAula = async (aulaId) => {
    if (progresso.has(aulaId)) return
    await supabase.from('progresso_aulas').insert({ aluno_id: alunoSession.alunoId, aula_id: aulaId })
    setProgresso(prev => new Set([...prev, aulaId]))
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
      aluno_id: alunoSession.alunoId,
      curso_id: cursoAtual.id,
      respostas,
      acertos,
      total,
      aprovado,
    })

    if (aprovado) {
      const jaTemCert = certificados.find(c => c.curso_id === cursoAtual.id)
      if (!jaTemCert) {
        const { data: novoCert } = await supabase.from('certificados')
          .insert({ aluno_id: alunoSession.alunoId, curso_id: cursoAtual.id })
          .select().single()
        if (novoCert) setCertificados(prev => [...prev, { ...novoCert, cursos: { titulo: cursoAtual.titulo } }])
      }
      await supabase.from('matriculas').update({ status: 'concluido', concluido_em: new Date().toISOString() })
        .eq('aluno_id', alunoSession.alunoId).eq('curso_id', cursoAtual.id)
      setMatriculas(prev => prev.map(m => m.curso_id === cursoAtual.id ? { ...m, status: 'concluido' } : m))
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

  if (view === 'certificado' && certAtual) {
    return (
      <CertificadoView
        aluno={alunoSession}
        curso={cursoAtual ?? certAtual.cursos}
        cert={certAtual}
        onVoltar={() => setView(resultado ? 'resultado' : 'home')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-petroleum shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <img src="/logo-colorida.png" alt="Logo" className="h-10 object-contain" />
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

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── HOME ── */}
        {view === 'home' && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="w-1 h-7 bg-verde rounded-full" />
              <div>
                <h1 className="text-xl font-bold text-petroleum">Meus Cursos</h1>
                <p className="text-gray-400 text-sm">Escolha um curso para começar</p>
              </div>
            </div>

            {certificados.length > 0 && (
              <div className="bg-white rounded-xl border border-laranja/20 shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={15} className="text-laranja" />
                  <span className="text-sm font-bold text-petroleum uppercase tracking-wide">Certificados Conquistados</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {certificados.map(cert => (
                    <button key={cert.id} onClick={() => abrirCertificado(cert, cert.cursos)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-laranja/10 hover:bg-laranja/20 border border-laranja/20 rounded-lg text-sm text-petroleum font-medium transition-colors">
                      <Award size={13} className="text-laranja" />
                      {cert.cursos?.titulo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
            ) : cursos.length === 0 ? (
              <div className="py-14 text-center text-cinza text-sm">Nenhum curso disponível no momento.</div>
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
                            ) : mat ? (
                              <span className="px-2 py-0.5 bg-oceano/15 text-oceano rounded-full text-xs font-semibold shrink-0">Em andamento</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-xs font-semibold shrink-0">Não iniciado</span>
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

        {/* ── CURSO ── */}
        {view === 'curso' && cursoAtual && (
          <>
            <button onClick={() => setView('home')}
              className="flex items-center gap-1 text-sm text-petroleum/60 hover:text-petroleum font-medium mb-4 transition-colors">
              <ChevronLeft size={16} /> Meus Cursos
            </button>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-xl font-bold text-petroleum">{cursoAtual.titulo}</h2>
                {certDoCurso && (
                  <button onClick={() => abrirCertificado(certDoCurso, cursoAtual)}
                    className="flex items-center gap-1.5 bg-laranja/15 hover:bg-laranja/25 text-laranja px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0">
                    <Award size={13} /> Ver Certificado
                  </button>
                )}
              </div>
              {cursoAtual.descricao && <p className="text-sm text-gray-500">{cursoAtual.descricao}</p>}
              {aulas.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>{progresso.size} de {aulas.length} aulas concluídas</span>
                    <span>{Math.round((progresso.size / aulas.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-verde rounded-full transition-all duration-300"
                      style={{ width: `${(progresso.size / aulas.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4">
              {aulas.map((aula, i) => {
                const concluida = progresso.has(aula.id)
                const desbloqueada = i === 0 || progresso.has(aulas[i - 1]?.id)
                const embedUrl = getEmbedUrl(aula.video_url)
                return (
                  <div key={aula.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${!desbloqueada ? 'opacity-50 border-gray-100' : concluida ? 'border-verde/30' : 'border-gray-100'}`}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${concluida ? 'bg-verde text-petroleum' : desbloqueada ? 'bg-oceano/15 text-oceano' : 'bg-gray-100 text-gray-300'}`}>
                          {concluida ? <CheckCircle size={16} /> : desbloqueada ? <span className="text-sm font-bold">{i + 1}</span> : <Lock size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-petroleum text-sm">{aula.titulo}</p>
                          {aula.descricao && <p className="text-xs text-gray-400 mt-0.5">{aula.descricao}</p>}
                          {desbloqueada && (
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {aula.material_url && (
                                <a href={aula.material_url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-laranja hover:text-petroleum font-medium transition-colors">
                                  <FileText size={12} /> Baixar Material
                                </a>
                              )}
                              {!concluida ? (
                                <button onClick={() => concluirAula(aula.id)}
                                  className="flex items-center gap-1 text-xs bg-verde hover:bg-verde-light text-petroleum px-3 py-1 rounded-lg font-semibold transition-colors ml-auto">
                                  <CheckCircle size={12} /> Marcar como concluída
                                </button>
                              ) : (
                                <span className="text-xs text-verde font-semibold ml-auto flex items-center gap-1">
                                  <CheckCircle size={12} /> Concluída
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {desbloqueada && embedUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          <iframe src={embedUrl} className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen title={aula.titulo} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {todasAulasConcluidas && !certDoCurso && (
              <div className="bg-oceano/10 border border-oceano/20 rounded-xl p-5 text-center">
                <p className="text-sm text-petroleum font-semibold mb-1">Parabéns! Você concluiu todas as aulas.</p>
                <p className="text-xs text-gray-500 mb-3">Agora faça a prova para conquistar seu certificado.</p>
                <button onClick={abrirQuiz}
                  className="bg-verde hover:bg-verde-light text-petroleum px-6 py-2 rounded-lg text-sm font-bold transition-colors">
                  Fazer Prova
                </button>
              </div>
            )}
          </>
        )}

        {/* ── QUIZ ── */}
        {view === 'quiz' && (
          <>
            <button onClick={() => setView('curso')}
              className="flex items-center gap-1 text-sm text-petroleum/60 hover:text-petroleum font-medium mb-4 transition-colors">
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

        {/* ── RESULTADO ── */}
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
              <button onClick={() => setView('curso')}
                className="text-sm text-petroleum/60 hover:text-petroleum transition-colors mt-1 block mx-auto">
                Voltar ao curso
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
