import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { Plus, Eye, EyeOff, GraduationCap, BookOpen, Award } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'
const LIMITE = 5

const formatCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const maskCPF = (cpf) => {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length < 11) return cpf
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

export default function MeusAlunos() {
  const { liderSession } = useAuth()
  const semestre = getSemestre()

  const [alunos, setAlunos] = useState([])
  const [associacoes, setAssociacoes] = useState([])
  const [matriculas, setMatriculas] = useState({})
  const [certificados, setCertificados] = useState({})
  const [countSemestre, setCountSemestre] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [form, setForm] = useState({ nome: '', cpf: '', pin: '', associacao_id: '' })
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const comunidadeId = liderSession.comunidadeId

    const [alunosRes, assocRes, countRes] = await Promise.all([
      supabase.from('alunos').select('*').eq('comunidade_id', comunidadeId).order('nome'),
      supabase.from('associacoes').select('id, nome, sigla').eq('comunidade_id', comunidadeId).order('nome'),
      supabase.from('alunos').select('*', { count: 'exact', head: true })
        .eq('comunidade_id', comunidadeId)
        .gte('created_at', semestre.inicio)
        .lte('created_at', semestre.fim),
    ])

    const alunosList = alunosRes.data ?? []
    setAlunos(alunosList)
    setAssociacoes(assocRes.data ?? [])
    setCountSemestre(countRes.count ?? 0)

    if (alunosList.length > 0) {
      const ids = alunosList.map(a => a.id)
      const [matRes, certRes] = await Promise.all([
        supabase.from('matriculas').select('*, cursos(titulo)').in('aluno_id', ids),
        supabase.from('certificados').select('aluno_id').in('aluno_id', ids),
      ])
      const matMap = {}
      for (const m of matRes.data ?? []) {
        if (!matMap[m.aluno_id]) matMap[m.aluno_id] = []
        matMap[m.aluno_id].push(m)
      }
      const certCount = {}
      for (const c of certRes.data ?? []) {
        certCount[c.aluno_id] = (certCount[c.aluno_id] ?? 0) + 1
      }
      setMatriculas(matMap)
      setCertificados(certCount)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const bloqueado = countSemestre >= LIMITE
  const slotsRestantes = LIMITE - countSemestre

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (bloqueado) return
    setSaving(true)
    const cpfClean = form.cpf.replace(/\D/g, '')
    const { error: err } = await supabase.from('alunos').insert({
      nome: form.nome,
      cpf: cpfClean,
      pin: form.pin,
      comunidade_id: liderSession.comunidadeId,
      associacao_id: form.associacao_id || null,
    })
    if (err) {
      setError(err.code === '23505' ? 'Este CPF já está cadastrado.' : err.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setModal(false)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Alunos EAD</h1>
            <p className="text-gray-400 text-sm">Gerencie os alunos da sua comunidade</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => { setForm({ nome: '', cpf: '', pin: '', associacao_id: '' }); setError(''); setShowPin(false); setModal(true) }}
            disabled={bloqueado}
            className="flex items-center gap-2 bg-verde hover:bg-verde-light disabled:opacity-40 disabled:cursor-not-allowed text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> Novo Aluno
          </button>
          {bloqueado && <p className="text-xs text-laranja font-medium">Limite do semestre atingido.</p>}
        </div>
      </div>

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

      {loading ? (
        <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
      ) : alunos.length === 0 ? (
        <div className="py-14 text-center text-cinza text-sm">Nenhum aluno cadastrado ainda.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alunos.map(a => {
            const mats = matriculas[a.id] ?? []
            const certs = certificados[a.id] ?? 0
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(a.nome)}`}>
                    {getInitials(a.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-petroleum text-sm leading-tight">{a.nome}</p>
                    <p className="text-xs text-gray-400">{maskCPF(a.cpf)}</p>
                  </div>
                  {certs > 0 && (
                    <div className="flex items-center gap-1 shrink-0 bg-laranja/15 text-laranja px-2 py-0.5 rounded-full">
                      <Award size={11} />
                      <span className="text-xs font-bold">{certs}</span>
                    </div>
                  )}
                </div>
                {mats.length === 0 ? (
                  <p className="text-xs text-gray-300 italic">Nenhum curso iniciado</p>
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

      {modal && (
        <Modal title="Novo Aluno" onClose={() => setModal(false)}>
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
              <label className={labelCls}>PIN de acesso *</label>
              <div className="relative">
                <input type={showPin ? 'text' : 'password'} value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                  required maxLength={10} className={`${inputCls} pr-10`} placeholder="Crie um PIN para o aluno" />
                <button type="button" onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza hover:text-petroleum transition-colors">
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">O aluno usará CPF + este PIN para entrar.</p>
            </div>
            <div>
              <label className={labelCls}>Associação</label>
              <select value={form.associacao_id} onChange={e => setForm(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                <option value="">— Sem associação —</option>
                {associacoes.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
              </select>
            </div>
            {error && <div className="bg-laranja/10 border border-laranja/30 text-laranja rounded-lg px-3 py-2 text-sm">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-verde hover:bg-verde-light disabled:opacity-60 text-petroleum py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
