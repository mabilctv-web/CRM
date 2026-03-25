import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Paperclip, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Order {
  id: string; subject: string; university: string | null; description: string | null
  deadline: string | null; status: string; created_at: string; client_email: string
}
interface OrderFile { id: string; file_name: string; file_url: string }
interface Message { id: string; sender_type: string; message: string; created_at: string }

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новая', color: 'bg-cyan-500/15 text-cyan-400' },
  in_progress: { label: 'В работе', color: 'bg-amber-500/15 text-amber-400' },
  done: { label: 'Выполнена', color: 'bg-emerald-500/15 text-emerald-400' },
  cancelled: { label: 'Отменена', color: 'bg-red-500/15 text-red-400' },
}

const TG_USERNAME = 'rrworkp'

export default function MyOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [order, setOrder] = useState<Order | null>(null)
  const [files, setFiles] = useState<OrderFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/'); return }
      setUserId(data.user.id)
    })
    load()
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [id, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    if (!text.trim() || !userId) return
    setSending(true)
    await supabase.from('order_messages').insert({ order_id: id, sender_id: userId, sender_type: 'client', message: text.trim() })
    setText('')
    await loadMessages()
    setSending(false)
  }

  if (!order) return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const s = STATUS[order.status] ?? STATUS.new

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-navy-900/80 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link to="/my" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Мои заказы
          </Link>
        </div>
      </header>

      <div className="pt-24 pb-4 px-6 flex-1 flex flex-col">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Order info */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-white/[0.06] p-5 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold">{order.subject}</h1>
                {order.university && <p className="text-slate-400 text-sm mt-0.5">{order.university}</p>}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${s.color}`}>{s.label}</span>
            </div>
            {order.description && <p className="text-sm text-slate-300 mt-3 leading-relaxed">{order.description}</p>}
            <div className="flex gap-4 mt-3 text-xs text-slate-500 flex-wrap">
              {order.deadline && <span>Дедлайн: {format(new Date(order.deadline), 'd MMMM yyyy', { locale: ru })}</span>}
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
          <div className="glass rounded-2xl border border-white/[0.06] flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-primary-400" />
                <span className="text-sm font-semibold">Чат с администрацией</span>
              </div>
              <a
                href={`https://t.me/${TG_USERNAME}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg transition-colors"
              >
                Продолжить в Telegram →
              </a>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                  Напишите нам — мы ответим в ближайшее время
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    m.sender_type === 'client'
                      ? 'bg-primary-600/25 text-white rounded-br-sm'
                      : 'bg-navy-700 text-slate-200 rounded-bl-sm'
                  }`}>
                    {m.sender_type === 'admin' && <p className="text-[10px] text-primary-400 mb-1 font-semibold">Администратор</p>}
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
                placeholder="Ваше сообщение..."
                className="flex-1 bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 rounded-xl transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
