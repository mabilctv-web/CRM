import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/suppliers': 'Поставщики',
  '/admin/criteria': 'Управление критериями',
  '/admin/payment-contacts': 'Реквизиты оплаты',
  '/academic/clients': 'Учебные услуги',
  '/profile': 'Мой профиль',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const title = Object.entries(routeTitles).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'SupplierCRM'

  return (
    <div className="flex h-screen overflow-hidden bg-navy-900">
      <Sidebar collapsed={collapsed} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center px-6 gap-4 border-b border-white/[0.06] bg-navy-800/50 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
          <h1 className="text-base font-semibold text-white">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Онлайн</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="page-enter p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
