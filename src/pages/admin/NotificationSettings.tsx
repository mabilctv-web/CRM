import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, BellOff, Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp,
  Clock, MessageSquare, Info, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

interface ReminderRule {
  id: string
  hours_before: number
  label: string
  template: string
}

interface Settings {
  enabled: boolean
  reminders: ReminderRule[]
}

const VARIABLES = [
  { key: '{student}',      desc: 'Имя студента (только имя)' },
  { key: '{student_full}', desc: 'Полное ФИО студента' },
  { key: '{subject}',      desc: 'Название предмета' },
  { key: '{time}',     desc: 'Время занятия' },
  { key: '{type}',     desc: 'Тип занятия' },
  { key: '{date}',     desc: 'Дата занятия' },
  { key: '{room}',     desc: 'Аудитория (напр. 504)' },
  { key: '{building}', desc: 'Корпус / адрес (напр. Кузнечный 9/27)' },
  { key: '{location}', desc: 'Аудитория + корпус одной строкой' },
  { key: '{comment}',  desc: 'Комментарий к явке (строка скрывается, если пуст)' },
]

const DEFAULT_TEMPLATE = '📚 Напоминание о занятии\n\n📖 {subject}\n🕐 {time}\n📝 {type}\n{comment}\n\nУдачи, {student}! 🎓'

function hoursLabel(h: number) {
  if (h < 1) return `${Math.round(h * 60)} мин`
  if (h === 1) return '1 час'
  if (h < 5) return `${h} часа`
  if (h < 24) return `${h} часов`
  const d = h / 24
  if (Number.isInteger(d)) return d === 1 ? '1 день' : `${d} дня`
  return `${h} ч`
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showVars, setShowVars] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('notification_settings')
      .select('enabled, reminders')
      .eq('id', 1)
      .single()
    if (data) {
      setSettings({ enabled: data.enabled, reminders: data.reminders ?? [] })
      if ((data.reminders ?? []).length > 0) setExpandedId(data.reminders[0].id)
    }
    setLoading(false)
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    await supabase.from('notification_settings')
      .upsert({ id: 1, enabled: settings.enabled, reminders: settings.reminders })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function addRule() {
    if (!settings) return
    const newId = String(Date.now())
    const newRule: ReminderRule = {
      id: newId,
      hours_before: 24,
      label: 'Новое напоминание',
      template: DEFAULT_TEMPLATE,
    }
    setSettings(s => s ? { ...s, reminders: [...s.reminders, newRule] } : s)
    setExpandedId(newId)
  }

  function updateRule(id: string, patch: Partial<ReminderRule>) {
    setSettings(s => s ? {
      ...s,
      reminders: s.reminders.map(r => r.id === id ? { ...r, ...patch } : r),
    } : s)
  }

  function deleteRule(id: string) {
    setSettings(s => s ? { ...s, reminders: s.reminders.filter(r => r.id !== id) } : s)
    if (expandedId === id) setExpandedId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Bell size={20} className="text-violet-400" /> Настройки оповещений
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Telegram-напоминания студентам о предстоящих явках
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

      {/* Global toggle */}
      <div className="glass rounded-2xl border border-white/[0.06] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            settings.enabled ? 'bg-emerald-500/15' : 'bg-slate-700/50',
          )}>
            {settings.enabled
              ? <Bell size={18} className="text-emerald-400" />
              : <BellOff size={18} className="text-slate-500" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {settings.enabled ? 'Оповещения включены' : 'Оповещения выключены'}
            </p>
            <p className="text-xs text-slate-500">
              {settings.enabled
                ? 'Студенты получают напоминания в Telegram'
                : 'Все напоминания приостановлены'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSettings(s => s ? { ...s, enabled: !s.enabled } : s)}
          className={clsx(
            'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
            settings.enabled ? 'bg-emerald-500' : 'bg-slate-600',
          )}
        >
          <span className={clsx(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
            settings.enabled ? 'left-6' : 'left-0.5',
          )} />
        </button>
      </div>

      {/* Variable reference */}
      <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => setShowVars(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Info size={14} className="text-cyan-400" /> Доступные переменные для шаблона
          </span>
          {showVars ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </button>
        <AnimatePresence>
          {showVars && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 grid grid-cols-1 gap-1.5 border-t border-white/[0.06] pt-3">
                {VARIABLES.map(v => (
                  <div key={v.key} className="flex items-start gap-3">
                    <code className="text-cyan-400 text-xs bg-cyan-500/10 px-2 py-0.5 rounded font-mono flex-shrink-0 mt-0.5">
                      {v.key}
                    </code>
                    <span className="text-xs text-slate-400">{v.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Clock size={14} className="text-violet-400" />
            Правила напоминаний
            <span className="text-xs text-slate-500 font-normal">({settings.reminders.length})</span>
          </h2>
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-400 text-xs font-medium transition-all"
          >
            <Plus size={12} /> Добавить
          </button>
        </div>

        {settings.reminders.length === 0 && (
          <div className="glass rounded-xl border border-white/[0.06] py-12 flex flex-col items-center text-center">
            <Bell size={28} className="text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">Нет правил напоминаний</p>
            <p className="text-slate-600 text-xs mt-1">Нажмите «Добавить» чтобы создать первое</p>
          </div>
        )}

        <AnimatePresence>
          {settings.reminders.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              {/* Rule header */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
              >
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{rule.label || 'Без названия'}</p>
                  <p className="text-xs text-slate-500">
                    За <span className="text-violet-400 font-medium">{hoursLabel(rule.hours_before)}</span> до занятия
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteRule(rule.id) }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={13} />
                </button>
                {expandedId === rule.id
                  ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
                  : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
              </div>

              {/* Rule editor */}
              <AnimatePresence>
                {expandedId === rule.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-t border-white/[0.06]"
                  >
                    <div className="p-4 space-y-4">
                      {/* Label + hours_before */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Название правила
                          </label>
                          <input
                            value={rule.label}
                            onChange={e => updateRule(rule.id, { label: e.target.value })}
                            placeholder="напр. За день"
                            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            За сколько часов до
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0.25}
                              step={0.25}
                              value={rule.hours_before}
                              onChange={e => updateRule(rule.id, { hours_before: parseFloat(e.target.value) || 1 })}
                              className="w-full bg-navy-700 border border-navy-500 text-white px-3 py-2 pr-10 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">ч</span>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1">
                            = {hoursLabel(rule.hours_before)} до занятия
                          </p>
                        </div>
                      </div>

                      {/* Template */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                          <MessageSquare size={11} /> Текст сообщения
                        </label>
                        <textarea
                          value={rule.template}
                          onChange={e => updateRule(rule.id, { template: e.target.value })}
                          rows={8}
                          placeholder={DEFAULT_TEMPLATE}
                          className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-700 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all resize-none font-mono leading-relaxed"
                        />
                        <p className="text-[10px] text-slate-600 mt-1">
                          Строки с пустыми переменными (напр. пустой {'{comment}'}) скрываются автоматически
                        </p>
                      </div>

                      {/* Preview */}
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2">Предпросмотр</p>
                        <div className="bg-[#17212b] rounded-xl p-3 border border-white/[0.04]">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-violet-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-white">Б</span>
                            </div>
                            <div className="bg-[#2b5278] rounded-lg rounded-tl-none px-3 py-2 max-w-[260px]">
                              <p className="text-white text-xs whitespace-pre-wrap leading-relaxed">
                                {renderPreview(rule.template)}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 text-right">18:00</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function renderPreview(template: string): string {
  const sample: Record<string, string> = {
    student:      'Михаил',
    student_full: 'Иванов Михаил Дмитриевич',
    subject:  'Математический анализ',
    time:     '09:00 - 10:35',
    type:     'Лекция',
    date:     '25 марта',
    room:     '504',
    building: 'Кузнечный 9/27',
    location: '504, Кузнечный 9/27',
    comment:  '💬 Принести конспект',
  }
  let result = template
  for (const [key, val] of Object.entries(sample)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
  }
  return result
}
