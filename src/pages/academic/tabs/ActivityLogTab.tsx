import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Activity, Bell, BookOpen, DollarSign,
  AlertTriangle, User, GraduationCap, Loader2, CalendarCheck, Trash2,
} from 'lucide-react'

interface Log {
  id: number
  action_type: string
  description: string
  created_at: string
}

const CFG: Record<string, { icon: React.ElementType; cls: string }> = {
  assignment_added:   { icon: BookOpen,      cls: 'text-cyan-400 bg-cyan-500/10'       },
  assignment_updated: { icon: BookOpen,      cls: 'text-amber-400 bg-amber-500/10'     },
  assignment_deleted: { icon: Trash2,        cls: 'text-red-400 bg-red-500/10'         },
  grade_added:        { icon: GraduationCap, cls: 'text-emerald-400 bg-emerald-500/10' },
  grade_updated:      { icon: GraduationCap, cls: 'text-emerald-400 bg-emerald-500/10' },
  finance_added:      { icon: DollarSign,    cls: 'text-violet-400 bg-violet-500/10'   },
  mistake_added:      { icon: AlertTriangle, cls: 'text-red-400 bg-red-500/10'         },
  attendance_added:   { icon: CalendarCheck, cls: 'text-teal-400 bg-teal-500/10'       },
  attendance_updated: { icon: CalendarCheck, cls: 'text-orange-400 bg-orange-500/10'   },
  attendance_deleted: { icon: Trash2,        cls: 'text-red-400 bg-red-500/10'         },
  notification_sent:  { icon: Bell,          cls: 'text-sky-400 bg-sky-500/10'         },
  client_updated:     { icon: User,          cls: 'text-slate-400 bg-slate-500/10'     },
}
const DEFAULT_CFG = { icon: Activity, cls: 'text-slate-400 bg-slate-500/10' }

export default function ActivityLogTab({ clientId }: { clientId: number }) {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('academic_activity_logs')
      .select('id, action_type, description, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setLogs((data ?? []) as Log[]); setLoading(false) })
  }, [clientId])

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={20} className="animate-spin text-primary-400" />
    </div>
  )

  if (logs.length === 0) return (
    <div className="glass rounded-2xl border border-white/[0.06] flex flex-col items-center py-16">
      <Activity size={28} className="text-slate-600 mb-3" />
      <p className="text-slate-400 text-sm font-medium">Действий пока нет</p>
      <p className="text-slate-600 text-xs mt-1">Здесь будет история изменений</p>
    </div>
  )

  // Group by date
  const grouped: { date: string; items: Log[] }[] = []
  for (const log of logs) {
    const d = format(new Date(log.created_at), 'd MMMM yyyy', { locale: ru })
    const last = grouped[grouped.length - 1]
    if (last?.date === d) last.items.push(log)
    else grouped.push({ date: d, items: [log] })
  }

  return (
    <div className="space-y-4">
      {grouped.map(group => (
        <div key={group.date}>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
            {group.date}
          </p>
          <div className="glass rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04]">
            {group.items.map(log => {
              const { icon: Icon, cls } = CFG[log.action_type] ?? DEFAULT_CFG
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
                    <Icon size={13} />
                  </div>
                  <p className="flex-1 text-sm text-slate-300 min-w-0">{log.description}</p>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[11px] text-slate-500">
                      {format(new Date(log.created_at), 'HH:mm')}
                    </p>
                    <p className="text-[10px] text-slate-700">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
