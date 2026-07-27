import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, BookOpen, Play, FileText, ChevronLeft, Edit2, Trash2, GraduationCap, CheckCircle, Users, HelpCircle, Layers, Clock } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const TIPOS = [
  { id: 'youtube', label: 'YouTube', icon: Play, color: 'text-red-500' },
  { id: 'video', label: 'Vídeo', icon: Play, color: 'text-blue-500' },
  { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-orange-500' },
]

const emptyCurso = { titulo: '', descricao: '', thumbnail_url: '', ativo: true }
const emptyAula = { titulo: '', descricao: '', video_url: '', material_url: '', ordem: 1, tipo: 'youtube', capitulo_id: '', duracao_horas: '' }
const emptyQuestao = { pergunta: '', opcao_a: '', opcao_b: '', opcao_c: '', opcao_d: '', resposta_correta: 'a', ordem: 1 }
const emptyCapitulo = { titulo: '', ordem: 1 }

const urlPlaceholder = { youtube: 'https://youtube.com/watch?v=...', video: 'https://... (link direto MP4)', pdf: 'https://drive.google.com/... (PDF público)' }
const urlLabel = { youtube: 'URL do YouTube', video: 'URL do Vídeo (MP4)', pdf: 'URL do PDF' }

function AulaRow({ a, i, onEdit, onDelete, tipoInfo }) {
  const t = tipoInfo(a.tipo)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-oceano/15 text-oceano font-bold text-sm shrink-0">{i + 1}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-petroleum text-sm">{a.titulo}</p>
        {a.descricao && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.descricao}</p>}
        <div className="flex items-center gap-3 mt-1">
          {a.video_url && (
            <span className={`flex items-center gap-1 text-xs font-medium ${t.colorCls}`}>
              {a.tipo === 'pdf' ? <FileText size={10} /> : <Play size={10} />} {t.label}
            </span>
          )}
          {a.material_url && <span className="flex items-center gap-1 text-xs text-laranja font-medium"><FileText size={10} /> Material</span>}
          {!!a.duracao_horas && (
            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium"><Clock size={10} /> {a.duracao_horas}h</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(a)} className="p-1.5 text-oceano hover:bg-oceano/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
        <button onClick={() => onDelete(a.id)} className="p-1.5 text-laranja hover:bg-laranja/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

export default function CursosEAD() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCurso, setModalCurso] = useState(false)
  const [formCurso, setFormCurso] = useState(emptyCurso)
  const [editCursoId, setEditCursoId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [cursoDetalhe, setCursoDetalhe] = useState(null)
  const [detalheTab, setDetalheTab] = useState('aulas')

  const [aulas, setAulas] = useState([])
  const [modalAula, setModalAula] = useState(false)
  const [formAula, setFormAula] = useState(emptyAula)
  const [editAulaId, setEditAulaId] = useState(null)

  const [capitulos, setCapitulos] = useState([])
  const [modalCapitulo, setModalCapitulo] = useState(false)
  const [formCapitulo, setFormCapitulo] = useState(emptyCapitulo)
  const [editCapituloId, setEditCapituloId] = useState(null)

  const [questoes, setQuestoes] = useState([])
  const [modalQuestao, setModalQuestao] = useState(false)
  const [formQuestao, setFormQuestao] = useState(emptyQuestao)
  const [editQuestaoId, setEditQuestaoId] = useState(null)

  const [inscritos, setInscritos] = useState([])

  const [modalInscreverAluno, setModalInscreverAluno] = useState(false)
  const [todosAlunos, setTodosAlunos] = useState([])
  const [alunoIdParaInscrever, setAlunoIdParaInscrever] = useState('')
  const [inscrevendo, setInscrevendo] = useState(false)

  const loadCursos = async () => {
    setLoading(true)
    const { data } = await supabase.from('cursos').select('*').order('created_at', { ascending: false })
    setCursos(data ?? [])
    setLoading(false)
  }

  const loadDetalhe = async (curso) => {
    setCursoDetalhe(curso)
    setDetalheTab('aulas')
    const [aulasRes, questoesRes, inscritosRes, capitulosRes] = await Promise.all([
      supabase.from('aulas').select('*').eq('curso_id', curso.id).order('ordem'),
      supabase.from('questoes').select('*').eq('curso_id', curso.id).order('ordem'),
      supabase.from('matriculas').select('*, alunos(nome, cpf, comunidades(nome))').eq('curso_id', curso.id).order('iniciado_em', { ascending: false }),
      supabase.from('capitulos').select('*').eq('curso_id', curso.id).order('ordem'),
    ])
    setAulas(aulasRes.data ?? [])
    setQuestoes(questoesRes.data ?? [])
    setInscritos(inscritosRes.data ?? [])
    setCapitulos(capitulosRes.data ?? [])
  }

  useEffect(() => { loadCursos() }, [])

  const openCriarCurso = () => { setFormCurso(emptyCurso); setEditCursoId(null); setModalCurso(true) }
  const openEditCurso = (c) => {
    setFormCurso({ titulo: c.titulo, descricao: c.descricao ?? '', thumbnail_url: c.thumbnail_url ?? '', ativo: c.ativo })
    setEditCursoId(c.id)
    setModalCurso(true)
  }
  const handleSaveCurso = async (e) => {
    e.preventDefault(); setSaving(true)
    const payload = { titulo: formCurso.titulo, descricao: formCurso.descricao || null, thumbnail_url: formCurso.thumbnail_url || null, ativo: formCurso.ativo }
    if (editCursoId) await supabase.from('cursos').update(payload).eq('id', editCursoId)
    else await supabase.from('cursos').insert(payload)
    setSaving(false); setModalCurso(false); loadCursos()
  }
  const handleDeleteCurso = async (id) => {
    if (!confirm('Excluir curso e todo seu conteúdo?')) return
    await supabase.from('cursos').delete().eq('id', id); loadCursos()
  }
  const toggleAtivo = async (curso) => {
    await supabase.from('cursos').update({ ativo: !curso.ativo }).eq('id', curso.id)
    loadCursos()
    if (cursoDetalhe?.id === curso.id) setCursoDetalhe(prev => ({ ...prev, ativo: !prev.ativo }))
  }

  const openCriarAula = (capituloId = '') => { setFormAula({ ...emptyAula, ordem: aulas.length + 1, capitulo_id: capituloId }); setEditAulaId(null); setModalAula(true) }
  const openEditAula = (a) => {
    setFormAula({ titulo: a.titulo, descricao: a.descricao ?? '', video_url: a.video_url ?? '', material_url: a.material_url ?? '', ordem: a.ordem, tipo: a.tipo || 'youtube', capitulo_id: a.capitulo_id ?? '', duracao_horas: a.duracao_horas ?? '' })
    setEditAulaId(a.id); setModalAula(true)
  }
  const handleSaveAula = async (e) => {
    e.preventDefault(); setSaving(true)
    const payload = {
      curso_id: cursoDetalhe.id, titulo: formAula.titulo, descricao: formAula.descricao || null,
      video_url: formAula.video_url || null, material_url: formAula.material_url || null,
      ordem: Number(formAula.ordem), tipo: formAula.tipo,
      capitulo_id: formAula.capitulo_id || null,
      duracao_horas: formAula.duracao_horas === '' ? 0 : Number(formAula.duracao_horas),
    }
    if (editAulaId) await supabase.from('aulas').update(payload).eq('id', editAulaId)
    else await supabase.from('aulas').insert(payload)
    setSaving(false); setModalAula(false)
    const { data } = await supabase.from('aulas').select('*').eq('curso_id', cursoDetalhe.id).order('ordem')
    setAulas(data ?? [])
  }
  const handleDeleteAula = async (id) => {
    if (!confirm('Excluir aula?')) return
    await supabase.from('aulas').delete().eq('id', id); setAulas(prev => prev.filter(a => a.id !== id))
  }

  const openCriarCapitulo = () => { setFormCapitulo({ titulo: '', ordem: capitulos.length + 1 }); setEditCapituloId(null); setModalCapitulo(true) }
  const openEditCapitulo = (c) => { setFormCapitulo({ titulo: c.titulo, ordem: c.ordem }); setEditCapituloId(c.id); setModalCapitulo(true) }
  const handleSaveCapitulo = async (e) => {
    e.preventDefault(); setSaving(true)
    const payload = { curso_id: cursoDetalhe.id, titulo: formCapitulo.titulo, ordem: Number(formCapitulo.ordem) }
    if (editCapituloId) await supabase.from('capitulos').update(payload).eq('id', editCapituloId)
    else await supabase.from('capitulos').insert(payload)
    setSaving(false); setModalCapitulo(false)
    const { data } = await supabase.from('capitulos').select('*').eq('curso_id', cursoDetalhe.id).order('ordem')
    setCapitulos(data ?? [])
  }
  const handleDeleteCapitulo = async (id) => {
    if (!confirm('Excluir capítulo? As aulas dele ficam sem capítulo, mas não são excluídas.')) return
    await supabase.from('capitulos').delete().eq('id', id)
    setCapitulos(prev => prev.filter(c => c.id !== id))
    setAulas(prev => prev.map(a => a.capitulo_id === id ? { ...a, capitulo_id: null } : a))
  }

  const openCriarQuestao = () => { setFormQuestao({ ...emptyQuestao, ordem: questoes.length + 1 }); setEditQuestaoId(null); setModalQuestao(true) }
  const openEditQuestao = (q) => {
    setFormQuestao({ pergunta: q.pergunta, opcao_a: q.opcao_a, opcao_b: q.opcao_b, opcao_c: q.opcao_c ?? '', opcao_d: q.opcao_d ?? '', resposta_correta: q.resposta_correta, ordem: q.ordem })
    setEditQuestaoId(q.id); setModalQuestao(true)
  }
  const handleSaveQuestao = async (e) => {
    e.preventDefault(); setSaving(true)
    const payload = { curso_id: cursoDetalhe.id, pergunta: formQuestao.pergunta, opcao_a: formQuestao.opcao_a, opcao_b: formQuestao.opcao_b, opcao_c: formQuestao.opcao_c || null, opcao_d: formQuestao.opcao_d || null, resposta_correta: formQuestao.resposta_correta, ordem: Number(formQuestao.ordem) }
    if (editQuestaoId) await supabase.from('questoes').update(payload).eq('id', editQuestaoId)
    else await supabase.from('questoes').insert(payload)
    setSaving(false); setModalQuestao(false)
    const { data } = await supabase.from('questoes').select('*').eq('curso_id', cursoDetalhe.id).order('ordem')
    setQuestoes(data ?? [])
  }
  const handleDeleteQuestao = async (id) => {
    if (!confirm('Excluir questão?')) return
    await supabase.from('questoes').delete().eq('id', id); setQuestoes(prev => prev.filter(q => q.id !== id))
  }

  const openInscreverAluno = async () => {
    setAlunoIdParaInscrever('')
    const { data } = await supabase.from('alunos').select('id, nome, cpf, comunidades(nome)').order('nome')
    const inscritosIds = inscritos.map(i => i.aluno_id)
    setTodosAlunos((data ?? []).filter(a => !inscritosIds.includes(a.id)))
    setModalInscreverAluno(true)
  }

  const handleInscreverAluno = async () => {
    if (!alunoIdParaInscrever || !cursoDetalhe) return
    setInscrevendo(true)
    await supabase.from('matriculas').insert({ aluno_id: alunoIdParaInscrever, curso_id: cursoDetalhe.id })
    setInscrevendo(false)
    setModalInscreverAluno(false)
    const { data } = await supabase.from('matriculas').select('*, alunos(nome, cpf, comunidades(nome))').eq('curso_id', cursoDetalhe.id).order('iniciado_em', { ascending: false })
    setInscritos(data ?? [])
  }

  const tipoInfo = (tipo) => {
    if (tipo === 'pdf') return { label: 'PDF', colorCls: 'text-orange-500' }
    if (tipo === 'video') return { label: 'Vídeo', colorCls: 'text-blue-500' }
    return { label: 'YouTube', colorCls: 'text-red-500' }
  }

  // ── DETALHE DO CURSO ──
  if (cursoDetalhe) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setCursoDetalhe(null)} className="flex items-center gap-1 text-sm text-petroleum/60 hover:text-petroleum transition-colors font-medium">
            <ChevronLeft size={16} /> Cursos
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-1 h-7 bg-oceano rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-petroleum">{cursoDetalhe.titulo}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cursoDetalhe.ativo ? 'bg-verde/30 text-petroleum' : 'bg-gray-100 text-gray-400'}`}>
                  {cursoDetalhe.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <button onClick={() => toggleAtivo(cursoDetalhe)} className="text-xs text-oceano hover:text-petroleum transition-colors font-medium">
                  {cursoDetalhe.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { id: 'aulas', label: `Aulas (${aulas.length})`, icon: Play },
            { id: 'quiz', label: `Quiz (${questoes.length})`, icon: HelpCircle },
            { id: 'inscritos', label: `Inscritos (${inscritos.length})`, icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setDetalheTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${detalheTab === id ? 'bg-petroleum text-verde shadow-sm' : 'text-gray-400 hover:text-petroleum'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {detalheTab === 'aulas' && (
          <div>
            <div className="flex justify-end gap-2 mb-3">
              <button onClick={openCriarCapitulo} className="flex items-center gap-2 border-2 border-oceano text-oceano hover:bg-oceano/10 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Layers size={14} /> Novo Capítulo
              </button>
              <button onClick={() => openCriarAula()} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Plus size={14} /> Nova Aula
              </button>
            </div>

            {aulas.length === 0 && capitulos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-14 text-center text-cinza text-sm">Nenhuma aula cadastrada ainda.</div>
            ) : (
              <div className="space-y-5">
                {capitulos.map(cap => {
                  const aulasDoCapitulo = aulas.filter(a => a.capitulo_id === cap.id)
                  return (
                    <div key={cap.id}>
                      <div className="flex items-center justify-between gap-2 mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-oceano" />
                          <h4 className="font-bold text-petroleum text-sm">{cap.titulo}</h4>
                          <span className="text-xs text-gray-400">{aulasDoCapitulo.length} aula{aulasDoCapitulo.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openCriarAula(cap.id)} className="text-xs text-verde-light font-semibold hover:text-petroleum transition-colors px-2 py-1">+ Aula</button>
                          <button onClick={() => openEditCapitulo(cap)} className="p-1.5 text-oceano hover:bg-oceano/10 rounded-lg transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteCapitulo(cap.id)} className="p-1.5 text-laranja hover:bg-laranja/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {aulasDoCapitulo.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-6 text-center text-cinza text-xs">Nenhuma aula neste capítulo ainda.</div>
                      ) : (
                        <div className="space-y-2">
                          {aulasDoCapitulo.map((a, i) => <AulaRow key={a.id} a={a} i={i} onEdit={openEditAula} onDelete={handleDeleteAula} tipoInfo={tipoInfo} />)}
                        </div>
                      )}
                    </div>
                  )
                })}

                {(() => {
                  const semCapitulo = aulas.filter(a => !a.capitulo_id)
                  if (semCapitulo.length === 0) return null
                  return (
                    <div>
                      {capitulos.length > 0 && <h4 className="font-bold text-gray-400 text-sm mb-2 px-1">Sem capítulo</h4>}
                      <div className="space-y-2">
                        {semCapitulo.map((a, i) => <AulaRow key={a.id} a={a} i={i} onEdit={openEditAula} onDelete={handleDeleteAula} tipoInfo={tipoInfo} />)}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {detalheTab === 'quiz' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Nota mínima para aprovação: <strong className="text-petroleum">70%</strong></p>
              <button onClick={openCriarQuestao} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Plus size={14} /> Nova Questão
              </button>
            </div>
            {questoes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-14 text-center text-cinza text-sm">Nenhuma questão cadastrada ainda.</div>
            ) : (
              <div className="space-y-2">
                {questoes.map((q, i) => (
                  <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold text-petroleum/40 shrink-0 mt-0.5">{i + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-petroleum">{q.pergunta}</p>
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          {['a', 'b', 'c', 'd'].map(op => q[`opcao_${op}`] && (
                            <div key={op} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${q.resposta_correta === op ? 'bg-verde/20 text-petroleum font-semibold' : 'text-gray-500'}`}>
                              <span className={`font-bold ${q.resposta_correta === op ? 'text-verde' : 'text-gray-300'}`}>{op.toUpperCase()})</span>
                              {q[`opcao_${op}`]}
                              {q.resposta_correta === op && <CheckCircle size={11} className="text-verde ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditQuestao(q)} className="p-1.5 text-oceano hover:bg-oceano/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteQuestao(q.id)} className="p-1.5 text-laranja hover:bg-laranja/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {detalheTab === 'inscritos' && (
          <div>
            <div className="flex justify-end mb-3">
              <button onClick={openInscreverAluno} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Plus size={14} /> Inscrever Aluno
              </button>
            </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {inscritos.length === 0 ? (
              <div className="py-14 text-center text-cinza text-sm">Nenhum aluno inscrito ainda.</div>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-petroleum/5 border-b text-xs font-semibold text-petroleum/70 uppercase tracking-wider">
                  <span className="col-span-4">Aluno</span>
                  <span className="col-span-3">Comunidade</span>
                  <span className="col-span-2 text-center">Status</span>
                  <span className="col-span-3 text-right">Inscrito em</span>
                </div>
                {inscritos.map(m => (
                  <div key={m.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b last:border-0 hover:bg-verde/5">
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-petroleum">{m.alunos?.nome ?? '—'}</p>
                      <p className="text-xs text-gray-400">{m.alunos?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') ?? ''}</p>
                    </div>
                    <span className="col-span-3 text-xs text-gray-500">{m.alunos?.comunidades?.nome ?? '—'}</span>
                    <div className="col-span-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.status === 'concluido' ? 'bg-verde/30 text-petroleum' : 'bg-laranja/15 text-laranja'}`}>
                        {m.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                      </span>
                    </div>
                    <span className="col-span-3 text-xs text-gray-400 text-right">{new Date(m.iniciado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}

        {modalInscreverAluno && (
          <Modal title="Inscrever Aluno no Curso" onClose={() => setModalInscreverAluno(false)}>
            <div className="space-y-4">
              {todosAlunos.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Todos os alunos cadastrados já estão inscritos neste curso.</p>
              ) : (
                <div>
                  <label className={labelCls}>Selecione o aluno</label>
                  <select value={alunoIdParaInscrever} onChange={e => setAlunoIdParaInscrever(e.target.value)} className={inputCls}>
                    <option value="">— Escolha um aluno —</option>
                    {todosAlunos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome}{a.comunidades?.nome ? ` — ${a.comunidades.nome}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setModalInscreverAluno(false)}
                  className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                {todosAlunos.length > 0 && (
                  <button onClick={handleInscreverAluno} disabled={!alunoIdParaInscrever || inscrevendo}
                    className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                    {inscrevendo ? 'Inscrevendo...' : 'Inscrever'}
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {modalAula && (
          <Modal title={editAulaId ? 'Editar Aula' : 'Nova Aula'} onClose={() => setModalAula(false)}>
            <form onSubmit={handleSaveAula} className="space-y-4">
              <div>
                <label className={labelCls}>Título *</label>
                <input value={formAula.titulo} onChange={e => setFormAula(f => ({ ...f, titulo: e.target.value }))}
                  required className={inputCls} placeholder="Ex: Introdução ao curso" />
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea value={formAula.descricao} onChange={e => setFormAula(f => ({ ...f, descricao: e.target.value }))}
                  rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Tipo de Conteúdo</label>
                <div className="flex gap-2">
                  {TIPOS.map(t => (
                    <button key={t.id} type="button" onClick={() => setFormAula(f => ({ ...f, tipo: t.id }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${formAula.tipo === t.id ? 'border-oceano bg-oceano/10 text-petroleum' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                      <t.icon size={13} className={formAula.tipo === t.id ? '' : ''} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>{urlLabel[formAula.tipo]}</label>
                <input value={formAula.video_url} onChange={e => setFormAula(f => ({ ...f, video_url: e.target.value }))}
                  className={inputCls} placeholder={urlPlaceholder[formAula.tipo]} />
              </div>
              <div>
                <label className={labelCls}>URL do Material Extra (PDF / Drive)</label>
                <input value={formAula.material_url} onChange={e => setFormAula(f => ({ ...f, material_url: e.target.value }))}
                  className={inputCls} placeholder="https://drive.google.com/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Capítulo</label>
                  <select value={formAula.capitulo_id} onChange={e => setFormAula(f => ({ ...f, capitulo_id: e.target.value }))} className={inputCls}>
                    <option value="">— Sem capítulo —</option>
                    {capitulos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Carga horária (h)</label>
                  <input type="number" min={0} step="0.5" value={formAula.duracao_horas}
                    onChange={e => setFormAula(f => ({ ...f, duracao_horas: e.target.value }))} className={inputCls} placeholder="Ex: 1.5" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Ordem</label>
                <input type="number" min={1} value={formAula.ordem} onChange={e => setFormAula(f => ({ ...f, ordem: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAula(false)} className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {modalCapitulo && (
          <Modal title={editCapituloId ? 'Editar Capítulo' : 'Novo Capítulo'} onClose={() => setModalCapitulo(false)}>
            <form onSubmit={handleSaveCapitulo} className="space-y-4">
              <div>
                <label className={labelCls}>Título *</label>
                <input value={formCapitulo.titulo} onChange={e => setFormCapitulo(f => ({ ...f, titulo: e.target.value }))}
                  required className={inputCls} placeholder="Ex: Introdução" />
              </div>
              <div>
                <label className={labelCls}>Ordem</label>
                <input type="number" min={1} value={formCapitulo.ordem} onChange={e => setFormCapitulo(f => ({ ...f, ordem: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCapitulo(false)} className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {modalQuestao && (
          <Modal title={editQuestaoId ? 'Editar Questão' : 'Nova Questão'} onClose={() => setModalQuestao(false)}>
            <form onSubmit={handleSaveQuestao} className="space-y-4">
              <div>
                <label className={labelCls}>Pergunta *</label>
                <textarea value={formQuestao.pergunta} onChange={e => setFormQuestao(f => ({ ...f, pergunta: e.target.value }))}
                  required rows={3} className={`${inputCls} resize-none`} placeholder="Digite a pergunta..." />
              </div>
              {['a', 'b', 'c', 'd'].map(op => (
                <div key={op}>
                  <label className={labelCls}>Opção {op.toUpperCase()} {op === 'a' || op === 'b' ? '*' : '(opcional)'}</label>
                  <div className="flex gap-2 items-center">
                    <input value={formQuestao[`opcao_${op}`]} onChange={e => setFormQuestao(f => ({ ...f, [`opcao_${op}`]: e.target.value }))}
                      required={op === 'a' || op === 'b'} className={inputCls} placeholder={`Texto da opção ${op.toUpperCase()}`} />
                    <button type="button" onClick={() => setFormQuestao(f => ({ ...f, resposta_correta: op }))}
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${formQuestao.resposta_correta === op ? 'bg-verde border-verde text-petroleum' : 'border-gray-200 text-gray-300 hover:border-verde hover:text-verde'}`}>
                      ✓
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">Clique no ✓ ao lado da opção correta.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalQuestao(false)} className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    )
  }

  // ── LISTA DE CURSOS ──
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Cursos EAD</h1>
            <p className="text-gray-400 text-sm">Gestão de cursos, aulas e certificações</p>
          </div>
        </div>
        <button onClick={openCriarCurso} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Novo Curso
        </button>
      </div>

      {loading ? (
        <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
      ) : cursos.length === 0 ? (
        <div className="py-14 text-center text-cinza text-sm flex flex-col items-center gap-3">
          <GraduationCap size={36} className="text-gray-200" />
          <p>Nenhum curso cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cursos.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {c.thumbnail_url ? (
                <div className="h-32 overflow-hidden"><img src={c.thumbnail_url} alt={c.titulo} className="w-full h-full object-cover" /></div>
              ) : (
                <div className="h-24 bg-gradient-to-br from-oceano/20 to-verde/20 flex items-center justify-center">
                  <BookOpen size={28} className="text-oceano/50" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-petroleum text-sm leading-tight">{c.titulo}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${c.ativo ? 'bg-verde/30 text-petroleum' : 'bg-gray-100 text-gray-400'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {c.descricao && <p className="text-xs text-gray-400 line-clamp-2 mb-3">{c.descricao}</p>}
                <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
                  <button onClick={() => loadDetalhe(c)} className="flex-1 text-xs bg-petroleum hover:bg-petroleum/80 text-verde px-3 py-1.5 rounded-lg font-semibold transition-colors text-center">Gerenciar</button>
                  <button onClick={() => openEditCurso(c)} className="p-1.5 text-oceano hover:bg-oceano/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDeleteCurso(c.id)} className="p-1.5 text-laranja hover:bg-laranja/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalCurso && (
        <Modal title={editCursoId ? 'Editar Curso' : 'Novo Curso'} onClose={() => setModalCurso(false)}>
          <form onSubmit={handleSaveCurso} className="space-y-4">
            <div>
              <label className={labelCls}>Título *</label>
              <input value={formCurso.titulo} onChange={e => setFormCurso(f => ({ ...f, titulo: e.target.value }))}
                required className={inputCls} placeholder="Ex: NR-10 — Segurança em Instalações Elétricas" />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={formCurso.descricao} onChange={e => setFormCurso(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`} placeholder="Sobre o curso..." />
            </div>
            <div>
              <label className={labelCls}>URL da Thumbnail</label>
              <input value={formCurso.thumbnail_url} onChange={e => setFormCurso(f => ({ ...f, thumbnail_url: e.target.value }))}
                className={inputCls} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="ativo" checked={formCurso.ativo} onChange={e => setFormCurso(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 accent-verde rounded" />
              <label htmlFor="ativo" className="text-sm text-petroleum font-medium cursor-pointer">Curso ativo (visível para alunos)</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalCurso(false)} className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
