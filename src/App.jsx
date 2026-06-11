import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Lideres from './pages/Lideres'
import Vagas from './pages/Vagas'
import Servicos from './pages/Servicos'
import Funcionarios from './pages/Funcionarios'
import AcoesSociais from './pages/AcoesSociais'

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!user) return <Login />

  const pages = {
    dashboard: <Dashboard />,
    lideres: <Lideres />,
    vagas: <Vagas />,
    servicos: <Servicos />,
    funcionarios: <Funcionarios />,
    acoes: <AcoesSociais />,
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
