import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ArrowLeft, Send, Paperclip, MessageCircle, ChevronDown, Globe, Crown,
  Trash2, AlertTriangle, X, Loader2, FileText,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  client_phone: string | null
  telegram_chat_id: string | null
  source: string
  order_type: string | null
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

function parseMessage(msg: string): { type: 'text'; text: string } | { type: 'file'; name: string; url: string } {
  if (msg.startsWith('[FILE]')) {
    const rest = msg.slice(6)
    const sep = rest.indexOf('|')
    if (sep !== -1) {
      return { type: 'file', name: rest.slice(0, sep), url: rest.slice(sep + 1) }
    }
  }
  return { type: 'text', text: msg }
}

export default function CRMOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [order, setOrder] = useState<Order | null>(null)
  const [files, setFiles] = useState<OrderFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function sendFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !adminId) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${id}/${Date.now()}.${ext}`
    const { data: storageData, error } = await supabase.storage
      .from('order-files')
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true })
    if (storageData && !error) {
      const { data: urlData } = supabase.storage.from('order-files').getPublicUrl(path)
      await supabase.from('order_messages').insert({
        order_id: id,
        sender_id: adminId,
        sender_type: 'admin',
        message: `[FILE]${file.name}|${urlData.publicUrl}`,
      })
      await loadMessages()
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function setStatus(status: string) {
    await supabase.from('orders').update({ status }).eq('id', id!)
    setOrder(o => o ? { ...o, status } : o)
    setStatusOpen(false)
  }

  async function deleteOrder() {
    setDeleting(true)
    await supabase.from('orders').delete().eq('id', id!)
    navigate('/crm/orders')
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
              {order.order_type === 'full_service' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Crown size={11} /> Полное сопровождение
                </span>
              )}
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
            {order.client_phone && (
              <p className="text-xs text-slate-500 mt-0.5">📞 {order.client_phone}</p>
            )}
            {isTelegram && order.telegram_chat_id && (
              <p className="text-xs text-sky-500/70 mt-0.5">
                Telegram chat_id: <code className="font-mono">{order.telegram_chat_id}</code>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Delete button */}
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Удалить заказ"
            >
              <Trash2 size={15} />
            </button>
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

      {/* Delete confirm modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Удалить заказ?</h3>
                  <p className="text-slate-400 text-sm mt-1">Заказ #{order.order_number} будет удалён без возможности восстановления. Сообщения чата тоже будут удалены.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white transition-colors text-sm"
                >
                  <X size={14} /> Отмена
                </button>
                <button
                  onClick={deleteOrder}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-60 transition-colors text-sm font-medium"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat */}
      <div className="glass rounded-2xl border border-white/[0.06] flex flex-col min-h-[500px]">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
          <MessageCircle size={15} className="text-primary-400" />
          <span className="text-sm font-semibold text-white">Чат с клиентом</span>
          {isTelegram && (
            <span className="ml-auto text-[10px] text-sky-400/70 flex items-center gap-1">
              <Send size={9} /> Ответы отправляются в Telegram
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              Нет сообщений
            </div>
          )}
          {messages.map(m => {
            const parsed = parseMessage(m.message)
            return (
              <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.sender_type === 'admin'
                    ? 'bg-primary-600/25 text-white rounded-br-sm'
                    : 'bg-navy-700 text-slate-200 rounded-bl-sm'
                }`}>
                  {m.sender_type === 'client' && <p className="text-[10px] text-cyan-400 mb-1 font-semibold">Клиент</p>}
                  {parsed.type === 'file' ? (
                    <a href={parsed.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <FileText size={14} className="flex-shrink-0 text-sky-400" />
                      <span className="text-sky-300 underline underline-offset-2 break-all">{parsed.name}</span>
                    </a>
                  ) : (
                    <p className="leading-relaxed">{parsed.text}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1 text-right">{format(new Date(m.created_at), 'HH:mm')}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t border-white/[0.06]">
          {/* File attach button */}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={sendFile}
            accept="*/*"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-2.5 rounded-xl bg-navy-700 border border-navy-500 text-slate-400 hover:text-white hover:border-primary-500 disabled:opacity-40 transition-all flex-shrink-0"
            title="Прикрепить файл"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ответ клиенту..."
            className="flex-1 bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 rounded-xl transition-colors flex-shrink-0">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
