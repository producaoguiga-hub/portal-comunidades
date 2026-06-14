import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Users, Briefcase, Heart, UserCheck, Calendar, LayoutDashboard,
  LogOut, Menu, X, ChevronRight, Home, MapPin, Shield, Building2, Map, Layers
} from 'lucide-react'

const navAdmin = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'associacoes', label: 'Associações', icon: Building2 },
  { id: 'vagas', label: 'Vagas', icon: Briefcase },
  { id: 'servicos', label: 'Serviços', icon: Heart },
  { id: 'funcionarios', label: 'Funcionários', icon: UserCheck },
  { id: 'unidades', label: 'Unidades', icon: Layers },
  { id: 'acoes', label: 'Ações Sociais', icon: Calendar },
  { id: 'mapa', label: 'Mapa', icon: Map },
  { id: 'comunidades', label: 'Comunidades', icon: MapPin },
  { id: 'usuarios', label: 'Usuários', icon: Shield },
]

const navGestor = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'associacoes', label: 'Associações', icon: Building2 },
  { id: 'vagas', label: 'Vagas', icon: Briefcase },
  { id: 'servicos', label: 'Serviços', icon: Heart },
  { id: 'funcionarios', label: 'Funcionários', icon: UserCheck },
  { id: 'unidades', label: 'Unidades', icon: Layers },
  { id: 'acoes', label: 'Ações Sociais', icon: Calendar },
  { id: 'mapa', label: 'Mapa', icon: Map },
]

const navLider = [
  { id: 'minha-comunidade', label: 'Minha Comunidade', icon: Home },
  { id: 'vagas', label: 'Banco de Talentos', icon: Briefcase },
  { id: 'servicos', label: 'Serviços', icon: Heart },
  { id: 'acoes', label: 'Ações Sociais', icon: Calendar },
]

export default function Layout({ currentPage, onNavigate, children }) {
  const { user, role, liderSession, unidadeSession, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = liderSession ? navLider : role === 'admin' ? navAdmin : navGestor
  const displayName = liderSession ? liderSession.comunidadeNome : unidadeSession ? unidadeSession.unidadeNome : user?.email
  const displayRole = liderSession ? 'Líder Comunitário' : unidadeSession ? 'Unidade' : role === 'admin' ? 'Administrador' : 'Gestor'

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ backgroundImage: 'url(/fundo-tela.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-petroleum text-white flex flex-col transition-all duration-300 shrink-0 shadow-xl`}>

        <div className="px-4 pt-3 pb-4 border-b border-petroleum-light">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-petroleum-light rounded-lg transition-colors text-cinza hover:text-verde"
            >
              {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
          {sidebarOpen && (
            <div className="flex justify-center">
              <img src="/logo-colorida.png" alt="Comissão de Comunidades" className="h-[216px] w-auto object-contain mx-auto" />
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={!sidebarOpen ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPage === id
                  ? 'bg-verde text-petroleum shadow-sm'
                  : 'text-cinza hover:bg-petroleum-light hover:text-white'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && currentPage === id && (
                <ChevronRight size={13} className="ml-auto text-petroleum/60" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-petroleum-light">
          {sidebarOpen && (
            <>
              <div className="flex justify-center mb-3">
                <img src="/logo-branca.png" alt="Comissão de Comunidades" className="h-[82px] w-auto object-contain" />
              </div>
              <div className="mb-2 px-1">
                <p className="text-white/70 text-xs truncate font-medium">{displayName}</p>
                <p className="text-oceano/60 text-xs">{displayRole}</p>
              </div>
            </>
          )}
          <button
            onClick={signOut}
            title={!sidebarOpen ? 'Sair' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-cinza hover:bg-petroleum-light hover:text-laranja transition-colors"
          >
            <LogOut size={17} className="shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-white/95">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
