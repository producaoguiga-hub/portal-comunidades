import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MapPin, UserCheck, Building2 } from 'lucide-react'

export default function MinhaComunidade() {
  const { liderSession } = useAuth()
  const [lideres, setLideres] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!liderSession?.comunidadeId) return
    const load = async () => {
      setLoading(true)
      const [lidRes, funcRes] = await Promise.all([
        supabase.from('lideres').select('*').eq('comunidade_id', liderSession.comunidadeId),
        supabase.from('funcionarios_associacao').select('*').eq('comunidade_id', liderSession.comunidadeId),
      ])
      setLideres(lidRes.data ?? [])
      setFuncionarios(funcRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [liderSession])

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-1 h-7 bg-verde rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-petroleum">{liderSession?.comunidadeNome}</h1>
          <p className="text-gray-400 text-sm">Informações da sua comunidade</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-cinza text-sm">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Líderes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-oceano/15 flex items-center justify-center shrink-0">
                <MapPin size={15} className="text-oceano" />
              </div>
              <h2 className="font-semibold text-petroleum text-sm">Líderes da Comunidade</h2>
              <span className="ml-auto text-xs font-semibold text-oceano bg-oceano/10 px-2 py-0.5 rounded-full">
                {lideres.length}
              </span>
            </div>
            {lideres.length === 0 ? (
              <p className="px-5 py-8 text-sm text-cinza text-center">Nenhum líder vinculado ainda.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {lideres.map(l => (
                  <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-petroleum">{l.nome}</p>
                      {l.contato && <p className="text-xs text-gray-400 mt-0.5">{l.contato}</p>}
                      {l.regiao && <p className="text-xs text-gray-400">Região: {l.regiao}</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                      l.status === 'ativo' ? 'bg-verde text-petroleum' : 'bg-cinza-light text-gray-500'
                    }`}>{l.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Funcionários */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-laranja-light/20 flex items-center justify-center shrink-0">
                <UserCheck size={15} className="text-laranja" />
              </div>
              <h2 className="font-semibold text-petroleum text-sm">Funcionários da Associação</h2>
              <span className="ml-auto text-xs font-semibold text-laranja bg-laranja/10 px-2 py-0.5 rounded-full">
                {funcionarios.length}
              </span>
            </div>
            {funcionarios.length === 0 ? (
              <p className="px-5 py-8 text-sm text-cinza text-center">Nenhum funcionário vinculado ainda.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {funcionarios.map(f => (
                  <div key={f.id} className="px-5 py-3">
                    <p className="text-sm font-semibold text-petroleum">{f.funcionario_nome}</p>
                    <div className="flex items-center gap-4 mt-0.5">
                      {f.associacao && (
                        <p className="text-xs text-gray-400">{f.associacao}</p>
                      )}
                      {f.unidade && (
                        <p className="text-xs text-oceano font-medium flex items-center gap-1">
                          <Building2 size={11} /> {f.unidade}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
