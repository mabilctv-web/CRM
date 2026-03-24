import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, CheckCircle, TrendingUp, FileText, ArrowUpRight, Clock, GraduationCap, BookOpen, Wallet, AlertCircle, Calendar, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import type { Supplier } from '../types'
import clsx from 'clsx'

interface Stats {
  total: number
  active: number
  newThisMonth: number
  priceLists: number
}

interface CategoryData {
  name: string
  count: number
}

interface MonthData {
  month: string
  count: number
}

interface AcademicSummary {
  activeClients: number
  totalClients: number
  inProgress: number
  overdue: number
  totalDebt: number
  totalIncome: number
  upcomingAssignments: {
    id: number
    clientId: number
    clientName: string
    name: string
    subjectName: string | null
    deadline: string | null
    status: string
    type: string
  }[]
}

const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#6366f1']

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * value))
      if (progress === 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])

  return <>{count}</>
}

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, newThisMonth: 0, priceLists: 0 })
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [academic, setAcademic] = useState<AcademicSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd = endOfMonth(now).toISOString()

      const [
        { count: total },
        { count: active },
        { count: newThisMonth },
        { count: priceLists },
        { data: allSuppliers },
        clients,
        assignments,
        subjects,
        finances,
      ] = await Promise.all([
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }).gte('created_at', monthStart).lte('created_at', monthEnd),
        supabase.from('price_lists').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('category, created_at'),
        supabase.from('academic_clients').select('id, name, active'),
        supabase.from('academic_assignments').select('id, client_id, subject_id, name, type, deadline, status').neq('status', 'done'),
        supabase.from('academic_subjects').select('id, name'),
        supabase.from('academic_finances').select('client_id, debt, income'),
      ])

      setStats({
        total: total ?? 0,
        active: active ?? 0,
        newThisMonth: newThisMonth ?? 0,
        priceLists: priceLists ?? 0,
      })

      // Category distribution
      if (allSuppliers) {
        const catMap: Record<string, number> = {}
        allSuppliers.forEach(s => {
          const cat = s.category ?? 'Другое'
          catMap[cat] = (catMap[cat] ?? 0) + 1
        })
        setCategories(Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))

        const months: MonthData[] = []
        for (let i = 5; i >= 0; i--) {
          const m = subMonths(now, i)
          const mStart = startOfMonth(m).toISOString()
          const mEnd = endOfMonth(m).toISOString()
          const count = allSuppliers.filter(s => s.created_at >= mStart && s.created_at <= mEnd).length
          months.push({ month: format(m, 'LLL', { locale: ru }), count })
        }
        setMonthlyData(months)
      }

      // Academic summary
      const clientList = (clients.data ?? []) as { id: number; name: string; active: boolean }[]
      const asgn = (assignments.data ?? []) as { id: number; client_id: number; subject_id: number | null; name: string; type: string; deadline: string | null; status: string }[]
      const subj = (subjects.data ?? []) as { id: number; name: string }[]
      const fin = (finances.data ?? []) as { client_id: number; debt: number; income: number }[]

      const now2 = new Date()
      const overdueList = asgn.filter(a => a.deadline && isPast(parseISO(a.deadline)))
      const inProgressList = asgn.filter(a => a.status === 'in_progress' || a.status === 'queue')

      // Sort by deadline (closest first, then no deadline)
      const sorted = [...asgn]
        .filter(a => a.deadline)
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
        .slice(0, 5)

      const upcoming = sorted.map(a => ({
        id: a.id,
        clientId: a.client_id,
        clientName: clientList.find(c => c.id === a.client_id)?.name ?? 'Клиент',
        name: a.name,
        subjectName: a.subject_id ? (subj.find(s => s.id === a.subject_id)?.name ?? null) : null,
        deadline: a.deadline,
        status: a.deadline && isPast(parseISO(a.deadline)) ? 'overdue' : a.status,
        type: a.type,
      }))

      setAcademic({
        activeClients: clientList.filter(c => c.active).length,
        totalClients: clientList.length,
        inProgress: inProgressList.length,
        overdue: overdueList.length,
        totalDebt: fin.reduce((s, f) => s + (Number(f.debt) || 0), 0),
        totalIncome: fin.reduce((s, f) => s + (Number(f.income) || 0), 0),
        upcomingAssignments: upcoming,
      })

      setLoading(false)
    }

    load()
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Доброе утро'
    if (h < 18) return 'Добрый день'
    return 'Добрый вечер'
  }

  const statCards = [
    { title: 'Всего поставщиков', value: stats.total, icon: Building2, color: 'from-primary-500/20 to-primary-600/10', iconColor: 'text-primary-400', border: 'hover:border-primary-500/30' },
    { title: 'Активных', value: stats.active, icon: CheckCircle, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400', border: 'hover:border-emerald-500/30' },
    { title: 'Добавлено в месяце', value: stats.newThisMonth, icon: TrendingUp, color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-400', border: 'hover:border-cyan-500/30' },
    { title: 'Прайс-листов', value: stats.priceLists, icon: FileText, color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400', border: 'hover:border-amber-500/30' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting()}, <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">{profile?.full_name?.split(' ')[0] ?? 'Пользователь'}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: ru })}
          </p>
        </div>
        <Link
          to="/suppliers"
          className="flex items-center gap-2 bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 text-sm font-medium px-4 py-2.5 rounded-xl border border-primary-500/20 hover:border-primary-500/40 transition-all duration-200"
        >
          Все поставщики
          <ArrowUpRight size={15} />
        </Link>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, color, iconColor, border }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            className={`glass rounded-2xl p-5 bg-gradient-to-br ${color} border border-white/[0.06] ${border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center ${iconColor}`}>
                <Icon size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? '—' : <AnimatedCounter value={value} />}
            </p>
            <p className="text-sm text-slate-400">{title}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly chart */}
        <motion.div variants={item} className="glass rounded-2xl p-6 border border-white/[0.06]">
          <h3 className="text-base font-semibold text-white mb-1">Динамика добавления</h3>
          <p className="text-xs text-slate-500 mb-6">Поставщики за последние 6 месяцев</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0f1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }}
                cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                formatter={(v: number) => [v, 'Поставщиков']}
              />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category pie */}
        <motion.div variants={item} className="glass rounded-2xl p-6 border border-white/[0.06]">
          <h3 className="text-base font-semibold text-white mb-1">По категориям</h3>
          <p className="text-xs text-slate-500 mb-6">Распределение поставщиков</p>
          {categories.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              Нет данных
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {categories.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }}
                  formatter={(v: number, _: string, props: { payload?: { name: string } }) => [v, props.payload?.name ?? '']}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Academic summary */}
      <motion.div variants={item} className="glass rounded-2xl border border-white/[0.06]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Учебные услуги — сводка</h3>
          </div>
          <Link to="/academic/clients" className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
            Все клиенты <ArrowUpRight size={12} />
          </Link>
        </div>

        {loading || !academic ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl shimmer-bg" />)}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-xl shimmer-bg" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Mini stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-b border-white/[0.06] bg-white/[0.03]">
              {[
                { icon: Users, label: 'Активных клиентов', value: String(academic.activeClients), color: 'text-violet-400' },
                { icon: BookOpen, label: 'Заданий в работе', value: String(academic.inProgress), color: 'text-blue-400' },
                { icon: AlertCircle, label: 'Просрочено', value: String(academic.overdue), color: academic.overdue > 0 ? 'text-red-400' : 'text-slate-500' },
                {
                  icon: Wallet,
                  label: 'Остаток долга',
                  value: academic.totalDebt - academic.totalIncome > 0
                    ? `${(academic.totalDebt - academic.totalIncome).toLocaleString('ru')} ₽`
                    : 'Закрыто',
                  color: academic.totalDebt - academic.totalIncome > 0 ? 'text-amber-400' : 'text-emerald-400',
                },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-4 bg-navy-800/30">
                  <Icon size={16} className={clsx('flex-shrink-0', color)} />
                  <div className="min-w-0">
                    <p className={clsx('text-base font-bold truncate', color)}>{value}</p>
                    <p className="text-[11px] text-slate-500 truncate">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming deadlines */}
            <div className="px-6 py-3 flex items-center gap-2 border-b border-white/[0.04]">
              <Calendar size={13} className="text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ближайшие дедлайны</span>
            </div>

            {academic.upcomingAssignments.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                <CheckCircle size={20} className="mx-auto mb-2 text-emerald-600" />
                Нет активных заданий с дедлайнами
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {academic.upcomingAssignments.map(a => {
                  const isOverdue = a.status === 'overdue'
                  const days = a.deadline ? differenceInDays(parseISO(a.deadline), new Date()) : null
                  const deadlineColor = isOverdue ? 'text-red-400' : days !== null && days <= 3 ? 'text-orange-400' : days !== null && days <= 7 ? 'text-amber-400' : 'text-slate-400'
                  const deadlineText = isOverdue
                    ? `Просрочено на ${Math.abs(days!)} дн.`
                    : days === 0 ? 'Сегодня!'
                    : days === 1 ? 'Завтра'
                    : days !== null ? `Через ${days} дн.`
                    : ''

                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/academic/clients/${a.clientId}`)}
                      className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-colors text-left group"
                    >
                      <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', isOverdue ? 'bg-red-400' : days !== null && days <= 3 ? 'bg-orange-400' : 'bg-blue-400')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{a.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-navy-600 text-slate-400 rounded-md">{a.type}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-violet-400">{a.clientName}</span>
                          {a.subjectName && <span className="text-xs text-slate-500">· {a.subjectName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {a.deadline && (
                          <span className={clsx('text-xs font-medium', deadlineColor)}>
                            {deadlineText || format(parseISO(a.deadline), 'd MMM', { locale: ru })}
                          </span>
                        )}
                        <ArrowUpRight size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
