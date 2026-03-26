import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  LogOut,
  ChevronRight,
  Layers,
  Shield,
  Settings,
  GraduationCap,
  CreditCard,
  Users,
  Bell,
  BellRing,
  Tag,
  ShoppingBag,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../contexts/AuthContext'

const supplierAdminNav = [
  { to: '/admin/criteria', icon: ListChecks, label: 'Критерии' },
  { to: '/admin/categories', icon: Tag, label: 'Категории' },
]

const studentAdminNav = [
  { to: '/admin/payment-contacts', icon: CreditCard, label: 'Реквизиты' },
  { to: '/admin/notifications', icon: Bell, label: 'Оповещения' },
  { to: '/admin/admin-notifications', icon: BellRing, label: 'Адм. оповещения' },
]

interface SidebarProps {
  collapsed: boolean
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { profile, isAdmin, canAccess, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="h-screen flex flex-col bg-navy-800 border-r border-white/[0.06] overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow flex-shrink-0">
          <Layers size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="font-bold text-white text-sm tracking-wide">SupplierCRM</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Дашборд" collapsed={collapsed} active={location.pathname === '/dashboard'} />
        {canAccess('suppliers') && (
          <NavItem to="/suppliers" icon={Building2} label="Поставщики" collapsed={collapsed} active={location.pathname.startsWith('/suppliers')} />
        )}
        {canAccess('academic') && (
          <NavItem to="/academic/clients" icon={GraduationCap} label="Учебные услуги" collapsed={collapsed} active={location.pathname.startsWith('/academic')} />
        )}
        {canAccess('orders') && (
          <NavItem to="/crm/orders" icon={ShoppingBag} label="Разовые заявки" collapsed={collapsed} active={location.pathname.startsWith('/crm')} />
        )}
        {isAdmin && (
          <>
            <div className={clsx('my-3 flex items-center gap-2', collapsed ? 'px-2' : 'px-3')}>
              {!collapsed && (
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Администрирование
                </span>
              )}
              {collapsed && <div className="w-full h-px bg-white/[0.07]" />}
            </div>
            <NavItem to="/admin/users" icon={Users} label="Пользователи" collapsed={collapsed} active={location.pathname === '/admin/users'} />
            {!collapsed && (
              <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest px-3 pt-3 pb-1">Поставщики</p>
            )}
            {collapsed && <div className="my-1 mx-2 h-px bg-white/[0.04]" />}
            {supplierAdminNav.map(({ to, icon: Icon, label }) => (
              <NavItem key={to} to={to} icon={Icon} label={label} collapsed={collapsed} active={location.pathname === to} />
            ))}
            {!collapsed && (
              <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest px-3 pt-3 pb-1">Студенты</p>
            )}
            {collapsed && <div className="my-1 mx-2 h-px bg-white/[0.04]" />}
            {studentAdminNav.map(({ to, icon: Icon, label }) => (
              <NavItem key={to} to={to} icon={Icon} label={label} collapsed={collapsed} active={location.pathname === to} />
            ))}
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="p-2 border-t border-white/[0.06] space-y-1 flex-shrink-0">
        <button
          onClick={() => navigate('/profile')}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
            collapsed && 'justify-center',
            location.pathname === '/profile'
              ? 'bg-primary-600/15 border border-primary-500/20'
              : 'hover:bg-white/[0.05]',
          )}
        >
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            {isAdmin && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                <Shield size={8} className="text-white" />
              </div>
            )}
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Пользователь'}</p>
              <p className="text-xs text-slate-500">
                {isAdmin ? 'Администратор' : 'Пользователь'}
              </p>
            </motion.div>
          )}
          {!collapsed && (
            <Settings size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
          )}
        </button>
        <button
          onClick={signOut}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200',
            collapsed && 'justify-center',
          )}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Выйти</span>}
        </button>
      </div>
    </motion.aside>
  )
}

function NavItem({
  to, icon: Icon, label, collapsed, active,
}: {
  to: string
  icon: React.ElementType
  label: string
  collapsed: boolean
  active: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative',
        collapsed && 'justify-center',
        isActive
          ? 'bg-primary-600/20 text-primary-300'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]',
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 bg-primary-600/20 rounded-xl border border-primary-500/20"
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            />
          )}
          <Icon size={18} className={clsx('flex-shrink-0 relative z-10', isActive && 'text-primary-400')} />
          {!collapsed && (
            <span className="text-sm font-medium relative z-10 whitespace-nowrap">{label}</span>
          )}
          {!collapsed && isActive && (
            <ChevronRight size={14} className="ml-auto text-primary-400/60 relative z-10" />
          )}
        </>
      )}
    </NavLink>
  )
}
