import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Briefcase, Heart, UserCheck, Calendar, FileText } from 'lucide-react'

const tables = [
  {
    key: 'lideres', label: 'Líderes', icon: Users,
    iconBg: 'bg-oceano/15', iconColor: 'text-oceano',
    border: 'border-t-oceano',
  },
  {
    key: 'vagas', label: 'Vagas', icon: Briefcase,
    iconBg: 'bg-verde/20', iconColor: 'text-petroleum',
    border: 'border-t-verde',
  },
  {
    key: 'candidaturas', label: 'Candidaturas', icon: FileText,
    iconBg: 'bg-laranja/15', iconColor: 'text-laranja',
    border: 'border-t-laranja',
  },
  {
    key: 'servicos_comunidade', label: 'Serviços', icon: Heart,
    iconBg: 'bg-oceano-light/15', iconColor: 'text-oceano-light',
    border: 'border-t-oceano-light',
  },
  {
    key: 'funcionarios_associacao', label: 'Funcionários', icon: UserCheck,
    iconBg: 'bg-laranja-light/20', iconColor: 'text-laranja',
    border: 'border-t-laranja-light',
  },
  {
    key: 'acoes_sociais', label: 'Ações Sociais', icon: Calendar,
    iconBg: 'bg-verde-light/30', iconColor: 'text-petroleum',
    border: 'border-t-verde-light',
  },
]

export default function Dashboard() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [recentLideres, setRecentLideres] = useState([])
  const [recentVagas, setRecentVagas] = useState([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const results = await Promise.all(
        tables.map(({ key }) =>
          supabase.from(key).select('*', { count: 'exact', head: true })
        )
      )
      const newCounts = {}
      tables.forEach(({ key }, i) => {
        newCounts[key] = results[i].count ?? 0
      })
      setCounts(newCounts)

      const [lidRes, vagRes] = await Promise.all([
        supabase.from('lideres').select('nome, regiao, status').order('created_at', { ascending: false }).limit(5),
        supabase.from('vagas').select('titulo, unidade, status').order('created_at', { ascending: false }).limit(5),
      ])
      setRecentLideres(lidRes.data ?? [])
      setRecentVagas(vagRes.data ?? [])
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <div>
      {/* Page header */}
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-verde rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Dashboard</h1>
            <p className="text-gray-400 text-sm">Visão geral do Portal Comunidades</p>
          </div>
        </div>
      </div>

      {/* Counter cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {tables.map(({ key, label, icon: Icon, iconBg, iconColor, border }) => (
          <div key={key} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-2 ${border} p-4 hover:shadow-md transition-shadow`}>
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${iconBg} mb-3`}>
              <Icon size={17} className={iconColor} />
            </div>
            <p className="text-2xl font-bold text-petroleum">
              {loading ? <span className="text-cinza">—</span> : counts[key] ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Líderes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-oceano" />
            <h2 className="font-semibold text-petroleum text-sm">Últimos Líderes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <p className="px-5 py-4 text-sm text-cinza">Carregando...</p>
            ) : recentLideres.length === 0 ? (
              <p className="px-5 py-4 text-sm text-cinza">Nenhum líder cadastrado.</p>
            ) : recentLideres.map((l, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-verde/5 transition-colors">
                <div>
                  <p className="text-sm font-medium text-petroleum">{l.nome}</p>
                  <p className="text-xs text-gray-400">{l.regiao ?? '—'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  l.status === 'ativo'
                    ? 'bg-verde text-petroleum'
                    : 'bg-cinza-light text-gray-500'
                }`}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Vagas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-verde" />
            <h2 className="font-semibold text-petroleum text-sm">Últimas Vagas</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <p className="px-5 py-4 text-sm text-cinza">Carregando...</p>
            ) : recentVagas.length === 0 ? (
              <p className="px-5 py-4 text-sm text-cinza">Nenhuma vaga cadastrada.</p>
            ) : recentVagas.map((v, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-verde/5 transition-colors">
                <div>
                  <p className="text-sm font-medium text-petroleum">{v.titulo}</p>
                  <p className="text-xs text-gray-400">{v.unidade ?? '—'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  v.status === 'aberta' ? 'bg-verde text-petroleum' :
                  v.status === 'em_andamento' ? 'bg-laranja/20 text-laranja' :
                  'bg-cinza-light text-gray-500'
                }`}>{v.status?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
