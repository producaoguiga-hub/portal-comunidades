import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Briefcase, Heart, UserCheck, Calendar, Building2, MapPin } from 'lucide-react'

const cards = [
  { key: 'associacoes',           label: 'Associações',  icon: Building2, iconBg: 'bg-oceano/15',        iconColor: 'text-oceano',    border: 'border-t-oceano'       },
  { key: 'vagas',                 label: 'Vagas',        icon: Briefcase, iconBg: 'bg-verde/20',         iconColor: 'text-petroleum', border: 'border-t-verde'        },
  { key: 'servicos_comunidade',   label: 'Serviços',     icon: Heart,     iconBg: 'bg-laranja/15',        iconColor: 'text-laranja',   border: 'border-t-laranja'      },
  { key: 'funcionarios_associacao', label: 'Funcionários', icon: UserCheck, iconBg: 'bg-laranja-light/20', iconColor: 'text-laranja',   border: 'border-t-laranja-light'},
  { key: 'acoes_sociais',         label: 'Ações Sociais',icon: Calendar,  iconBg: 'bg-verde-light/30',   iconColor: 'text-petroleum', border: 'border-t-verde-light'  },
  { key: 'comunidades',           label: 'Comunidades',  icon: MapPin,    iconBg: 'bg-oceano/10',        iconColor: 'text-oceano',    border: 'border-t-oceano'       },
]

export default function Dashboard() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [communityStats, setCommunityStats] = useState([])

  useEffect(() => {
    const loadCounts = async () => {
      setLoading(true)
      const results = await Promise.all(
        cards.map(({ key }) => supabase.from(key).select('*', { count: 'exact', head: true }))
      )
      const c = {}
      cards.forEach(({ key }, i) => { c[key] = results[i].count ?? 0 })
      setCounts(c)
      setLoading(false)
    }

    const loadStats = async () => {
      setStatsLoading(true)
      const [comRes, vagRes, funcRes, acaoRes, assocRes] = await Promise.all([
        supabase.from('comunidades').select('id, nome').order('nome'),
        supabase.from('vagas').select('comunidade_id'),
        supabase.from('funcionarios_associacao').select('comunidade_id'),
        supabase.from('acoes_sociais').select('comunidade_id, valor_solicitado'),
        supabase.from('associacoes').select('comunidade_id'),
      ])

      const stats = {}
      for (const c of comRes.data ?? []) {
        stats[c.id] = { nome: c.nome, vagas: 0, funcionarios: 0, acoes: 0, valor: 0, associacoes: 0 }
      }
      for (const r of assocRes.data ?? []) {
        if (r.comunidade_id && stats[r.comunidade_id]) stats[r.comunidade_id].associacoes++
      }
      for (const r of vagRes.data ?? []) {
        if (r.comunidade_id && stats[r.comunidade_id]) stats[r.comunidade_id].vagas++
      }
      for (const r of funcRes.data ?? []) {
        if (r.comunidade_id && stats[r.comunidade_id]) stats[r.comunidade_id].funcionarios++
      }
      for (const r of acaoRes.data ?? []) {
        if (r.comunidade_id && stats[r.comunidade_id]) {
          stats[r.comunidade_id].acoes++
          stats[r.comunidade_id].valor += Number(r.valor_solicitado ?? 0)
        }
      }

      const arr = Object.values(stats)
        .filter(s => s.associacoes > 0 || s.vagas > 0 || s.funcionarios > 0 || s.acoes > 0)
        .sort((a, b) => (b.vagas + b.funcionarios + b.acoes) - (a.vagas + a.funcionarios + a.acoes))

      setCommunityStats(arr)
      setStatsLoading(false)
    }

    loadCounts()
    loadStats()
  }, [])

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-verde rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-petroleum">Dashboard</h1>
            <p className="text-gray-400 text-sm">Visão geral do Portal Comunidades</p>
          </div>
        </div>
      </div>

      {/* Contadores gerais */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map(({ key, label, icon: Icon, iconBg, iconColor, border }) => (
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

      {/* Stats por comunidade */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-oceano" />
          <h2 className="font-semibold text-petroleum text-sm">Resumo por Comunidade</h2>
        </div>

        {statsLoading ? (
          <div className="py-10 text-center text-cinza text-sm">Carregando...</div>
        ) : communityStats.length === 0 ? (
          <div className="py-10 text-center text-cinza text-sm">Nenhum dado vinculado a comunidades ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-petroleum/5 border-b">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-petroleum/70 uppercase tracking-wider">Comunidade</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-petroleum/70 uppercase tracking-wider">Associações</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-petroleum/70 uppercase tracking-wider">Vagas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-petroleum/70 uppercase tracking-wider">Funcionários</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-petroleum/70 uppercase tracking-wider">Ações Sociais</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-petroleum/70 uppercase tracking-wider">Valor Solicitado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {communityStats.map((s, i) => (
                  <tr key={i} className="hover:bg-verde/5 transition-colors">
                    <td className="px-5 py-3 font-medium text-petroleum">{s.nome}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-oceano/15 text-oceano">{s.associacoes}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-verde/30 text-petroleum">{s.vagas}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-laranja/15 text-laranja">{s.funcionarios}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cinza-light text-gray-500">{s.acoes}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-petroleum">
                      {s.valor > 0 ? `R$ ${s.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
