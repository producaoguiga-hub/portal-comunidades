import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Lideres from './pages/Lideres'
import Vagas from './pages/Vagas'
import Servicos from './pages/Servicos'
import Funcionarios from './pages/Funcionarios'
import AcoesSociais from './pages/AcoesSociais'
import MinhaComunidade from './pages/MinhaComunidade'
import Comunidades from './pages/Comunidades'
import Usuarios from './pages/Usuarios'
import Associacoes from './pages/Associacoes'

const defaultPage = { admin: 'dashboard', gestor: 'dashboard', lider: 'minha-comunidade' }

function AppContent() {
  const { user, role, liderSession, loading } = useAuth()
  const [page, setPage] = useState(null)

  const currentRole = liderSession ? 'lider' : role

  useEffect(() => {
    if (currentRole) setPage(defaultPage[currentRole] ?? 'dashboard')
  }, [currentRole])

  if (loading) {
    return (
      <div className="min-h-screen bg-petroleum flex items-center justify-center">
        <div className="text-verde/60 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!user && !liderSession) return <Login />

  const pages = {
    dashboard: <Dashboard />,
    lideres: <Lideres />,
    vagas: <Vagas />,
    servicos: <Servicos />,
    funcionarios: <Funcionarios />,
    acoes: <AcoesSociais />,
    associacoes: <Associacoes />,
    'minha-comunidade': <MinhaComunidade />,
    ...(role === 'admin' ? {
      comunidades: <Comunidades />,
      usuarios: <Usuarios />,
    } : {}),
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {pages[page] ?? <Dashboard />}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
