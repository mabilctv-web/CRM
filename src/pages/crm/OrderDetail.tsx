import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowLeft, Send, Paperclip, MessageCircle, ChevronDown, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

interface Order {
  id: string
  order_number: number | null
  subject: string
  university: string | null
  description: string | null
  deadline: string | null
  deadline_text: string | null
  status: string
  created_at: string
  client_email: string | null
  client_name: string | null
  telegram_chat_id: string | null
  source: string
}
interface OrderFile { id: string; file_name: string; file_url: string }
interface Message { id: string; sender_type: string; message: string; created_at: string }

const STATUS_OPTIONS = [
  { value: 'new',         label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done',        label: 'Выполнена' },
  { value: 'cancelled',   label: 'Отменена' },
]

const STATUS_COLOR: Record<string, string> = {
  new:         'bg-cyan-500/15 text-cyan-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  done:        'bg-emerald-500/15 text-emerald-400',
  cancelled:   'bg-red-500/15 text-red-400',
}

export default function CRMOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [order, setOrder] = useState<Order | null>(null)
  const [files, setFiles] = useState<OrderFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? null))
    load()
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function load() {
    const [{ data: o }, { data: f }, { data: m }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_files').select('*').eq('order_id', id),
      supabase.from('order_messages').select('*').eq('order_id', id).order('created_at'),
    ])
    if (o) setOrder(o as Order)
    setFiles((f ?? []) as OrderFile[])
    setMessages((m ?? []) as Message[])
  }

  async function loadMessages() {
    const { data } = await supabase.from('order_messages').select('*').eq('order_id', id).order('created_at')
    setMessages((data ?? []) as Message[])
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !adminId) return
    setSending(true)
    await supabase.from('order_messages').insert({ order_id: id, sender_id: adminId, sender_type: 'admin', message: text.trim() })
    setText('')
    await loadMessages()
    setSending(false)
  }

  async function setStatus(status: string) {
    await supabase.from('orders').update({ status }).eq('id', id!)
    setOrder(o => o ? { ...o, status } : o)
    setStatusOpen(false)
  }

  if (!order) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isTelegram = order.source === 'telegram'
  const clientDisplay = order.client_name || order.client_email || '—'
  const deadlineDisplay = order.deadline
    ? format(new Date(order.deadline), 'd MMMM yyyy', { locale: ru })
    : order.deadline_text || null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/crm/orders" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={15} /> Заказы
        </Link>
      </div>

      {/* Order info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {order.order_number && (
                <span className="text-sm font-mono font-bold text-slate-500">#{order.order_number}</span>
              )}
              <h1 className="text-xl font-bold text-white">{order.subject}</h1>
              {/* Source badge */}
              {isTelegram ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Send size={11} /> Telegram
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  <Globe size={11} /> Сайт
                </span>
              )}
            </div>
            {order.university && <p className="text-slate-400 text-sm">{order.university}</p>}
            <p className="text-xs text-slate-500 mt-1">{clientDisplay}</p>
            {isTelegram && order.telegram_chat_id && (
              <p className="text-xs text-sky-500/70 mt-0.5">
                Telegram chat_id: <code className="font-mono">{order.telegram_chat_id}</code>
              </p>
            )}
          </div>
          {/* Status picker */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen(v => !v)}
              className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg ${STATUS_COLOR[order.status] ?? STATUS_COLOR.new}`}
            >
              {STATUS_OPTIONS.find(s => s.value === order.status)?.label ?? 'Новая'}
              <ChevronDown size={12} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-8 bg-navy-700 border border-white/[0.08] rounded-xl overflow-hidden shadow-xl z-10 min-w-[140px]">
                {STATUS_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {order.description && <p className="text-sm text-slate-300 mt-3 leading-relaxed">{order.description}</p>}
        <div className="flex gap-4 mt-3 text-xs text-slate-500 flex-wrap">
          {deadlineDisplay && <span>Дедлайн: {deadlineDisplay}</span>}
          <span>Создана: {format(new Date(order.created_at), 'd MMMM yyyy', { locale: ru })}</span>
        </div>
        {files.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {files.map(f => (
              <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-navy-700 hover:bg-navy-600 px-2.5 py-1.5 rounded-lg text-slate-300 transition-colors">
                <Paperclip size={11} /> {f.file_name}
              </a>
            ))}
          </div>
        )}
      </motion.div>

      {/* Chat */}
      <div className="glass rounded-2xl border border-white/[0.06] flex flex-col min-h-[500px]">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
          <MessageCircle size={15} className="text-primary-400" />
          <span className="text-sm font-semibold text-white">Чат с клиентом</span>
          {isTelegram && (
            <span className="ml-auto text-[10px] text-sky-400/70 flex items-center gap-1">
              <Send size={9} /> Ответы через CRM (не отправляются в Telegram автоматически)
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              Нет сообщений
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                m.sender_type === 'admin'
                  ? 'bg-primary-600/25 text-white rounded-br-sm'
                  : 'bg-navy-700 text-slate-200 rounded-bl-sm'
              }`}>
                {m.sender_type === 'client' && <p className="text-[10px] text-cyan-400 mb-1 font-semibold">Клиент</p>}
                <p className="leading-relaxed">{m.message}</p>
                <p className="text-[10px] text-slate-500 mt-1 text-right">{format(new Date(m.created_at), 'HH:mm')}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-3 p-4 border-t border-white/[0.06]">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ответ клиенту..."
            className="flex-1 bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 rounded-xl transition-colors">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
