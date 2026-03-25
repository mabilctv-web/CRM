import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PackageOpen, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Order {
  id: string; subject: string; university: string | null
  client_email: string; status: string; deadline: string | null
  created_at: string; _unread?: boolean
}

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новая', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  in_progress: { label: 'В работе', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  done: { label: 'Выполнена', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Отменена', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

export default function CRMOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders((data ?? []) as Order[])
    setLoading(false)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Заказы</h1>
          <p className="text-sm text-slate-400 mt-0.5">Заявки от студентов</p>
        </div>
        <div className="flex items-center gap-1 bg-navy-700 rounded-xl p-1">
          {[['all', 'Все'], ['new', 'Новые'], ['in_progress', 'В работе'], ['done', 'Готово']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === val ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl border border-white/[0.06] h-20 shimmer-bg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-white/[0.06] flex flex-col items-center py-16 text-center">
          <PackageOpen size={32} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Заказов нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o, i) => {
            const s = STATUS[o.status] ?? STATUS.new
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link
                  to={`/crm/orders/${o.id}`}
                  className="glass rounded-2xl border border-white/[0.06] hover:border-white/10 p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 block"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{o.subject}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                      {o.status === 'new' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300">Новая</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{o.client_email}</span>
                      {o.university && <span>{o.university}</span>}
                      {o.deadline && <span>До {format(new Date(o.deadline), 'd MMM yyyy', { locale: ru })}</span>}
                      <span>{format(new Date(o.created_at), 'd MMM yyyy', { locale: ru })}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
