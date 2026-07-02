import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Leaf, Users, Heart, Shield, Wrench, HelpCircle, AlertTriangle, CheckCircle, X } from 'lucide-react'

const inputCls = 'w-full border border-cinza rounded-lg px-3 py-2 text-sm text-petroleum focus:outline-none focus:ring-2 focus:ring-oceano focus:border-transparent transition-shadow'
const labelCls = 'block text-xs font-semibold text-petroleum/70 uppercase tracking-wide mb-1'

// ── Riscos ──
const TIPOS = [
  { id: 'ambiental', label: 'Ambiental', Icon: Leaf, color: '#16a34a' },
  { id: 'social', label: 'Social', Icon: Users, color: '#2563eb' },
  { id: 'saude', label: 'Saúde', Icon: Heart, color: '#dc2626' },
  { id: 'seguranca', label: 'Segurança', Icon: Shield, color: '#d97706' },
  { id: 'trabalho', label: 'Trabalho', Icon: Wrench, color: '#374151' },
  { id: 'outro', label: 'Outro', Icon: HelpCircle, color: '#9ca3af' },
]

const NIVEIS = [
  { id: 'baixo',   label: 'Baixo',   cls: 'bg-verde/30 text-petroleum',       ring: '#65a30d' },
  { id: 'medio',   label: 'Médio',   cls: 'bg-laranja/20 text-laranja',       ring: '#FF8F1F' },
  { id: 'alto',    label: 'Alto',    cls: 'bg-red-100 text-red-600',          ring: '#ea580c' },
  { id: 'critico', label: 'Crítico', cls: 'bg-red-200 text-red-700 font-bold', ring: '#b91c1c' },
]
const NIVEL_ORDER = { baixo: 1, medio: 2, alto: 3, critico: 4 }
const getNivel = (id) => NIVEIS.find(n => n.id === id) ?? NIVEIS[0]
const getTipo  = (id) => TIPOS.find(t => t.id === id)  ?? TIPOS[5]

// ── Sondas ──
const SONDA_STATUS = [
  { id: 'operando',   label: 'Em Operação', cls: 'bg-verde/30 text-petroleum',  color: '#16a34a' },
  { id: 'paralisada', label: 'Paralisada',  cls: 'bg-red-100 text-red-600',     color: '#dc2626' },
  { id: 'manutencao', label: 'Manutenção',  cls: 'bg-blue-100 text-blue-600',   color: '#2563eb' },
]
const getSondaStatus = (id) => SONDA_STATUS.find(s => s.id === id) ?? SONDA_STATUS[0]

const createSondaIcon = (status, count = 1) => {
  const { color } = getSondaStatus(status)
  const badge = count > 1
    ? `<div style="position:absolute;top:-7px;right:-7px;background:#1f2937;color:white;border-radius:50%;width:17px;height:17px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;line-height:1">${count}</div>`
    : ''
  return L.divIcon({
    className: '',
    iconSize: [38, 48],
    iconAnchor: [19, 48],
    popupAnchor: [0, -50],
    html: `<div style="position:relative;width:38px;height:48px;background:${color};border:3px solid white;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.35);">
      <svg width="22" height="32" viewBox="0 0 22 36" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="3" r="2.5" fill="white"/>
        <line x1="11" y1="3" x2="2" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <line x1="11" y1="3" x2="20" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <line x1="5.5" y1="14" x2="16.5" y2="14" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="3.5" y1="23" x2="18.5" y2="23" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="11" y1="3" x2="11" y2="30" stroke="white" stroke-width="1.2" stroke-dasharray="3,2.5" opacity="0.6"/>
        <rect x="1" y="29" width="20" height="3.5" rx="1.5" fill="white" opacity="0.9"/>
      </svg>
      ${badge}
    </div>`,
  })
}

const emptyRisco  = { comunidade_id: '', associacao_id: '', tipo: '', nivel: 'medio', descricao: '' }
const emptySonda  = { nome: '', comunidade_id: '', associacao_id: '', operadora: '', status: 'operando', descricao: '' }

export default function Mapa() {
  const [comunidades, setComunidades] = useState([])
  const [riscos,      setRiscos]      = useState([])
  const [sondas,      setSondas]      = useState([])
  const [loading,     setLoading]     = useState(true)

  // painel
  const [panelTab, setPanelTab] = useState('riscos')
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [expandido, setExpandido] = useState(null)

  // modals
  const [modalRisco, setModalRisco] = useState(false)
  const [modalSonda, setModalSonda] = useState(false)
  const [formRisco, setFormRisco] = useState(emptyRisco)
  const [formSonda, setFormSonda] = useState(emptySonda)
  const [saving, setSaving] = useState(false)

  const assocsDaComRisco = comunidades.find(c => c.id === formRisco.comunidade_id)?.associacoes ?? []
  const assocsDaComSonda = comunidades.find(c => c.id === formSonda.comunidade_id)?.associacoes ?? []

  const load = async () => {
    setLoading(true)
    const [comRes, riscoRes, sondaRes] = await Promise.all([
      supabase.from('comunidades')
        .select('id, nome, lat, lng, associacoes(id, nome, sigla, representante_legal, telefone)')
        .not('lat', 'is', null),
      supabase.from('riscos')
        .select('*, comunidades(nome), associacoes(nome, sigla)')
        .order('created_at', { ascending: false }),
      supabase.from('sondas')
        .select('*, comunidades(nome), associacoes(nome, sigla)')
        .order('created_at', { ascending: false }),
    ])
    setComunidades(comRes.data ?? [])
    setRiscos(riscoRes.data ?? [])
    setSondas(sondaRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Riscos ──
  const handleSaveRisco = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('riscos').insert({
      comunidade_id: formRisco.comunidade_id,
      associacao_id: formRisco.associacao_id || null,
      tipo: formRisco.tipo, nivel: formRisco.nivel,
      descricao: formRisco.descricao || null, status: 'ativo',
    })
    setSaving(false); setModalRisco(false); setFormRisco(emptyRisco); load()
  }
  const atualizarStatusRisco = async (id, status) => {
    await supabase.from('riscos').update({ status }).eq('id', id); load()
  }
  const excluirRisco = async (id) => {
    if (!confirm('Excluir este risco?')) return
    await supabase.from('riscos').delete().eq('id', id); load()
  }

  // ── Sondas ──
  const handleSaveSonda = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('sondas').insert({
      nome: formSonda.nome,
      comunidade_id: formSonda.comunidade_id,
      associacao_id: formSonda.associacao_id || null,
      operadora: formSonda.operadora || null,
      status: formSonda.status,
      descricao: formSonda.descricao || null,
    })
    setSaving(false); setModalSonda(false); setFormSonda(emptySonda); load()
  }
  const atualizarStatusSonda = async (id, status) => {
    await supabase.from('sondas').update({ status }).eq('id', id); load()
  }
  const excluirSonda = async (id) => {
    if (!confirm('Excluir esta sonda?')) return
    await supabase.from('sondas').delete().eq('id', id); load()
  }

  // ── Helpers do mapa ──
  const getRiscoRing = (comunidadeId) => {
    const ativos = riscos.filter(r => r.comunidade_id === comunidadeId && r.status === 'ativo')
    if (ativos.length === 0) return null
    const highest = ativos.reduce((acc, r) =>
      (NIVEL_ORDER[r.nivel] ?? 0) > (NIVEL_ORDER[acc.nivel] ?? 0) ? r : acc)
    return getNivel(highest.nivel).ring
  }

  const sondasPorComunidade = sondas.reduce((acc, s) => {
    if (!acc[s.comunidade_id]) acc[s.comunidade_id] = []
    acc[s.comunidade_id].push(s)
    return acc
  }, {})

  const getColor = (count) => count >= 3 ? '#FF8F1F' : count >= 2 ? '#2ED7ED' : '#BCFF48'
  const getRadius = (count) => Math.max(8, count * 5 + 6)

  const riscosFiltrados = riscos.filter(r => filtroStatus === 'todos' || r.status === filtroStatus)
  const riscosPorComunidade = (id) => riscos.filter(r => r.comunidade_id === id && r.status === 'ativo')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Mapa das Comunidades</h1>
            <p className="text-gray-400 text-sm">Distribuição, sondas e riscos por região</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFormRisco(emptyRisco); setModalRisco(true) }}
            className="flex items-center gap-2 bg-laranja/90 hover:bg-laranja text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <AlertTriangle size={14} /> Cadastrar Risco
          </button>
          <button onClick={() => { setFormSonda(emptySonda); setModalSonda(true) }}
            className="flex items-center gap-2 bg-petroleum hover:bg-petroleum/80 text-verde px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={14} /> Cadastrar Sonda
          </button>
        </div>
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

              {/* Comunidades */}
              {comunidades.map(c => {
                const count = c.associacoes?.length ?? 0
                const riscoColor = getRiscoRing(c.id)
                const comRiscos = riscosPorComunidade(c.id)
                return (
                  <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={getRadius(count)}
                    pathOptions={{ fillColor: getColor(count), fillOpacity: 0.85, color: riscoColor ?? '#091C28', weight: riscoColor ? 3.5 : 1.5 }}>
                    <Popup minWidth={220}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#091C28', marginBottom: 8 }}>{c.nome}</p>
                      {count === 0 ? (
                        <p style={{ fontSize: 12, color: '#999' }}>Sem associações vinculadas</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: comRiscos.length > 0 ? 10 : 0 }}>
                          {c.associacoes.map(a => (
                            <div key={a.id} style={{ borderLeft: '3px solid #2ED7ED', paddingLeft: 8 }}>
                              <p style={{ fontWeight: 600, fontSize: 12, color: '#091C28' }}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</p>
                              {a.representante_legal && <p style={{ fontSize: 11, color: '#666' }}>Rep.: {a.representante_legal}</p>}
                              {a.telefone && (
                                <a href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 11, color: '#25D366', fontWeight: 600 }}>{a.telefone}</a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {comRiscos.length > 0 && (
                        <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⚠ {comRiscos.length} risco{comRiscos.length > 1 ? 's' : ''} ativo{comRiscos.length > 1 ? 's' : ''}
                          </p>
                          {comRiscos.map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', borderRadius: 4, padding: '1px 6px' }}>{getNivel(r.nivel).label}</span>
                              <span style={{ fontSize: 11, color: '#374151' }}>{getTipo(r.tipo).label}</span>
                              {r.associacoes?.sigla && <span style={{ fontSize: 10, color: '#9ca3af' }}>— {r.associacoes.sigla}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </Popup>
                  </CircleMarker>
                )
              })}

              {/* Sondas — um marcador por comunidade com sonda, levemente deslocado */}
              {Object.entries(sondasPorComunidade).map(([comId, comSondas]) => {
                const com = comunidades.find(c => c.id === comId)
                if (!com) return null
                const statusPriority = comSondas.find(s => s.status === 'paralisada')?.status
                  ?? comSondas.find(s => s.status === 'manutencao')?.status
                  ?? 'operando'
                const icon = createSondaIcon(statusPriority, comSondas.length)
                const riscosCom = riscosPorComunidade(comId)
                return (
                  <Marker key={`sonda-${comId}`} position={[com.lat + 0.012, com.lng + 0.015]} icon={icon}>
                    <Popup minWidth={230}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#091C28', marginBottom: 6 }}>
                        🛢 Sonda{comSondas.length > 1 ? 's' : ''} em {com.nome}
                      </p>
                      {comSondas.map(s => {
                        const st = getSondaStatus(s.status)
                        return (
                          <div key={s.id} style={{ borderLeft: `3px solid ${st.color}`, paddingLeft: 8, marginBottom: 8 }}>
                            <p style={{ fontWeight: 700, fontSize: 12, color: '#091C28' }}>{s.nome}</p>
                            <p style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</p>
                            {s.operadora && <p style={{ fontSize: 11, color: '#666' }}>Operadora: {s.operadora}</p>}
                            {s.associacoes && <p style={{ fontSize: 11, color: '#666' }}>{s.associacoes.sigla ? `${s.associacoes.sigla} — ` : ''}{s.associacoes.nome}</p>}
                            {s.descricao && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.descricao}</p>}
                          </div>
                        )
                      })}
                      {riscosCom.length > 0 && (
                        <div style={{ borderTop: '1px solid #eee', paddingTop: 6 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', marginBottom: 4, textTransform: 'uppercase' }}>
                            ⚠ Riscos ativos na região
                          </p>
                          {riscosCom.map(r => (
                            <div key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                              <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', fontWeight: 700, borderRadius: 4, padding: '1px 5px' }}>{getNivel(r.nivel).label}</span>
                              <span style={{ fontSize: 11, color: '#374151' }}>{getTipo(r.tipo).label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-72 flex flex-col gap-2" style={{ height: 540 }}>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 shrink-0">
            <button onClick={() => setPanelTab('riscos')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${panelTab === 'riscos' ? 'bg-petroleum text-verde' : 'text-gray-400 hover:text-petroleum'}`}>
              ⚠ Riscos ({riscos.filter(r => r.status === 'ativo').length})
            </button>
            <button onClick={() => setPanelTab('sondas')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${panelTab === 'sondas' ? 'bg-petroleum text-verde' : 'text-gray-400 hover:text-petroleum'}`}>
              🛢 Sondas ({sondas.length})
            </button>
          </div>

          {/* ── RISCOS TAB ── */}
          {panelTab === 'riscos' && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2 shrink-0">
                <div className="flex gap-1">
                  {[{ id: 'ativo', label: 'Ativos' }, { id: 'mitigado', label: 'Mitigados' }, { id: 'todos', label: 'Todos' }].map(f => (
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
                ) : riscosFiltrados.map(r => {
                  const nv = getNivel(r.nivel)
                  const tp = getTipo(r.tipo)
                  const TipoIcon = tp.Icon
                  return (
                    <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-3 ${r.status === 'ativo' ? 'border-l-4' : 'border-gray-100 opacity-70'}`}
                      style={r.status === 'ativo' ? { borderLeftColor: nv.ring } : {}}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <TipoIcon size={13} style={{ color: tp.color }} />
                          <span className="text-xs font-semibold text-petroleum">{tp.label}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${nv.cls}`}>{nv.label}</span>
                          <button onClick={() => excluirRisco(r.id)} className="p-0.5 text-gray-200 hover:text-laranja transition-colors"><X size={12} /></button>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-petroleum/80 leading-tight">{r.comunidades?.nome ?? '—'}</p>
                      {r.associacoes && <p className="text-xs text-oceano mt-0.5">{r.associacoes.sigla ? `${r.associacoes.sigla} — ${r.associacoes.nome}` : r.associacoes.nome}</p>}
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
                        <button onClick={() => atualizarStatusRisco(r.id, 'mitigado')}
                          className="flex items-center gap-1.5 mt-2 text-xs bg-petroleum/8 hover:bg-petroleum/15 text-petroleum px-2.5 py-1.5 rounded-lg font-semibold transition-colors w-full justify-center">
                          <CheckCircle size={12} /> Marcar como mitigado
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── SONDAS TAB ── */}
          {panelTab === 'sondas' && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {sondas.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 py-10 text-center">
                  <p className="text-2xl mb-2">🛢</p>
                  <p className="text-xs text-gray-300">Nenhuma sonda cadastrada</p>
                </div>
              ) : sondas.map(s => {
                const st = getSondaStatus(s.status)
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 border-l-4"
                    style={{ borderLeftColor: st.color }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-petroleum leading-tight">{s.nome}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                        <button onClick={() => excluirSonda(s.id)} className="p-0.5 text-gray-200 hover:text-laranja transition-colors"><X size={12} /></button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-petroleum/70">{s.comunidades?.nome ?? '—'}</p>
                    {s.associacoes && <p className="text-xs text-oceano mt-0.5">{s.associacoes.sigla ? `${s.associacoes.sigla} — ${s.associacoes.nome}` : s.associacoes.nome}</p>}
                    {s.operadora && <p className="text-xs text-gray-400 mt-0.5">Operadora: <span className="font-medium text-petroleum">{s.operadora}</span></p>}
                    {s.descricao && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.descricao}</p>}
                    <div className="flex gap-1.5 mt-2">
                      {SONDA_STATUS.filter(opt => opt.id !== s.status).map(opt => (
                        <button key={opt.id} onClick={() => atualizarStatusSonda(s.id, opt.id)}
                          className="flex-1 text-xs py-1 rounded-lg font-medium border border-gray-100 text-gray-400 hover:text-petroleum hover:border-gray-300 transition-colors">
                          → {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* LEGENDA */}
      <div className="flex items-center gap-5 mt-4 px-1 flex-wrap">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Assoc.:</p>
        {[{ color: 'bg-verde', label: '1' }, { color: 'bg-oceano', label: '2' }, { color: 'bg-laranja', label: '3+' }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded-full ${color} border border-petroleum/20`} />{label}
          </div>
        ))}
        <div className="h-4 w-px bg-gray-200" />
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Risco:</p>
        {NIVEIS.map(n => (
          <div key={n.id} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: n.ring }} />{n.label}
          </div>
        ))}
        <div className="h-4 w-px bg-gray-200" />
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Sonda:</p>
        {SONDA_STATUS.map(s => (
          <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 rounded border-2" style={{ borderColor: s.color, background: s.color + '30' }} />{s.label}
          </div>
        ))}
      </div>

      {/* MODAL RISCO */}
      {modalRisco && (
        <Modal title="Cadastrar Risco" onClose={() => setModalRisco(false)}>
          <form onSubmit={handleSaveRisco} className="space-y-4">
            <div>
              <label className={labelCls}>Comunidade *</label>
              <select value={formRisco.comunidade_id}
                onChange={e => setFormRisco(f => ({ ...f, comunidade_id: e.target.value, associacao_id: '' }))}
                required className={inputCls}>
                <option value="">— Selecione —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {formRisco.comunidade_id && (
              <div>
                <label className={labelCls}>Associação</label>
                <select value={formRisco.associacao_id} onChange={e => setFormRisco(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                  <option value="">— Comunidade em geral —</option>
                  {assocsDaComRisco.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Tipo *</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => {
                  const TipoIcon = t.Icon
                  return (
                    <button key={t.id} type="button" onClick={() => setFormRisco(f => ({ ...f, tipo: t.id }))}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${formRisco.tipo === t.id ? 'border-oceano bg-oceano/10 text-petroleum' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                      <TipoIcon size={15} style={{ color: formRisco.tipo === t.id ? t.color : undefined }} />{t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className={labelCls}>Nível *</label>
              <div className="grid grid-cols-4 gap-2">
                {NIVEIS.map(n => (
                  <button key={n.id} type="button" onClick={() => setFormRisco(f => ({ ...f, nivel: n.id }))}
                    className={`py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${formRisco.nivel === n.id ? `border-transparent ${n.cls}` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={formRisco.descricao} onChange={e => setFormRisco(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`} placeholder="Detalhe o risco identificado..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalRisco(false)} className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving || !formRisco.tipo || !formRisco.comunidade_id}
                className="flex-1 bg-laranja/90 hover:bg-laranja disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL SONDA */}
      {modalSonda && (
        <Modal title="Cadastrar Sonda" onClose={() => setModalSonda(false)}>
          <form onSubmit={handleSaveSonda} className="space-y-4">
            <div>
              <label className={labelCls}>Nome da Sonda *</label>
              <input value={formSonda.nome} onChange={e => setFormSonda(f => ({ ...f, nome: e.target.value }))}
                required className={inputCls} placeholder="Ex: Sonda Alpha, Sonda 01..." />
            </div>
            <div>
              <label className={labelCls}>Comunidade / Região *</label>
              <select value={formSonda.comunidade_id}
                onChange={e => setFormSonda(f => ({ ...f, comunidade_id: e.target.value, associacao_id: '' }))}
                required className={inputCls}>
                <option value="">— Selecione —</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {formSonda.comunidade_id && (
              <div>
                <label className={labelCls}>Associação</label>
                <select value={formSonda.associacao_id} onChange={e => setFormSonda(f => ({ ...f, associacao_id: e.target.value }))} className={inputCls}>
                  <option value="">— Região em geral —</option>
                  {assocsDaComSonda.map(a => <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Operadora</label>
              <input value={formSonda.operadora} onChange={e => setFormSonda(f => ({ ...f, operadora: e.target.value }))}
                className={inputCls} placeholder="Ex: Petrobras, Origem Energia..." />
            </div>
            <div>
              <label className={labelCls}>Status *</label>
              <div className="grid grid-cols-3 gap-2">
                {SONDA_STATUS.map(s => (
                  <button key={s.id} type="button" onClick={() => setFormSonda(f => ({ ...f, status: s.id }))}
                    className={`py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${formSonda.status === s.id ? `border-transparent ${s.cls}` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Observações</label>
              <textarea value={formSonda.descricao} onChange={e => setFormSonda(f => ({ ...f, descricao: e.target.value }))}
                rows={3} className={`${inputCls} resize-none`} placeholder="Informações adicionais sobre a sonda..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalSonda(false)} className="flex-1 border border-cinza text-petroleum/70 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving || !formSonda.nome || !formSonda.comunidade_id}
                className="flex-1 bg-petroleum hover:bg-petroleum/80 disabled:opacity-50 text-verde py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Salvando...' : 'Cadastrar Sonda'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
