import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  adminOnly?: boolean
  section?: 'suppliers' | 'academic' | 'orders'
}

export default function ProtectedRoute({ adminOnly = false, section }: Props) {
  const { user, profile, loading, canAccess } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Redirect client-role users to their portal
  if (profile?.role === 'client') return <Navigate to="/my" replace />

  // Block disabled accounts
  if (profile?.disabled) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-white font-semibold text-lg">Аккаунт отключён</h2>
          <p className="text-slate-400 text-sm max-w-xs">Ваш аккаунт был деактивирован администратором. Обратитесь к администратору для восстановления доступа.</p>
        </div>
      </div>
    )
  }

  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  if (section && !canAccess(section)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
