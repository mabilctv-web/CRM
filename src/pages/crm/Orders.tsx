import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PackageOpen, ChevronRight, Globe, Send, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Order {
  id: string
  order_number: number | null
  subject: string
  university: string | null
  client_email: string | null
  client_name: string | null
  source: string
  order_type: string | null
  status: string
  deadline: string | null
  deadline_text: string | null
  created_at: string
}

const STATUS: Record<string, { label: string; color: string }> = {
  new:         { label: 'Новая',    color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  in_progress: { label: 'В работе', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  done:        { label: 'Выполнена', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  cancelled:   { label: 'Отменена', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

function SourceBadge({ source }: { source: string }) {
  if (source === 'telegram') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-sky-500/10 text-sky-400 border-sky-500/20">
        <Send size={9} /> Telegram
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-slate-500/10 text-slate-400 border-slate-500/20">
      <Globe size={9} /> Сайт
    </span>
  )
}

export default function CRMOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders((data ?? []) as Order[])
    setLoading(false)
  }

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => sourceFilter === 'all' || o.source === sourceFilter)

  const tgCount = orders.filter(o => o.source === 'telegram').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Заказы</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Заявки от клиентов
            {tgCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-sky-400">
                <Send size={11} /> {tgCount} из Telegram
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source filter */}
          <div className="flex items-center gap-1 bg-navy-700 rounded-xl p-1">
            {[['all', 'Все источники'], ['website', '🌐 Сайт'], ['telegram', '✈️ Telegram']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSourceFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sourceFilter === val ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Status filter */}
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
            const clientLabel = o.client_name || o.client_email || '—'
            const deadlineLabel = o.deadline
              ? `До ${format(new Date(o.deadline), 'd MMM yyyy', { locale: ru })}`
              : o.deadline_text || null

            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link
                  to={`/crm/orders/${o.id}`}
                  className={`glass rounded-2xl border p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 block ${o.order_type === 'full_service' ? 'border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5' : 'border-white/[0.06] hover:border-white/10'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.order_number && (
                        <span className="text-[10px] font-mono font-semibold text-slate-500">#{o.order_number}</span>
                      )}
                      <span className="font-semibold text-white">{o.subject}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                      {o.order_type === 'full_service' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-400 border-amber-500/30">
                          <Crown size={9} /> Сопровождение
                        </span>
                      )}
                      <SourceBadge source={o.source} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{clientLabel}</span>
                      {o.university && <span>{o.university}</span>}
                      {deadlineLabel && <span>{deadlineLabel}</span>}
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
