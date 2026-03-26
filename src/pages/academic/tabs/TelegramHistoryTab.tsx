import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MessageCircle, ArrowDownToLine, ArrowUpFromLine, FileText, Image, Mic, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

interface TgMsg {
  id: number
  chat_id: number
  direction: 'in' | 'out'
  message_type: string
  text: string | null
  file_name: string | null
  file_url: string | null
  created_at: string
}

const TYPE_ICON: Record<string, React.ElementType> = {
  file:    FileText,
  photo:   Image,
  voice:   Mic,
  sticker: MessageCircle,
  other:   MessageCircle,
}

export default function TelegramHistoryTab({ chatId }: { chatId: string }) {
  const [msgs, setMsgs]       = useState<TgMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load(quiet = false) {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    const { data } = await supabase
      .from('telegram_messages')
      .select('id, chat_id, direction, message_type, text, file_name, file_url, created_at')
      .eq('chat_id', parseInt(chatId))
      .order('created_at', { ascending: true })
      .limit(500)
    setMsgs((data ?? []) as TgMsg[])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [chatId])
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  // Group by date
  const groups: { date: string; items: TgMsg[] }[] = []
  for (const m of msgs) {
    const date = m.created_at.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last?.date === date) last.items.push(m)
    else groups.push({ date, items: [m] })
  }

  function formatGroupDate(d: string) {
    return format(parseISO(d), 'd MMMM yyyy', { locale: ru })
  }

  function renderContent(m: TgMsg) {
    if (m.file_url) {
      return (
        <a href={m.file_url} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 underline underline-offset-2 hover:opacity-80 transition-opacity">
          <FileText size={13} className="flex-shrink-0" />
          {m.file_name || 'Файл'}
        </a>
      )
    }
    if (m.message_type === 'photo')   return <span className="flex items-center gap-1"><Image size={13} /> Фото</span>
    if (m.message_type === 'voice')   return <span className="flex items-center gap-1"><Mic size={13} /> Голосовое</span>
    if (m.message_type === 'sticker') return <span>{m.text ?? '🎭 Стикер'}</span>
    if (!m.text) return <span className="italic opacity-60">[медиа]</span>
    // Hide system button-tap logs from display (they're not real messages)
    if (m.text.startsWith('[кнопка:') || m.text.startsWith('[btn:')) return null
    return <span className="whitespace-pre-wrap break-words">{m.text}</span>
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={22} className="animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="flex flex-col" style={{ height: '60vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MessageCircle size={15} className="text-sky-400" />
          <span>{msgs.length} сообщений</span>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={13} className={clsx(refreshing && 'animate-spin')} />
          Обновить
        </button>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 scroll-smooth">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <MessageCircle size={28} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">История сообщений пуста</p>
            <p className="text-slate-600 text-xs mt-1">Сообщения появятся после взаимодействия с ботом</p>
          </div>
        ) : (
          groups.map(({ date, items }) => (
            <div key={date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-slate-600 font-medium">{formatGroupDate(date)}</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {items.map(m => {
                const isOut = m.direction === 'out'
                const content = renderContent(m)
                if (content === null) return null
                const Icon = TYPE_ICON[m.message_type] ?? MessageCircle

                return (
                  <div key={m.id} className={clsx('flex items-end gap-2 mb-1.5', isOut ? 'flex-row-reverse' : 'flex-row')}>
                    {/* Avatar icon */}
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-1',
                      isOut ? 'bg-primary-600/30' : 'bg-sky-600/20',
                    )}>
                      {isOut
                        ? <ArrowUpFromLine size={10} className="text-primary-400" />
                        : <ArrowDownToLine size={10} className="text-sky-400" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={clsx(
                      'max-w-[72%] px-3 py-2 rounded-2xl text-sm',
                      isOut
                        ? 'bg-primary-600/20 text-white rounded-br-sm'
                        : 'bg-navy-700/80 text-slate-200 rounded-bl-sm border border-white/[0.05]',
                    )}>
                      {m.message_type !== 'text' && (
                        <div className={clsx(
                          'flex items-center gap-1 text-[10px] font-medium mb-1 uppercase tracking-wide',
                          isOut ? 'text-primary-400' : 'text-sky-500',
                        )}>
                          <Icon size={10} />
                          {m.message_type === 'file' ? 'файл'
                           : m.message_type === 'photo' ? 'фото'
                           : m.message_type === 'voice' ? 'голосовое'
                           : m.message_type}
                        </div>
                      )}
                      <div className="leading-relaxed">{content}</div>
                      <p className={clsx('text-[10px] mt-1 text-right', isOut ? 'text-primary-400/60' : 'text-slate-600')}>
                        {format(parseISO(m.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
