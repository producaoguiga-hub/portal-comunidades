import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

export default function Mapa() {
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('comunidades')
      .select('id, nome, lat, lng, associacoes(id, nome, sigla, representante_legal, telefone)')
      .not('lat', 'is', null)
      .then(({ data }) => {
        setComunidades(data ?? [])
        setLoading(false)
      })
  }, [])

  const getColor = (count) => {
    if (count >= 3) return '#FF8F1F'
    if (count >= 2) return '#2ED7ED'
    return '#BCFF48'
  }

  const getRadius = (count) => Math.max(8, count * 5 + 6)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-7 bg-oceano rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-petroleum">Mapa das Comunidades</h1>
          <p className="text-gray-400 text-sm">Distribuição das associações na Bahia</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 520 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-cinza text-sm">Carregando mapa...</div>
        ) : (
          <MapContainer
            center={[-12.3, -38.5]}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            {comunidades.map(c => {
              const count = c.associacoes?.length ?? 0
              return (
                <CircleMarker
                  key={c.id}
                  center={[c.lat, c.lng]}
                  radius={getRadius(count)}
                  pathOptions={{
                    fillColor: getColor(count),
                    fillOpacity: 0.85,
                    color: '#091C28',
                    weight: 1.5,
                  }}
                >
                  <Popup minWidth={200}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#091C28', marginBottom: 8 }}>
                        {c.nome}
                      </p>
                      {count === 0 ? (
                        <p style={{ fontSize: 12, color: '#999' }}>Sem associações vinculadas</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {c.associacoes.map(a => (
                            <div key={a.id} style={{ borderLeft: '3px solid #2ED7ED', paddingLeft: 8 }}>
                              <p style={{ fontWeight: 600, fontSize: 12, color: '#091C28' }}>
                                {a.sigla ? `${a.sigla} — ${a.nome}` : a.nome}
                              </p>
                              {a.representante_legal && (
                                <p style={{ fontSize: 11, color: '#666' }}>Rep.: {a.representante_legal}</p>
                              )}
                              {a.telefone && (
                                <a
                                  href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: 11, color: '#25D366', fontWeight: 600 }}
                                >
                                  {a.telefone}
                                </a>
                              )}
                            </div>
                          ))}
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

      <div className="flex items-center gap-6 mt-4 px-1">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mr-2">Associações:</p>
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
        <p className="text-xs text-gray-400 ml-auto">Clique na bolinha para ver detalhes</p>
      </div>
    </div>
  )
}
