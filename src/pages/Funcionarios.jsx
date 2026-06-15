import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { Plus, Building2, MapPin, Trophy, Users } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const avatarColors = [
  'bg-oceano/20 text-oceano',
  'bg-verde/40 text-petroleum',
  'bg-laranja/20 text-laranja',
  'bg-petroleum/10 text-petroleum',
]
const getInitials = nome => nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const getAvatarColor = nome => avatarColors[nome.charCodeAt(0) % avatarColors.length]

export default function Funcionarios() {
  const { unidadeSession } = useAuth()
  const isUnidade = !!unidadeSession

  const [data, setData] = useState([])
  const [comunidades, setComunidades] = useState([])
  const [associacoes, setAssociacoes] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroComunidade, setFiltroComunidade] = useState('')
  const [filtroAssociacao, setFiltroAssociacao] = useState('')

  const emptyForm = () => ({
    funcionario_nome: '',
    associacao: '',
    unidade: isUnidade ? unidadeSession.unidadeNome : '',
    comunidade_id: '',
  })

  const load = async () => {
    setLoading(true)
    let q = supabase.from('funcionarios_associacao').select('*, comunidades(nome)').order('funcionario_nome')
    if (isUnidade) q = q.eq('unidade', unidadeSession.unidadeNome)

    const [funcRes, comRes, assocRes, unidRes] = await Promise.all([
      q,
      supabase.from('comunidades').select('id, nome').order('nome'),
      supabase.from('associacoes').select('id, nome, sigla, comunidade_id').order('nome'),
      supabase.from('unidades').select('id, nome').order('nome'),
    ])
    setData(funcRes.data ?? [])
    setComunidades(comRes.data ?? [])
    setAssociacoes(assocRes.data ?? [])
    setUnidades(unidRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // filtros
  const filtered = useMemo(() => data.filter(f => {
    if (filtroUnidade && f.unidade !== filtroUnidade) return false
    if (filtroComunidade && f.comunidade_id !== filtroComunidade) return false
    if (filtroAssociacao && !(f.associacao ?? '').includes(filtroAssociacao)) return false
    return true
  }), [data, filtroUnidade, filtroComunidade, filtroAssociacao])

  // agrupar por unidade
  const grouped = useMemo(() => {
    const map = {}
    for (const f of filtered) {
      const key = f.unidade || '—'
      if (!map[key]) map[key] = []
      map[key].push(f)
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length)
  }, [filtered])

  // ranking geral (sem filtros aplicados)
  const ranking = useMemo(() => {
    const map = {}
    for (const f of data) {
      const key = f.unidade || '—'
      map[key] = (map[key] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [data])

  const assocsFiltradas = associacoes.filter(a =>
    !form.comunidade_id || a.comunidade_id === form.comunidade_id
  )

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setModal(true) }
  const openEdit = row => {
    setForm({
      funcionario_nome: row.funcionario_nome,
      associacao: row.associacao ?? '',
      unidade: row.unidade ?? (isUnidade ? unidadeSession.unidadeNome : ''),
      comunidade_id: row.comunidade_id ?? '',
    })
    setEditId(row.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      funcionario_nome: form.funcionario_nome,
      associacao: form.associacao || null,
      unidade: form.unidade || null,
      comunidade_id: form.comunidade_id || null,
    }
    if (editId) {
      await supabase.from('funcionarios_associacao').update(payload).eq('id', editId)
    } else {
      await supabase.from('funcionarios_associacao').insert(payload)
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão?')) return
    await supabase.from('funcionarios_associacao').delete().eq('id', id)
    load()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-laranja-light rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Funcionários da Associação</h1>
            <p className="text-gray-400 text-sm">
              {isUnidade ? `Funcionários da ${unidadeSession.unidadeNome}` : `${data.length} funcionário${data.length !== 1 ? 's' : ''} cadastrado${data.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-verde hover:bg-verde-light text-petroleum px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Novo Funcionário
        </button>
      </div>

      {/* Ranking — só para admin/gestor sem filtro de unidade */}
      {!isUnidade && ranking.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-laranja" />
            <span className="text-xs font-bold text-petroleum uppercase tracking-wide">Ranking de Unidades</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ranking.map(([unit, count], i) => (
              <div key={unit} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                <span className="text-xs text-gray-400 font-semibold w-4">{i + 1}º</span>
                <span className="font-bold text-petroleum tracking-wide">{unit}</span>
                <span className="text-xs font-semibold text-gray-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      {!isUnidade && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}
            className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano w-44">
            <option value="">Todas as unidades</option>
            {unidades.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
          </select>
          <select value={filtroComunidade} onChange={e => setFiltroComunidade(e.target.value)}
            className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano w-52">
            <option value="">Todas as regiões</option>
            {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filtroAssociacao} onChange={e => setFiltroAssociacao(e.target.value)}
            className="border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano w-64">
            <option value="">Todas as associações</option>
            {[...new Set(data.map(f => f.associacao).filter(Boolean))].sort().map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {(filtroUnidade || filtroComunidade || filtroAssociacao) && (
            <button onClick={() => { setFiltroUnidade(''); setFiltroComunidade(''); setFiltroAssociacao('') }}
              className="text-xs text-laranja hover:text-petroleum font-medium px-3 py-2 rounded-lg hover:bg-laranja/10 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-cinza text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-cinza text-sm">Nenhum funcionário encontrado.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([unit, funcs]) => (
            <div key={unit}>
              {/* Cabeçalho do grupo */}
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-verde/20 text-petroleum font-bold text-sm tracking-wide">
                  <Users size={13} /> {unit}
                </span>
                <span className="text-xs text-gray-400 font-medium">{funcs.length} funcionário{funcs.length !== 1 ? 's' : ''}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {funcs.map(f => (
                  <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(f.funcionario_nome)}`}>
                      {getInitials(f.funcionario_nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-petroleum text-sm leading-tight">{f.funcionario_nome}</p>
                      {f.associacao && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 size={10} className="text-oceano shrink-0" />
                          <span className="text-xs text-oceano font-medium truncate">{f.associacao}</span>
                        </div>
                      )}
                      {f.comunidades && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-400 truncate">{f.comunidades.nome}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => openEdit(f)}
                        className="text-xs text-oceano hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-oceano/10 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(f.id)}
                        className="text-xs text-laranja hover:text-petroleum font-medium px-2 py-1 rounded-lg hover:bg-laranja/10 transition-colors">
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={editId ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Nome *</label>
              <input value={form.funcionario_nome ?? ''} onChange={e => setForm(f => ({ ...f, funcionario_nome: e.target.value }))}
                required className={inputCls} placeholder="Nome completo" />
            </div>
            <div>
              <label className={labelCls}>Unidade</label>
              {isUnidade ? (
                <div className={`${inputCls} bg-gray-50 text-petroleum/60`}>{unidadeSession.unidadeNome}</div>
              ) : (
                <select value={form.unidade ?? ''} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} className={inputCls}>
                  <option value="">— Sem unidade —</option>
                  {unidades.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Região / Comunidade</label>
              <select value={form.comunidade_id} onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value, associacao: '' }))} className={inputCls}>
                <option value="">— Selecione a região —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Associação</label>
              <select value={form.associacao ?? ''} onChange={e => setForm(f => ({ ...f, associacao: e.target.value }))} className={inputCls}>
                <option value="">— Selecione a associação —</option>
                {assocsFiltradas.map(a => (
                  <option key={a.id} value={a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}>
                    {a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
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
    </div>
  )
}
