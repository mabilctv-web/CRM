import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, BellRing, Save, Loader2, CheckCircle2, Send, CheckCircle,
  BookOpen, Clock, CalendarCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

interface AdminNotifSettings {
  admin_telegram_chat_id: string | null
  admin_notifications: {
    new_assignment: boolean
    deadline_soon: boolean
    needs_attendance_status: boolean
  }
}

const BOT_LINK = 'https://t.me/studyDB_bot?start=admin_connect'

const NOTIF_TYPES = [
  {
    key: 'new_assignment' as const,
    icon: BookOpen,
    label: 'Новое задание',
    desc: 'Уведомление при добавлении нового задания студенту',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    key: 'deadline_soon' as const,
    icon: Clock,
    label: 'Приближение дедлайна',
    desc: 'Уведомление за 24 часа до дедлайна по заданию',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    key: 'needs_attendance_status' as const,
    icon: CalendarCheck,
    label: 'Требуется статус явки',
    desc: 'Уведомление когда явка переходит в статус "Ждёт обновления"',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
]

export default function AdminNotifications() {
  const [settings, setSettings] = useState<AdminNotifSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('notification_settings')
      .select('admin_telegram_chat_id, admin_notifications')
      .eq('id', 1)
      .single()
    if (data) {
      setSettings({
        admin_telegram_chat_id: data.admin_telegram_chat_id ?? null,
        admin_notifications: data.admin_notifications ?? {
          new_assignment: false,
          deadline_soon: false,
          needs_attendance_status: false,
        },
      })
    }
    setLoading(false)
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    await supabase.from('notification_settings').upsert({
      id: 1,
      admin_telegram_chat_id: settings.admin_telegram_chat_id,
      admin_notifications: settings.admin_notifications,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function toggleNotif(key: keyof AdminNotifSettings['admin_notifications']) {
    setSettings(s => s ? {
      ...s,
      admin_notifications: { ...s.admin_notifications, [key]: !s.admin_notifications[key] },
    } : s)
  }

  function copyLink() {
    navigator.clipboard.writeText(BOT_LINK)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  if (!settings) return null

  const isConnected = !!settings.admin_telegram_chat_id

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BellRing size={20} className="text-violet-400" /> Административные оповещения
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Уведомления о событиях CRM в Telegram администратора
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-all disabled:opacity-60 flex-shrink-0"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> :
           saved  ? <CheckCircle2 size={14} className="text-emerald-300" /> :
                    <Save size={14} />}
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      {/* Telegram connect */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-white/[0.06] p-5"
      >
        <h2 className="text-sm font-semibold text-white mb-1">Telegram аккаунт администратора</h2>
        <p className="text-xs text-slate-500 mb-4">
          Подключите Telegram для получения уведомлений о событиях в системе
        </p>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium flex-1',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-navy-700 text-slate-500 border border-navy-500',
          )}>
            {isConnected ? (
              <><CheckCircle size={14} /> Telegram подключён (ID: {settings.admin_telegram_chat_id})</>
            ) : (
              <><Bell size={14} /> Telegram не подключён</>
            )}
          </div>
          <button
            onClick={copyLink}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0',
              linkCopied
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20',
            )}
          >
            {linkCopied
              ? <><CheckCircle2 size={14} /> Скопировано</>
              : <><Send size={14} /> Ссылка для входа</>
            }
          </button>
        </div>
        {!isConnected && (
          <p className="text-[11px] text-slate-600 mt-3">
            Скопируйте ссылку и откройте её в Telegram. Бот сохранит ваш аккаунт как административный.
          </p>
        )}
      </motion.div>

      {/* Notification types */}
      <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Типы уведомлений</h2>
          <p className="text-xs text-slate-500 mt-0.5">Выберите какие события нужно отслеживать</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {NOTIF_TYPES.map(({ key, icon: Icon, label, desc, color, bg }) => (
            <div key={key} className="flex items-center gap-4 px-5 py-4">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                <Icon size={18} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(key)}
                className={clsx(
                  'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                  settings.admin_notifications[key] ? 'bg-primary-500' : 'bg-slate-700',
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
                  settings.admin_notifications[key] ? 'left-5' : 'left-0.5',
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs text-amber-400 flex items-start gap-2">
          <Bell size={13} className="flex-shrink-0 mt-0.5" />
          Для работы уведомлений необходимо подключить Telegram аккаунт администратора через бота.
          Бот отправит уведомления сразу же при наступлении события.
        </p>
      </div>
    </div>
  )
}
