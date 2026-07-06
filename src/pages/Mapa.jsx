import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Leaf, Users, Heart, Shield, Wrench, HelpCircle, AlertTriangle, CheckCircle, X, Pencil } from 'lucide-react'

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

const createPulseIcon = (color) => L.divIcon({
  className: '',
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  html: `<div style="position:relative;width:50px;height:50px;">
    <div class="risco-pulse-ring" style="position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:${color};"></div>
  </div>`,
})

const emptyRisco = { comunidade_id: '', associacao_id: '', tipo: '', nivel: 'medio', descricao: '' }

export default function Mapa() {
  const [comunidades, setComunidades] = useState([])
  const [riscos,      setRiscos]      = useState([])
  const [loading,     setLoading]     = useState(true)

  // painel
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [expandido, setExpandido] = useState(null)
  const [mitigandoId, setMitigandoId] = useState(null)
  const [txtMitigacao, setTxtMitigacao] = useState('')

  // modal
  const [modalRisco, setModalRisco] = useState(false)
  const [formRisco, setFormRisco] = useState(emptyRisco)
  const [saving, setSaving] = useState(false)

  const assocsDaComRisco = comunidades.find(c => c.id === formRisco.comunidade_id)?.associacoes ?? []

  // Injeta CSS de animação para riscos críticos
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'risco-pulse-css'
    style.innerHTML = `
      @keyframes risco-ripple {
        0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; }
        100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
      }
      .risco-pulse-ring {
        animation: risco-ripple 1.6s ease-out infinite;
        transform-origin: center;
        pointer-events: none;
      }
    `
    if (!document.getElementById('risco-pulse-css')) document.head.appendChild(style)
    return () => { const el = document.getElementById('risco-pulse-css'); if (el) el.remove() }
  }, [])

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
  const confirmarMitigacao = async (id) => {
    await supabase.from('riscos').update({ status: 'mitigado', descricao_mitigacao: txtMitigacao || null }).eq('id', id)
    setMitigandoId(null); setTxtMitigacao(''); load()
  }
  const excluirRisco = async (id) => {
    if (!confirm('Excluir este risco?')) return
    await supabase.from('riscos').delete().eq('id', id); load()
  }

  // ── Helpers do mapa ──
  const riscosPorComunidade = (id) => riscos.filter(r => r.comunidade_id === id && r.status === 'ativo')

  const getRiscoRing = (comunidadeId) => {
    const ativos = riscosPorComunidade(comunidadeId)
    if (ativos.length === 0) return null
    const highest = ativos.reduce((acc, r) =>
      (NIVEL_ORDER[r.nivel] ?? 0) > (NIVEL_ORDER[acc.nivel] ?? 0) ? r : acc)
    return getNivel(highest.nivel).ring
  }

  const temRiscoCritico = (comunidadeId) =>
    riscosPorComunidade(comunidadeId).some(r => r.nivel === 'critico')

  const getColor = (count) => count >= 3 ? '#FF8F1F' : count >= 2 ? '#2ED7ED' : '#BCFF48'
  const getRadius = (count) => Math.max(8, count * 5 + 6)

  const riscosFiltrados = riscos.filter(r => filtroStatus === 'todos' || r.status === filtroStatus)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-oceano rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Mapa das Comunidades</h1>
            <p className="text-gray-400 text-sm">Distribuição e riscos por região</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFormRisco(emptyRisco); setModalRisco(true) }}
            className="flex items-center gap-2 bg-laranja/90 hover:bg-laranja text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <AlertTriangle size={14} /> Cadastrar Risco
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

              {/* Pulso de destaque para riscos críticos ativos, abaixo do marcador da comunidade */}
              {comunidades.filter(c => temRiscoCritico(c.id)).map(c => (
                <Marker key={`pulse-${c.id}`} position={[c.lat, c.lng]} icon={createPulseIcon(getNivel('critico').ring)} interactive={false} />
              ))}

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
            </MapContainer>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-72 flex flex-col gap-2" style={{ height: 540 }}>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 shrink-0">
            <div className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-petroleum text-verde text-center">
              ⚠ Riscos ({riscos.filter(r => r.status === 'ativo').length})
            </div>
          </div>

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
                <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-3 ${r.status === 'ativo' ? 'border-l-4' : 'border-gray-100'}`}
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
                  {mitigandoId === r.id ? (
                    <div className="mt-2">
                      <textarea
                        value={txtMitigacao}
                        onChange={e => setTxtMitigacao(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="Como foi mitigado? Descreva a estratégia..."
                        className="w-full border border-cinza rounded-lg px-2.5 py-2 text-xs text-petroleum focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent resize-none transition-shadow"
                      />
                      <div className="flex gap-1.5 mt-1.5">
                        <button onClick={() => { setMitigandoId(null); setTxtMitigacao('') }}
                          className="flex-1 text-xs py-1.5 border border-cinza text-gray-400 rounded-lg hover:text-petroleum transition-colors">
                          Cancelar
                        </button>
                        <button onClick={() => confirmarMitigacao(r.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-petroleum text-verde rounded-lg font-semibold transition-colors">
                          <CheckCircle size={11} /> Confirmar
                        </button>
                      </div>
                    </div>
                  ) : r.status === 'ativo' ? (
                    <button onClick={() => { setMitigandoId(r.id); setTxtMitigacao('') }}
                      className="flex items-center gap-1.5 mt-2 text-xs bg-petroleum/8 hover:bg-petroleum/15 text-petroleum px-2.5 py-1.5 rounded-lg font-semibold transition-colors w-full justify-center">
                      <CheckCircle size={12} /> Marcar como mitigado
                    </button>
                  ) : r.status === 'mitigado' && (
                    <div className="mt-2 bg-verde/10 border border-verde/25 rounded-lg px-2.5 py-2">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="text-xs font-bold text-petroleum/50 uppercase tracking-wide">Estratégia de mitigação</p>
                        <button onClick={() => { setMitigandoId(r.id); setTxtMitigacao(r.descricao_mitigacao || '') }}
                          className="p-0.5 text-petroleum/40 hover:text-oceano transition-colors shrink-0"><Pencil size={12} /></button>
                      </div>
                      {r.descricao_mitigacao ? (
                        <p className="text-xs text-petroleum/80 leading-relaxed">{r.descricao_mitigacao}</p>
                      ) : (
                        <p className="text-xs text-petroleum/40 italic">Nenhuma descrição adicionada</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
        <span className="text-xs text-gray-400 italic">(crítico pisca no mapa)</span>
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
    </div>
  )
}
