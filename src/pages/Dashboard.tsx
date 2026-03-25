import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, CheckCircle, TrendingUp, FileText, ArrowUpRight, Clock,
  GraduationCap, BookOpen, Wallet, AlertCircle, Calendar, Users, ListTodo,
  ClipboardList, Lock, Settings,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import type { Supplier } from '../types'
import clsx from 'clsx'

interface MonthData { month: string; count: number }
interface AcademicSummary {
  activeClients: number; totalClients: number; inProgress: number; overdue: number
  totalDebt: number; totalIncome: number
  upcomingAssignments: {
    id: number; clientId: number; clientName: string; name: string
    subjectName: string | null; deadline: string | null; status: string; type: string
  }[]
}
interface SupplierSummary {
  total: number; active: number; newThisMonth: number; priceLists: number
  monthlyData: MonthData[]
  tasksDue: { id: number; title: string; supplierName: string; deadline: string | null }[]
  missingCriteria: { id: number; name: string }[]
  categoryData: { name: string; value: number }[]
}
interface StudentSummary {
  done: number; inProgress: number; overdue: number
  totalDebt: number; totalIncome: number
}
interface AttendanceItem {
  id: number
  attendance_date: string
  time_slot: string | null
  type: string | null
  room: string | null
  building: string | null
  status: string
  academic_subjects: { name: string } | null
}
interface PendingSupplier {
  id: number
  name: string
  category: string | null
  created_at: string
}

const PIE_COLORS = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#84cc16','#f97316']
const DASHBOARD_LS_KEY = 'dashboard_hidden'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * value))
      if (progress === 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])
  return <>{count}</>
}

function getHiddenBlocks(): string[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}
function setHiddenBlocks(ids: string[]) {
  localStorage.setItem(DASHBOARD_LS_KEY, JSON.stringify(ids))
}

export default function Dashboard() {
  const { profile, isAdmin, canAccess, allowedAcademicClients } = useAuth()
  const navigate = useNavigate()
  const [supplierData, setSupplierData] = useState<SupplierSummary | null>(null)
  const [academic, setAcademic] = useState<AcademicSummary | null>(null)
  const [studentData, setStudentData] = useState<StudentSummary | null>(null)
  const [attendances, setAttendances] = useState<AttendanceItem[]>([])
  const [pendingSuppliers, setPendingSuppliers] = useState<PendingSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [hiddenBlocks, setHiddenBlocksState] = useState<string[]>(getHiddenBlocks)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const hasSuppliers = canAccess('suppliers')
  const hasAcademic = canAccess('academic')
  const myClientIds = allowedAcademicClients // non-empty = specific student

  const todayStr = new Date().toISOString().slice(0, 10)

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  function toggleBlock(id: string) {
    setHiddenBlocksState(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setHiddenBlocks(next)
      return next
    })
  }

  useEffect(() => {
    async function load() {
      const now = new Date()

      if (isAdmin || hasSuppliers) {
        const monthStart = startOfMonth(now).toISOString()
        const monthEnd = endOfMonth(now).toISOString()
        const [
          { count: total }, { count: active }, { count: newThisMonth }, { count: priceLists },
          { data: allSuppliers }, { data: tasks }, { data: criteria }, { data: criteriaVals },
          { data: pending },
        ] = await Promise.all([
          supabase.from('suppliers').select('*', { count: 'exact', head: true }),
          supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('suppliers').select('*', { count: 'exact', head: true }).gte('created_at', monthStart).lte('created_at', monthEnd),
          supabase.from('price_lists').select('*', { count: 'exact', head: true }),
          supabase.from('suppliers').select('id, name, category, created_at'),
          supabase.from('supplier_tasks').select('id, title, deadline, supplier_id, done').eq('done', false).order('deadline').limit(5),
          supabase.from('supplier_criteria').select('id').eq('required', true),
          supabase.from('supplier_criteria_values').select('supplier_id, criteria_id, value'),
          supabase.from('suppliers').select('id, name, category, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        ])

        const months: MonthData[] = []
        for (let i = 5; i >= 0; i--) {
          const m = subMonths(now, i)
          const mStart = startOfMonth(m).toISOString()
          const mEnd = endOfMonth(m).toISOString()
          const count = (allSuppliers ?? []).filter(s => s.created_at >= mStart && s.created_at <= mEnd).length
          months.push({ month: format(m, 'LLL', { locale: ru }), count })
        }

        // Category pie data
        const categoryCounts: Record<string, number> = {}
        for (const s of allSuppliers ?? []) {
          const cat = s.category ?? 'Без категории'
          categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
        }
        const categoryData = Object.entries(categoryCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        // Suppliers missing required criteria
        const requiredIds = (criteria ?? []).map(c => c.id)
        const missing = (allSuppliers ?? []).filter(s => {
          const filled = (criteriaVals ?? []).filter(v => v.supplier_id === s.id && requiredIds.includes(v.criteria_id) && v.value)
          return filled.length < requiredIds.length
        }).slice(0, 5)

        // Task supplier names
        const supplierMap = Object.fromEntries((allSuppliers ?? []).map(s => [s.id, s.name]))
        const tasksDue = (tasks ?? []).map(t => ({ id: t.id, title: t.title, supplierName: supplierMap[t.supplier_id] ?? '—', deadline: t.deadline }))

        setPendingSuppliers(
          (pending ?? []).map(p => ({ id: p.id, name: p.name, category: p.category ?? null, created_at: p.created_at }))
        )

        setSupplierData({
          total: total ?? 0, active: active ?? 0, newThisMonth: newThisMonth ?? 0, priceLists: priceLists ?? 0,
          monthlyData: months, tasksDue, missingCriteria: missing.map(s => ({ id: s.id, name: s.name })),
          categoryData,
        })
      }

      if (isAdmin || (hasAcademic && myClientIds.length === 0)) {
        // Admin / full academic access: load all clients summary
        const [clients, assignments, subjects, finances] = await Promise.all([
          supabase.from('academic_clients').select('id, name, active'),
          supabase.from('academic_assignments').select('id, client_id, subject_id, name, type, deadline, status').neq('status', 'done'),
          supabase.from('academic_subjects').select('id, name'),
          supabase.from('academic_finances').select('client_id, debt, income'),
        ])
        const clientList = (clients.data ?? []) as { id: number; name: string; active: boolean }[]
        const asgn = (assignments.data ?? []) as { id: number; client_id: number; subject_id: number | null; name: string; type: string; deadline: string | null; status: string }[]
        const subj = (subjects.data ?? []) as { id: number; name: string }[]
        const fin = (finances.data ?? []) as { client_id: number; debt: number; income: number }[]

        const sorted = [...asgn].filter(a => a.deadline).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()).slice(0, 5)
        const upcomingAssignments = sorted.map(a => ({
          id: a.id, clientId: a.client_id, clientName: clientList.find(c => c.id === a.client_id)?.name ?? 'Клиент',
          name: a.name, subjectName: a.subject_id ? (subj.find(s => s.id === a.subject_id)?.name ?? null) : null,
          deadline: a.deadline, status: a.deadline && isPast(parseISO(a.deadline)) ? 'overdue' : a.status, type: a.type,
        }))

        setAcademic({
          activeClients: clientList.filter(c => c.active).length, totalClients: clientList.length,
          inProgress: asgn.filter(a => a.status === 'in_progress' || a.status === 'queue').length,
          overdue: asgn.filter(a => a.deadline && isPast(parseISO(a.deadline))).length,
          totalDebt: fin.reduce((s, f) => s + (Number(f.debt) || 0), 0),
          totalIncome: fin.reduce((s, f) => s + (Number(f.income) || 0), 0),
          upcomingAssignments,
        })
      } else if (hasAcademic && myClientIds.length > 0) {
        // Specific student: load their personal data
        const [allAsgn, finances, attData] = await Promise.all([
          supabase.from('academic_assignments').select('id, subject_id, name, type, deadline, status').in('client_id', myClientIds),
          supabase.from('academic_finances').select('debt, income').in('client_id', myClientIds),
          supabase
            .from('academic_attendance')
            .select('id, attendance_date, time_slot, type, room, building, status, academic_subjects(name)')
            .in('client_id', myClientIds)
            .in('status', ['upcoming', 'needs_update'])
            .gte('attendance_date', todayStr)
            .order('attendance_date')
            .order('time_slot')
            .limit(10),
        ])
        const asgn = (allAsgn.data ?? []) as { id: number; subject_id: number | null; name: string; type: string; deadline: string | null; status: string }[]
        const fin = (finances.data ?? []) as { debt: number; income: number }[]

        const rawAtt = (attData.data ?? []) as {
          id: number
          attendance_date: string
          time_slot: string | null
          type: string | null
          room: string | null
          building: string | null
          status: string
          academic_subjects: { name: string } | { name: string }[] | null
        }[]

        const mappedAtt: AttendanceItem[] = rawAtt.map(r => ({
          id: r.id,
          attendance_date: r.attendance_date,
          time_slot: r.time_slot,
          type: r.type,
          room: r.room,
          building: r.building,
          status: r.status,
          academic_subjects: Array.isArray(r.academic_subjects)
            ? (r.academic_subjects[0] ?? null)
            : r.academic_subjects,
        }))

        setAttendances(mappedAtt)

        setStudentData({
          done: asgn.filter(a => a.status === 'done').length,
          inProgress: asgn.filter(a => a.status === 'in_progress' || a.status === 'queue').length,
          overdue: asgn.filter(a => a.deadline && isPast(parseISO(a.deadline)) && a.status !== 'done').length,
          totalDebt: fin.reduce((s, f) => s + (Number(f.debt) || 0), 0),
          totalIncome: fin.reduce((s, f) => s + (Number(f.income) || 0), 0),
        })
      }

      setLoading(false)
    }
    load()
  }, [isAdmin, hasSuppliers, hasAcademic, myClientIds.join(',')])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Доброе утро'
    if (h < 18) return 'Добрый день'
    return 'Добрый вечер'
  }

  const greetingName = profile?.first_name
    ? profile.first_name
    : (profile?.full_name?.split(' ')[1] ?? profile?.full_name?.split(' ')[0] ?? 'Пользователь')

  const todayAttendances = attendances.filter(a => a.attendance_date === todayStr)
  const upcomingAttendances = attendances.filter(a => a.attendance_date > todayStr).slice(0, 5)

  // Blocks that are available to show in settings
  const availableBlocks: { id: string; label: string; visible: boolean }[] = []
  if (isAdmin || hasSuppliers) availableBlocks.push({ id: 'suppliers', label: 'Поставщики', visible: true })
  if (isAdmin || (hasAcademic && myClientIds.length === 0)) availableBlocks.push({ id: 'academic', label: 'Учебные услуги', visible: true })
  if (!isAdmin && hasAcademic && myClientIds.length > 0) availableBlocks.push({ id: 'student_schedule', label: 'Моё расписание', visible: true })

  // No access state
  if (!loading && !isAdmin && !hasSuppliers && !hasAcademic) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-500/10 flex items-center justify-center mb-4">
          <Lock size={28} className="text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Нет доступных разделов</h2>
        <p className="text-slate-400 text-sm max-w-xs">Обратитесь к администратору для получения доступа к разделам системы.</p>
      </motion.div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting()}, <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">{greetingName}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">{format(new Date(), "EEEE, d MMMM yyyy", { locale: ru })}</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || hasSuppliers) && (
            <Link to="/suppliers" className="flex items-center gap-2 bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 text-sm font-medium px-4 py-2.5 rounded-xl border border-primary-500/20 hover:border-primary-500/40 transition-all">
              Все поставщики <ArrowUpRight size={15} />
            </Link>
          )}
          {/* Settings gear */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-white transition-all"
              aria-label="Настройки дашборда"
            >
              <Settings size={16} />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 glass rounded-2xl border border-white/[0.10] shadow-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Видимость блоков</p>
                {availableBlocks.map(block => {
                  const hidden = hiddenBlocks.includes(block.id)
                  return (
                    <label key={block.id} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{block.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!hidden}
                        onClick={() => toggleBlock(block.id)}
                        className={clsx(
                          'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                          !hidden ? 'bg-primary-600' : 'bg-slate-700'
                        )}
                      >
                        <span
                          className={clsx(
                            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            !hidden ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── SUPPLIERS BLOCK ── */}
      {(isAdmin || hasSuppliers) && supplierData && !hiddenBlocks.includes('suppliers') && (
        <>
          <motion.div variants={item} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: 'Всего поставщиков', value: supplierData.total, icon: Building2, color: 'from-primary-500/20 to-primary-600/10', iconColor: 'text-primary-400' },
              { title: 'Активных', value: supplierData.active, icon: CheckCircle, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400' },
              { title: 'Добавлено в месяце', value: supplierData.newThisMonth, icon: TrendingUp, color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-400' },
              { title: 'Прайс-листов', value: supplierData.priceLists, icon: FileText, color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400' },
            ].map(({ title, value, icon: Icon, color, iconColor }) => (
              <div key={title} className={`glass rounded-2xl p-5 bg-gradient-to-br ${color} border border-white/[0.06] hover:-translate-y-0.5 transition-all`}>
                <div className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center ${iconColor} mb-4`}><Icon size={20} /></div>
                <p className="text-3xl font-bold text-white mb-1">{loading ? '—' : <AnimatedCounter value={value} />}</p>
                <p className="text-sm text-slate-400">{title}</p>
              </div>
            ))}
          </motion.div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Monthly bar chart */}
            <motion.div variants={item} className="glass rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-base font-semibold text-white mb-1">Динамика добавления</h3>
              <p className="text-xs text-slate-500 mb-6">Поставщики за последние 6 месяцев</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={supplierData.monthlyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0f1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }} cursor={{ fill: 'rgba(139,92,246,0.08)' }} formatter={(v: number) => [v, 'Поставщиков']} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient></defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Pie chart by category */}
            {supplierData.categoryData.length > 0 && (
              <motion.div variants={item} className="glass rounded-2xl p-6 border border-white/[0.06]">
                <h3 className="text-base font-semibold text-white mb-1">По категориям</h3>
                <p className="text-xs text-slate-500 mb-4">Распределение поставщиков</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={supplierData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {supplierData.categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: '#0f1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }}
                      formatter={(value: number, name: string) => [`${value} поставщиков`, name]}
                    />
                    <Legend
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: string, entry: any) => (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>
                          {value} ({entry?.payload?.value ?? 0})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>

          {/* Admin: tasks + missing criteria + pending suppliers */}
          {isAdmin && (
            <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Tasks */}
              <div className="glass rounded-2xl border border-white/[0.06]">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
                  <ListTodo size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-white">Открытые задачи</span>
                </div>
                {supplierData.tasksDue.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-6">Нет открытых задач</p>
                ) : supplierData.tasksDue.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.supplierName}</p>
                    </div>
                    {t.deadline && <span className="text-xs text-slate-500 flex-shrink-0">{format(parseISO(t.deadline), 'd MMM', { locale: ru })}</span>}
                  </div>
                ))}
              </div>

              {/* Missing criteria */}
              <div className="glass rounded-2xl border border-white/[0.06]">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-sm font-semibold text-white">Не заполнены критерии</span>
                </div>
                {supplierData.missingCriteria.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-6">Все критерии заполнены</p>
                ) : supplierData.missingCriteria.map(s => (
                  <Link key={s.id} to={`/suppliers/${s.id}`} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors">
                    <Building2 size={14} className="text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{s.name}</span>
                    <ArrowUpRight size={12} className="text-slate-600 ml-auto" />
                  </Link>
                ))}
              </div>

              {/* Pending suppliers */}
              <div className="glass rounded-2xl border border-white/[0.06]">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
                  <Building2 size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">На рассмотрении</span>
                </div>
                {pendingSuppliers.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-6">Нет заявок</p>
                ) : pendingSuppliers.map(s => (
                  <Link key={s.id} to={`/suppliers/${s.id}`} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group">
                    <Building2 size={14} className="text-amber-500/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.name}</p>
                      {s.category && <p className="text-xs text-slate-500 truncate">{s.category}</p>}
                    </div>
                    <ArrowUpRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors ml-auto flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── ACADEMIC BLOCK (admin / full access) ── */}
      {(isAdmin || (hasAcademic && myClientIds.length === 0)) && academic && !hiddenBlocks.includes('academic') && (
        <motion.div variants={item} className="glass rounded-2xl border border-white/[0.06]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Учебные услуги — сводка</h3>
            </div>
            <Link to="/academic/clients" className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
              Все клиенты <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-b border-white/[0.06] bg-white/[0.03]">
            {[
              { icon: Users, label: 'Активных клиентов', value: String(academic.activeClients), color: 'text-violet-400' },
              { icon: BookOpen, label: 'Заданий в работе', value: String(academic.inProgress), color: 'text-blue-400' },
              { icon: AlertCircle, label: 'Просрочено', value: String(academic.overdue), color: academic.overdue > 0 ? 'text-red-400' : 'text-slate-500' },
              { icon: Wallet, label: 'Остаток долга', value: academic.totalDebt - academic.totalIncome > 0 ? `${(academic.totalDebt - academic.totalIncome).toLocaleString('ru')} ₽` : 'Закрыто', color: academic.totalDebt - academic.totalIncome > 0 ? 'text-amber-400' : 'text-emerald-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4 bg-navy-800/30">
                <Icon size={16} className={clsx('flex-shrink-0', color)} />
                <div className="min-w-0"><p className={clsx('text-base font-bold truncate', color)}>{value}</p><p className="text-[11px] text-slate-500 truncate">{label}</p></div>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 flex items-center gap-2 border-b border-white/[0.04]">
            <Calendar size={13} className="text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ближайшие дедлайны</span>
          </div>

          {academic.upcomingAssignments.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500 text-sm"><CheckCircle size={20} className="mx-auto mb-2 text-emerald-600" />Нет активных заданий с дедлайнами</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {academic.upcomingAssignments.map(a => {
                const isOverdue = a.status === 'overdue'
                const days = a.deadline ? differenceInDays(parseISO(a.deadline), new Date()) : null
                const deadlineColor = isOverdue ? 'text-red-400' : days !== null && days <= 3 ? 'text-orange-400' : days !== null && days <= 7 ? 'text-amber-400' : 'text-slate-400'
                const deadlineText = isOverdue ? `Просрочено на ${Math.abs(days!)} дн.` : days === 0 ? 'Сегодня!' : days === 1 ? 'Завтра' : days !== null ? `Через ${days} дн.` : ''
                return (
                  <button key={a.id} onClick={() => navigate(`/academic/clients/${a.clientId}`)}
                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-colors text-left group">
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
                      {a.deadline && <span className={clsx('text-xs font-medium', deadlineColor)}>{deadlineText || format(parseISO(a.deadline), 'd MMM', { locale: ru })}</span>}
                      <ArrowUpRight size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── STUDENT PERSONAL BLOCK ── */}
      {!isAdmin && hasAcademic && myClientIds.length > 0 && studentData && !hiddenBlocks.includes('student_schedule') && (
        <motion.div variants={item} className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Выполнено', value: studentData.done, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10', icon: CheckCircle },
              { label: 'В работе', value: studentData.inProgress, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10', icon: Clock },
              { label: 'Просрочено', value: studentData.overdue, color: studentData.overdue > 0 ? 'text-red-400' : 'text-slate-500', bg: 'from-red-500/20 to-red-600/10', icon: AlertCircle },
              {
                label: 'Баланс',
                value: studentData.totalIncome - studentData.totalDebt > 0 ? `+${(studentData.totalIncome - studentData.totalDebt).toLocaleString('ru')} ₽` : `${(studentData.totalIncome - studentData.totalDebt).toLocaleString('ru')} ₽`,
                color: studentData.totalIncome >= studentData.totalDebt ? 'text-emerald-400' : 'text-red-400',
                bg: 'from-amber-500/20 to-amber-600/10', icon: Wallet,
              },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={`glass rounded-2xl p-5 bg-gradient-to-br ${bg} border border-white/[0.06]`}>
                <Icon size={18} className={clsx(color, 'mb-3')} />
                <p className={clsx('text-2xl font-bold mb-1', color)}>{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Today's schedule */}
          <div className="glass rounded-2xl border border-white/[0.06]">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <Calendar size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Сегодня</span>
              <span className="ml-auto text-xs text-slate-500">{format(new Date(), 'd MMMM', { locale: ru })}</span>
            </div>
            {todayAttendances.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">Нет занятий сегодня</p>
            ) : todayAttendances.map(a => (
              <div key={a.id} className="flex items-start gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                <div className="flex-shrink-0 mt-0.5">
                  <Clock size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{a.academic_subjects?.name ?? 'Занятие'}</span>
                    {a.type && <span className="text-[10px] px-1.5 py-0.5 bg-navy-600 text-slate-400 rounded-md">{a.type}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {a.time_slot && <span className="text-xs text-emerald-400">{a.time_slot}</span>}
                    {a.room && <span className="text-xs text-slate-500">· ауд. {a.room}</span>}
                    {a.building && <span className="text-xs text-slate-500">· {a.building}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming attendances */}
          <div className="glass rounded-2xl border border-white/[0.06]">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <ClipboardList size={14} className="text-primary-400" />
              <span className="text-sm font-semibold text-white">Предстоящие занятия</span>
            </div>
            {upcomingAttendances.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">Нет предстоящих занятий</p>
            ) : upcomingAttendances.map(a => {
              const days = differenceInDays(parseISO(a.attendance_date), new Date())
              const isNeedsUpdate = a.status === 'needs_update'
              return (
                <div key={a.id} className="flex items-start gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={clsx('w-2 h-2 rounded-full mt-1', isNeedsUpdate ? 'bg-orange-400' : 'bg-blue-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{a.academic_subjects?.name ?? 'Занятие'}</span>
                      {a.type && <span className="text-[10px] px-1.5 py-0.5 bg-navy-600 text-slate-400 rounded-md">{a.type}</span>}
                      {isNeedsUpdate ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-md border border-orange-500/20">Ждёт статуса</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/20">Предстоит</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={clsx('text-xs', isNeedsUpdate ? 'text-orange-400' : 'text-slate-400')}>
                        {format(parseISO(a.attendance_date), 'd MMM', { locale: ru })}
                        {days === 1 ? ' · Завтра' : days <= 7 ? ` · через ${days} дн.` : ''}
                      </span>
                      {a.time_slot && <span className="text-xs text-slate-500">· {a.time_slot}</span>}
                      {a.room && <span className="text-xs text-slate-500">· ауд. {a.room}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
