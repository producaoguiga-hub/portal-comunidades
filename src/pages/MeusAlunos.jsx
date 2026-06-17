import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { Plus, Eye, EyeOff, GraduationCap, BookOpen, Award, Edit2, Trash2, BookMarked } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'
const LIMITE = 5

const BADGES = {
  primeiro_passo: { label: 'Primeiro Passo', emoji: '🎯' },
  nota_perfeita: { label: 'Nota Perfeita', emoji: '⭐' },
  graduado: { label: 'Graduado', emoji: '🎓' },
  maratonista: { label: 'Maratonista', emoji: '🏃' },
}

const formatCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const displayCPF = (cpf, full = false) => {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length < 11) return cpf
  if (full) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`
}

const getSemestre = () => {
  const now = new Date()
  const year = now.getFullYear()
  const half = now.getMonth() < 6 ? 1 : 2
  const inicio = half === 1 ? `${year}-01-01` : `${year}-07-01`
  const fim = half === 1 ? `${year}-06-30T23:59:59` : `${year}-12-31T23:59:59`
  return { half, year, inicio, fim, label: `${half}º semestre/${year}` }
}

const avatarColors = ['bg-oceano/20 text-oceano', 'bg-verde/40 text-petroleum', 'bg-laranja/20 text-laranja', 'bg-petroleum/10 text-petroleum']
const getInitials = (nome) => nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const getAvatarColor = (nome) => avatarColors[nome.charCodeAt(0) % avatarColors.length]

const emptyForm = { nome: '', cpf: '', pin: '', associacao_id: '', comunidade_id: '' }

export default function MeusAlunos() {
  const { liderSession, role } = useAuth()
  const isAdmin = role === 'admin'
  const semestre = getSemestre()

  const [alunos, setAlunos] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [associacoes, setAssociacoes] = useState([])
  const [cursos, setCursos] = useState([])
  const [matriculas, setMatriculas] = useState({})
  const [conquistas, setConquistas] = useState({})
  const [countSemestre, setCountSemestre] = useState(0)
  const [loading, setLoading] = useState(true)

  // Modal cadastro / edição
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [filtroCom, setFiltroCom] = useState('')

  // Modal inscrição em curso
  const [modalInscrever, setModalInscrever] = useState(false)
  const [alunoInscrever, setAlunoInscrever] = useState(null)
  const [cursoSelecionado, setCursoSelecionado] = useState('')
  const [matAluno, setMatAluno] = useState([])
  const [inscrevendo, setInscrevendo] = useState(false)

  const comunidadeId = liderSession?.comunidadeId

  const load = async () => {
    setLoading(true)
    const cursosRes = await supabase.from('cursos').select('id, titulo').eq('ativo', true).order('titulo')
    setCursos(cursosRes.data ?? [])

    if (isAdmin) {
      const [alunosRes, comRes, assocRes] = await Promise.all([
        supabase.from('alunos').select('*, comunidades(nome), associacoes(nome, sigla)').order('nome'),
        supabase.from('comunidades').select('id, nome').order('nome'),
        supabase.from('associacoes').select('id, nome, sigla, comunidade_id').order('nome'),
      ])
      const lista = alunosRes.data ?? []
      setAlunos(lista)
      setComunidades(comRes.data ?? [])
      setAssociacoes(assocRes.data ?? [])
      if (lista.length > 0) await loadExtras(lista)
    } else {
      const [alunosRes, assocRes, countRes] = await Promise.all([
        supabase.from('alunos').select('*').eq('comunidade_id', comunidadeId).order('nome'),
        supabase.from('associacoes').select('id, nome, sigla').eq('comunidade_id', comunidadeId).order('nome'),
        supabase.from('alunos').select('*', { count: 'exact', head: true })
          .eq('comunidade_id', comunidadeId)
          .gte('created_at', semestre.inicio)
          .lte('created_at', semestre.fim),
      ])
      const lista = alunosRes.data ?? []
      setAlunos(lista)
      setAssociacoes(assocRes.data ?? [])
      setCountSemestre(countRes.count ?? 0)
      if (lista.length > 0) await loadExtras(lista)
    }
    setLoading(false)
  }

  const loadExtras = async (lista) => {
    const ids = lista.map(a => a.id)
    const [matRes, conquRes] = await Promise.all([
      supabase.from('matriculas').select('*, cursos(titulo)').in('aluno_id', ids),
      supabase.from('conquistas').select('aluno_id, tipo').in('aluno_id', ids),
    ])
    const matMap = {}
    for (const m of matRes.data ?? []) {
      if (!matMap[m.aluno_id]) matMap[m.aluno_id] = []
      matMap[m.aluno_id].push(m)
    }
    const conqMap = {}
    for (const c of conquRes.data ?? []) {
      if (!conqMap[c.aluno_id]) conqMap[c.aluno_id] = []
      conqMap[c.aluno_id].push(c.tipo)
    }
    setMatriculas(matMap)
    setConquistas(conqMap)
  }

  useEffect(() => { load() }, [])

  const bloqueado = !isAdmin && countSemestre >= LIMITE
  const slotsRestantes = LIMITE - countSemestre

  const assocsFiltradas = isAdmin
    ? associacoes.filter(a => !form.comunidade_id || a.comunidade_id === form.comunidade_id)
    : associacoes

  const alunosFiltrados = isAdmin && filtroCom
    ? alunos.filter(a => a.comunidade_id === filtroCom)
    : alunos

  // ── Cadastro / Edição ──
  const openCreate = () => { setForm(emptyForm); setEditId(null); setError(''); setShowPin(false); setModal(true) }
  const openEdit = (a) => {
    setForm({ nome: a.nome, cpf: displayCPF(a.cpf, true), pin: '', associacao_id: a.associacao_id ?? '', comunidade_id: a.comunidade_id ?? '' })
    setEditId(a.id); setError(''); setShowPin(false); setModal(true)
  }

  const handleDelete = async (a) => {
    if (!confirm(`Excluir o aluno "${a.nome}"? Isso remove todo o histórico de cursos e certificados.`)) return
    await supabase.from('alunos').delete().eq('id', a.id)
    load()
  }

  const handleSave = async (e) => {
    e.preventDefault(); setError('')
    if (!editId && bloqueado) return
    setSaving(true)
    const cpfClean = form.cpf.replace(/\D/g, '')
    if (editId) {
      const payload = { nome: form.nome, cpf: cpfClean, associacao_id: form.associacao_id || null }
      if (isAdmin) payload.comunidade_id = form.comunidade_id || null
      if (form.pin) payload.pin = form.pin
      const { error: err } = await supabase.from('alunos').update(payload).eq('id', editId)
      if (err) { setError(err.code === '23505' ? 'Este CPF já está em uso.' : err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('alunos').insert({
        nome: form.nome, cpf: cpfClean, pin: form.pin,
        comunidade_id: isAdmin ? (form.comunidade_id || null) : comunidadeId,
        associacao_id: form.associacao_id || null,
      })
      if (err) { setError(err.code === '23505' ? 'Este CPF já está cadastrado.' : err.message); setSaving(false); return }
    }
    setSaving(false); setModal(false); load()
  }

  // ── Inscrição em curso ──
  const openInscrever = async (a) => {
    setAlunoInscrever(a)
    setCursoSelecionado('')
    const { data } = await supabase.from('matriculas').select('curso_id').eq('aluno_id', a.id)
    setMatAluno((data ?? []).map(m => m.curso_id))
    setModalInscrever(true)
  }

  const handleInscrever = async () => {
    if (!cursoSelecionado || !alunoInscrever) return
    setInscrevendo(true)
    await supabase.from('matriculas').insert({ aluno_id: alunoInscrever.id, curso_id: cursoSelecionado })
    setInscrevendo(false)
    setModalInscrever(false)
    load()
  }

  const cursosDisponiveis = cursos.filter(c => !matAluno.includes(c.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Alunos EAD</h1>
            <p className="text-gray-400 text-sm">
              {isAdmin ? 'Todos os alunos cadastrados no sistema' : 'Gerencie os alunos da sua comunidade'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={openCreate} disabled={bloqueado}
            className="flex items-center gap-2 bg-verde hover:bg-verde-light disabled:opacity-40 disabled:cursor-not-allowed text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> Novo Aluno
          </button>
          {bloqueado && <p className="text-xs text-laranja font-medium">Limite do semestre atingido.</p>}
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-oceano" />
            <span className="text-sm font-semibold text-petroleum">{semestre.label}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex gap-1">
              {Array.from({ length: LIMITE }).map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < countSemestre ? 'bg-oceano text-white' : 'bg-gray-100 text-gray-300'}`}>
                  {i + 1}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-2">
              {slotsRestantes > 0 ? `${slotsRestantes} vaga${slotsRestantes !== 1 ? 's' : ''} restante${slotsRestantes !== 1 ? 's' : ''}` : 'Limite atingido'}
            </span>
          </div>
        </div>
      )}

      {isAdmin && comunidades.length > 0 && (
        <div className="mb-4">
          <select value={filtroCom} onChange={e => setFiltroCom(e.target.value)}
            className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano">
            <option value="">Todas as comunidades ({alunos.length} alunos)</option>
            {comunidades.map(c => (
              <option key={c.id} value={c.id}>{c.nome} ({alunos.filter(a => a.comunidade_id === c.id).length} alunos)</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="py-14 text-center text-cinza text-sm">Nenhum aluno cadastrado ainda.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alunosFiltrados.map(a => {
            const mats = matriculas[a.id] ?? []
            const badges = conquistas[a.id] ?? []
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(a.nome)}`}>
                    {getInitials(a.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-petroleum text-sm leading-tight">{a.nome}</p>
                    <p className="text-xs text-gray-400 font-mono">{displayCPF(a.cpf, isAdmin)}</p>
                    {isAdmin && a.comunidades?.nome && (
                      <p className="text-xs text-oceano mt-0.5 font-medium">{a.comunidades.nome}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openInscrever(a)} title="Inscrever em curso"
                      className="p-1.5 text-verde hover:bg-verde/10 rounded-lg transition-colors">
                      <BookMarked size={14} />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(a)} title="Editar"
                          className="p-1.5 text-oceano hover:bg-oceano/10 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(a)} title="Excluir"
                          className="p-1.5 text-laranja hover:bg-laranja/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {badges.length > 0 && (
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {badges.map(tipo => (
                      <span key={tipo} title={BADGES[tipo]?.label ?? tipo} className="text-base cursor-help">
                        {BADGES[tipo]?.emoji ?? '🏅'}
                      </span>
                    ))}
                  </div>
                )}

                {mats.length === 0 ? (
                  <p className="text-xs text-gray-300 italic">Nenhum curso inscrito</p>
                ) : (
                  <div className="space-y-1">
                    {mats.map(m => (
                      <div key={m.id} className="flex items-center gap-2">
                        <BookOpen size={10} className="text-gray-300 shrink-0" />
                        <span className="text-xs text-gray-500 truncate">{m.cursos?.titulo}</span>
                        <span className={`ml-auto text-xs font-semibold shrink-0 ${m.status === 'concluido' ? 'text-verde' : 'text-laranja'}`}>
                          {m.status === 'concluido' ? '✓' : '...'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal cadastro / edição */}
      {modal && (
        <Modal title={editId ? 'Editar Aluno' : 'Novo Aluno'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Nome completo *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                required className={inputCls} placeholder="Nome do aluno" />
            </div>
            <div>
              <label className={labelCls}>CPF *</label>
              <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                required className={inputCls} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className={labelCls}>PIN {editId ? '(em branco = manter atual)' : '*'}</label>
              <div className="relative">
                <input type={showPin ? 'text' : 'password'} value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                  required={!editId} maxLength={10} className={`${inputCls} pr-10`}
                  placeholder={editId ? 'Novo PIN (opcional)' : 'Crie um PIN'} />
                <button type="button" onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza hover:text-petroleum transition-colors">
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {isAdmin && (
              <div>
                <label className={labelCls}>Comunidade</label>
                <select value={form.comunidade_id}
                  onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value, associacao_id: '' }))}
                  className={inputCls}>
                  <option value="">— Sem comunidade —</option>
                  {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Associação</label>
              <select value={form.associacao_id} onChange={e => setForm(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                <option value="">— Sem associação —</option>
                {assocsFiltradas.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
              </select>
            </div>
            {error && <div className="bg-laranja/10 border border-laranja/30 text-laranja rounded-lg px-3 py-2 text-sm">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal inscrição em curso */}
      {modalInscrever && alunoInscrever && (
        <Modal title={`Inscrever — ${alunoInscrever.nome}`} onClose={() => setModalInscrever(false)}>
          <div className="space-y-4">
            {cursosDisponiveis.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Este aluno já está inscrito em todos os cursos disponíveis.</p>
            ) : (
              <>
                <div>
                  <label className={labelCls}>Selecione o curso</label>
                  <select value={cursoSelecionado} onChange={e => setCursoSelecionado(e.target.value)} className={inputCls}>
                    <option value="">— Escolha um curso —</option>
                    {cursosDisponiveis.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>
                {matAluno.length > 0 && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">Já inscrito em:</p>
                    {cursos.filter(c => matAluno.includes(c.id)).map(c => (
                      <p key={c.id} className="text-xs text-petroleum font-medium">• {c.titulo}</p>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalInscrever(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              {cursosDisponiveis.length > 0 && (
                <button onClick={handleInscrever} disabled={!cursoSelecionado || inscrevendo}
                  className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                  {inscrevendo ? 'Inscrevendo...' : 'Inscrever'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
