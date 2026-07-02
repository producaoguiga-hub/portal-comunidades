import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Leaf, Users, Heart, Shield, Wrench, HelpCircle, AlertTriangle, CheckCircle, X } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

const TIPOS = [
  { id: 'ambiental', label: 'Ambiental', Icon: Leaf, color: '#16a34a' },
  { id: 'social', label: 'Social', Icon: Users, color: '#2563eb' },
  { id: 'saude', label: 'Saúde', Icon: Heart, color: '#dc2626' },
  { id: 'seguranca', label: 'Segurança', Icon: Shield, color: '#d97706' },
  { id: 'trabalho', label: 'Trabalho', Icon: Wrench, color: '#374151' },
  { id: 'outro', label: 'Outro', Icon: HelpCircle, color: '#9ca3af' },
]

const NIVEIS = [
  { id: 'baixo', label: 'Baixo', cls: 'bg-verde/30 text-petroleum', ring: '#65a30d', dot: 'bg-green-500' },
  { id: 'medio', label: 'Médio', cls: 'bg-laranja/20 text-laranja', ring: '#FF8F1F', dot: 'bg-orange-400' },
  { id: 'alto', label: 'Alto', cls: 'bg-red-100 text-red-600', ring: '#ea580c', dot: 'bg-red-500' },
  { id: 'critico', label: 'Crítico', cls: 'bg-red-200 text-red-700 font-bold', ring: '#b91c1c', dot: 'bg-red-700' },
]

const NIVEL_ORDER = { baixo: 1, medio: 2, alto: 3, critico: 4 }

const getNivel = (id) => NIVEIS.find(n => n.id === id) ?? NIVEIS[0]
const getTipo = (id) => TIPOS.find(t => t.id === id) ?? TIPOS[5]

const emptyForm = { comunidade_id: '', associacao_id: '', tipo: '', nivel: 'medio', descricao: '' }

export default function Mapa() {
  const [comunidades, setComunidades] = useState([])
  const [riscos, setRiscos] = useState([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [expandido, setExpandido] = useState(null)

  const assocsDaCom = comunidades.find(c => c.id === form.comunidade_id)?.associacoes ?? []

  const load = async () => {
    setLoading(true)
    const [comRes, riscoRes] = await Promise.all([
      supabase.from('comunidades')
        .select('id, nome, lat, lng, associacoes(id, nome, sigla, representante_legal, telefone)')
        .not('lat', 'is', null),
      supabase.from('riscos')
        .select('*, comunidades(nome), associacoes(nome, sigla)')
        .order('created_at', { ascending: false }),
    ])
    setComunidades(comRes.data ?? [])
    setRiscos(riscoRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('riscos').insert({
      comunidade_id: form.comunidade_id,
      associacao_id: form.associacao_id || null,
      tipo: form.tipo,
      nivel: form.nivel,
      descricao: form.descricao || null,
      status: 'ativo',
    })
    setSaving(false)
    setModal(false)
    setForm(emptyForm)
    load()
  }

  const atualizarStatus = async (id, status) => {
    await supabase.from('riscos').update({ status }).eq('id', id)
    load()
  }

  const excluirRisco = async (id) => {
    if (!confirm('Excluir este risco?')) return
    await supabase.from('riscos').delete().eq('id', id)
    load()
  }

  // Nível mais alto de risco ativo por comunidade
  const getRiscoRing = (comunidadeId) => {
    const ativos = riscos.filter(r => r.comunidade_id === comunidadeId && r.status === 'ativo')
    if (ativos.length === 0) return null
    const highest = ativos.reduce((acc, r) =>
      (NIVEL_ORDER[r.nivel] ?? 0) > (NIVEL_ORDER[acc.nivel] ?? 0) ? r : acc
    )
    return getNivel(highest.nivel).ring
  }

  const getColor = (count) => {
    if (count >= 3) return '#FF8F1F'
    if (count >= 2) return '#2ED7ED'
    return '#BCFF48'
  }
  const getRadius = (count) => Math.max(8, count * 5 + 6)

  const riscosFiltrados = riscos.filter(r => filtroStatus === 'todos' || r.status === filtroStatus)
  const riscosPorComunidade = (comunidadeId) => riscos.filter(r => r.comunidade_id === comunidadeId && r.status === 'ativo')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Mapa das Comunidades</h1>
            <p className="text-gray-400 text-sm">Distribuição e riscos por associação</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true) }}
          className="flex items-center gap-2 bg-laranja/90 hover:bg-laranja text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <AlertTriangle size={15} /> Cadastrar Risco
        </button>
      </div>

      <div className="flex gap-4 items-start">
        {/* MAP */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 540 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-cinza text-sm">Carregando mapa...</div>
          ) : (
            <MapContainer center={[-12.3, -38.5]} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              />
              {comunidades.map(c => {
                const count = c.associacoes?.length ?? 0
                const riscoColor = getRiscoRing(c.id)
                const comRiscos = riscosPorComunidade(c.id)
                return (
                  <CircleMarker
                    key={c.id}
                    center={[c.lat, c.lng]}
                    radius={getRadius(count)}
                    pathOptions={{
                      fillColor: getColor(count),
                      fillOpacity: 0.85,
                      color: riscoColor ?? '#091C28',
                      weight: riscoColor ? 3.5 : 1.5,
                    }}
                  >
                    <Popup minWidth={220}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#091C28', marginBottom: 8 }}>{c.nome}</p>
                        {count === 0 ? (
                          <p style={{ fontSize: 12, color: '#999' }}>Sem associações vinculadas</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: comRiscos.length > 0 ? 10 : 0 }}>
                            {c.associacoes.map(a => (
                              <div key={a.id} style={{ borderLeft: '3px solid #2ED7ED', paddingLeft: 8 }}>
                                <p style={{ fontWeight: 600, fontSize: 12, color: '#091C28' }}>
                                  {a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}
                                </p>
                                {a.representante_legal && (
                                  <p style={{ fontSize: 11, color: '#666' }}>Rep.: {a.representante_legal}</p>
                                )}
                                {a.telefone && (
                                  <a href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                    style={{ fontSize: 11, color: '#25D366', fontWeight: 600 }}>
                                    {a.telefone}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {comRiscos.length > 0 && (
                          <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ⚠ {comRiscos.length} risco{comRiscos.length > 1 ? 's' : ''} ativo{comRiscos.length > 1 ? 's' : ''}
                            </p>
                            {comRiscos.map(r => {
                              const nv = getNivel(r.nivel)
                              const tp = getTipo(r.tipo)
                              return (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', borderRadius: 4, padding: '1px 6px' }}>
                                    {nv.label}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#374151' }}>{tp.label}</span>
                                  {r.associacoes?.sigla && <span style={{ fontSize: 10, color: '#9ca3af' }}>— {r.associacoes.sigla}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          )}
        </div>

        {/* RISK PANEL */}
        <div className="w-72 flex flex-col gap-3" style={{ height: 540 }}>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-petroleum uppercase tracking-wide">Riscos Cadastrados</p>
              <span className="text-xs text-gray-300">{riscosFiltrados.length}</span>
            </div>
            <div className="flex gap-1">
              {[
                { id: 'ativo', label: 'Ativos' },
                { id: 'mitigado', label: 'Mitigados' },
                { id: 'todos', label: 'Todos' },
              ].map(f => (
                <button key={f.id} onClick={() => setFiltroStatus(f.id)}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition-colors ${filtroStatus === f.id ? 'bg-petroleum text-verde' : 'text-gray-400 hover:text-petroleum'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {riscosFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 py-10 text-center">
                <AlertTriangle size={24} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-300">Nenhum risco cadastrado</p>
              </div>
            ) : (
              riscosFiltrados.map(r => {
                const nv = getNivel(r.nivel)
                const tp = getTipo(r.tipo)
                const TipoIcon = tp.Icon
                return (
                  <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-3 ${r.status === 'ativo' ? 'border-l-4' : 'border-gray-100 opacity-70'}`}
                    style={r.status === 'ativo' ? { borderLeftColor: nv.ring } : {}}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <TipoIcon size={13} style={{ color: tp.color }} />
                        <span className="text-xs font-semibold text-petroleum">{tp.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${nv.cls}`}>{nv.label}</span>
                        <button onClick={() => excluirRisco(r.id)} className="p-0.5 text-gray-200 hover:text-laranja transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-petroleum/80 leading-tight">{r.comunidades?.nome ?? '—'}</p>
                    {r.associacoes && (
                      <p className="text-xs text-oceano mt-0.5">{r.associacoes.sigla ? `${r.associacoes.sigla} — ${r.associacoes.nome}` : r.associacoes.nome}</p>
                    )}
                    {r.descricao && (
                      <div className="mt-1">
                        <p className={`text-xs text-gray-500 ${expandido === r.id ? '' : 'line-clamp-2'}`}>{r.descricao}</p>
                        <button onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                          className="text-xs text-oceano hover:text-petroleum font-medium mt-0.5 transition-colors">
                          {expandido === r.id ? '▲ Ver menos' : '▼ Ver mais'}
                        </button>
                      </div>
                    )}
                    {r.status === 'ativo' && (
                      <button onClick={() => atualizarStatus(r.id, 'mitigado')}
                        className="flex items-center gap-1.5 mt-2 text-xs bg-petroleum/8 hover:bg-petroleum/15 text-petroleum px-2.5 py-1.5 rounded-lg font-semibold transition-colors w-full justify-center">
                        <CheckCircle size={12} /> Marcar como mitigado
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 px-1 flex-wrap">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mr-1">Associações:</p>
        {[
          { color: 'bg-verde', label: '1' },
          { color: 'bg-oceano', label: '2' },
          { color: 'bg-laranja', label: '3+' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded-full ${color} border border-petroleum/20`} />
            {label}
          </div>
        ))}
        <div className="h-4 w-px bg-gray-200 mx-1" />
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mr-1">Risco:</p>
        {NIVEIS.map(n => (
          <div key={n.id} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: n.ring, background: 'transparent' }} />
            {n.label}
          </div>
        ))}
        <p className="text-xs text-gray-400 ml-auto">Anel colorido = risco ativo na comunidade</p>
      </div>

      {/* Modal cadastrar risco */}
      {modal && (
        <Modal title="Cadastrar Risco" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Comunidade *</label>
              <select value={form.comunidade_id}
                onChange={e => setForm(f => ({ ...f, comunidade_id: e.target.value, associacao_id: '' }))}
                required className={inputCls}>
                <option value="">— Selecione a comunidade —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {form.comunidade_id && (
              <div>
                <label className={labelCls}>Associação</label>
                <select value={form.associacao_id} onChange={e => setForm(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                  <option value="">— Comunidade em geral —</option>
                  {assocsDaCom.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Tipo de Risco *</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => {
                  const TipoIcon = t.Icon
                  return (
                    <button key={t.id} type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: t.id }))}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${form.tipo === t.id ? 'border-oceano bg-oceano/10 text-petroleum' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                      <TipoIcon size={16} style={{ color: form.tipo === t.id ? t.color : undefined }} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={labelCls}>Nível de Risco *</label>
              <div className="grid grid-cols-4 gap-2">
                {NIVEIS.map(n => (
                  <button key={n.id} type="button"
                    onClick={() => setForm(f => ({ ...f, nivel: n.id }))}
                    className={`py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${form.nivel === n.id ? `border-transparent ${n.cls}` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`}
                placeholder="Detalhe o risco identificado..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !form.tipo || !form.comunidade_id}
                className="flex-1 bg-laranja/90 hover:bg-laranja disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
