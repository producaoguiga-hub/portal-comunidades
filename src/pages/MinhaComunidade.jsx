import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MapPin, UserCheck, Building2, Phone } from 'lucide-react'
import WhatsAppIcon from '../components/WhatsAppIcon'

export default function MinhaComunidade() {
  const { liderSession } = useAuth()
  const [associacoes, setAssociacoes] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!liderSession?.comunidadeId) return
    const load = async () => {
      setLoading(true)
      const [assocRes, funcRes] = await Promise.all([
        supabase.from('associacoes').select('*').eq('comunidade_id', liderSession.comunidadeId),
        supabase.from('funcionarios_associacao').select('*').eq('comunidade_id', liderSession.comunidadeId),
      ])
      setAssociacoes(assocRes.data ?? [])
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

          {/* Associações */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-oceano/15 flex items-center justify-center shrink-0">
                <Building2 size={15} className="text-oceano" />
              </div>
              <h2 className="font-semibold text-petroleum text-sm">Associações da Comunidade</h2>
              <span className="ml-auto text-xs font-semibold text-oceano bg-oceano/10 px-2 py-0.5 rounded-full">
                {associacoes.length}
              </span>
            </div>
            {associacoes.length === 0 ? (
              <p className="px-5 py-8 text-sm text-cinza text-center">Nenhuma associação vinculada ainda.</p>
            ) : (
              <div className="p-4 space-y-3">
                {associacoes.map(a => (
                  <div key={a.id} className="rounded-xl border border-gray-100 p-4 hover:border-oceano/30 hover:bg-oceano/5 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-petroleum leading-tight">{a.nome}</p>
                      {a.sigla && (
                        <span className="px-2 py-0.5 bg-petroleum text-verde rounded font-mono text-xs font-bold shrink-0">{a.sigla}</span>
                      )}
                    </div>
                    {a.representante_legal && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <UserCheck size={11} className="shrink-0 text-oceano" />
                        {a.representante_legal}
                      </div>
                    )}
                    {a.telefone && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone size={11} className="shrink-0" />
                          {a.telefone}
                        </div>
                        <a href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                          className="text-green-500 hover:text-green-600 transition-colors">
                          <WhatsAppIcon size={13} />
                        </a>
                      </div>
                    )}
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
