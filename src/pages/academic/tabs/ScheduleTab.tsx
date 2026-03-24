import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, Edit2,
  AlertCircle, BookOpen, Clock, MapPin, Link2, ChevronDown, Check, Download,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { AcademicClient, AcademicSubject } from '../../../types/academic'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

interface Lesson {
  date: string
  time: string
  subject: string
  type: string
  teacher: string
  room: string
  building: string
}

interface SubjectMapping {
  schedule_name: string
  subject_id: number | null
}

interface Props {
  client: AcademicClient
  subjects: AcademicSubject[]
  isAdmin: boolean
  onClientChange: () => void
}

const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-schedule`

const TYPE_COLORS: Record<string, string> = {
  'Лек': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Лекция': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Пр': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Практика': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Сем': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Семинар': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Лаб': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
}

function typeColor(type: string) {
  for (const key of Object.keys(TYPE_COLORS)) {
    if (type.startsWith(key)) return TYPE_COLORS[key]
  }
  return 'bg-slate-500/15 text-slate-400 border-slate-500/20'
}

export default function ScheduleTab({ client, subjects, isAdmin, onClientChange }: Props) {
  const [groupInput, setGroupInput] = useState(client.schedule_group ?? '')
  const [editingGroup, setEditingGroup] = useState(!client.schedule_group)
  const [savingGroup, setSavingGroup] = useState(false)

  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  const [week, setWeek] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // mappings: schedule_name → subject_id | null
  const [mappings, setMappings] = useState<Record<string, number | null>>({})
  const [showMappingPanel, setShowMappingPanel] = useState(false)
  const [savingMap, setSavingMap] = useState<string | null>(null)
  const [importingSubjects, setImportingSubjects] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  useEffect(() => {
    if (client.schedule_group) {
      fetchSchedule(null)
      loadMappings()
    }
  }, [client.schedule_group])

  async function loadMappings() {
    const { data } = await supabase
      .from('schedule_subject_mappings')
      .select('schedule_name, subject_id')
      .eq('client_id', client.id)
    if (data) {
      const map: Record<string, number | null> = {}
      for (const row of data as SubjectMapping[]) map[row.schedule_name] = row.subject_id
      setMappings(map)
    }
  }

  async function saveMapping(scheduleName: string, subjectId: number | null) {
    setSavingMap(scheduleName)
    await supabase.from('schedule_subject_mappings').upsert(
      { client_id: client.id, schedule_name: scheduleName, subject_id: subjectId },
      { onConflict: 'client_id,schedule_name' }
    )
    setMappings(m => ({ ...m, [scheduleName]: subjectId }))
    setSavingMap(null)
  }

  async function saveGroup() {
    if (!groupInput.trim()) return
    setSavingGroup(true)
    await supabase.from('academic_clients').update({ schedule_group: groupInput.trim() }).eq('id', client.id)
    setSavingGroup(false)
    setEditingGroup(false)
    onClientChange()
    fetchSchedule(null)
  }

  async function fetchSchedule(w: number | null) {
    if (!client.schedule_group && !groupInput.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: client.schedule_group ?? groupInput.trim(), week: w }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
      setLessons(json.lessons ?? [])
      setWeek(json.currentWeek ?? w)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function navigate(dir: 1 | -1) {
    const next = (week ?? 1) + dir
    setWeek(next)
    fetchSchedule(next)
  }

  const byDate: Record<string, Lesson[]> = {}
  if (lessons) {
    for (const l of lessons) {
      if (!byDate[l.date]) byDate[l.date] = []
      byDate[l.date].push(l)
    }
  }

  // All unique schedule subject names from current fetch
  const uniqueScheduleNames = lessons
    ? [...new Set(lessons.map(l => l.subject).filter(Boolean))]
    : []

  // Names that have no mapping AND no subject with the same name already in DB
  const toImport = uniqueScheduleNames.filter(name => {
    if (mappings[name]) return false
    const nameLower = name.toLowerCase().trim()
    return !subjects.some(s => s.name.toLowerCase().trim() === nameLower)
  })

  async function importSubjectsFromSchedule() {
    if (!toImport.length) return
    setImportingSubjects(true)
    setImportedCount(null)
    try {
      const { data: created, error } = await supabase
        .from('academic_subjects')
        .insert(toImport.map(name => ({ client_id: client.id, name })))
        .select('id, name')
      if (error) throw error
      if (created?.length) {
        await supabase.from('schedule_subject_mappings').upsert(
          created.map((s: { id: number; name: string }) => ({
            client_id: client.id,
            schedule_name: s.name,
            subject_id: s.id,
          })),
          { onConflict: 'client_id,schedule_name' }
        )
        const newMappings = { ...mappings }
        for (const s of created as { id: number; name: string }[]) newMappings[s.name] = s.id
        setMappings(newMappings)
        setImportedCount(created.length)
        onClientChange()
      }
    } catch (e) {
      console.error('Import error', e)
    } finally {
      setImportingSubjects(false)
    }
  }

  // Setup screen
  if (!client.schedule_group || editingGroup) {
    return (
      <div className="glass rounded-2xl border border-white/[0.06] p-8 flex flex-col items-center text-center max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-4">
          <CalendarDays size={26} className="text-violet-400" />
        </div>
        <h3 className="text-white font-semibold text-base mb-1">Расписание группы</h3>
        <p className="text-slate-500 text-sm mb-5">
          {editingGroup && client.schedule_group ? 'Измените номер группы' : 'Введите номер группы с сайта rasp.unecon.ru'}
        </p>
        <div className="w-full space-y-3">
          <input
            value={groupInput}
            onChange={e => setGroupInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveGroup()}
            placeholder="Номер группы, напр. 13481"
            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm text-center"
            autoFocus
          />
          <div className="flex gap-2">
            {editingGroup && client.schedule_group && (
              <button onClick={() => setEditingGroup(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            )}
            <button onClick={saveGroup} disabled={!groupInput.trim() || savingGroup}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {savingGroup ? <Loader2 size={14} className="animate-spin" /> : null}
              Сохранить
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Группа</span>
          <span className="text-xs font-semibold text-white bg-navy-700 border border-white/[0.07] px-2.5 py-1 rounded-lg">
            {client.schedule_group}
          </span>
          {isAdmin && (
            <button onClick={() => { setGroupInput(client.schedule_group ?? ''); setEditingGroup(true) }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
              <Edit2 size={12} />
            </button>
          )}
          {isAdmin && lessons && lessons.length > 0 && (
            <button
              onClick={() => setShowMappingPanel(v => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                showMappingPanel
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'bg-navy-700 text-slate-400 border-white/[0.07] hover:text-white'
              )}
            >
              <Link2 size={11} />
              Предметы
              <ChevronDown size={10} className={clsx('transition-transform', showMappingPanel && 'rotate-180')} />
            </button>
          )}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1 bg-navy-700/60 rounded-xl border border-white/[0.06] px-1">
          <button onClick={() => navigate(-1)} disabled={loading}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs text-slate-400 px-2 min-w-[80px] text-center">
            {week ? `Неделя ${week}` : 'Текущая'}
          </span>
          <button onClick={() => navigate(1)} disabled={loading}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Subject mapping panel */}
      <AnimatePresence>
        {showMappingPanel && isAdmin && uniqueScheduleNames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Link2 size={11} /> Связать предметы расписания с базой
                </p>
                {toImport.length > 0 && (
                  <button
                    onClick={importSubjectsFromSchedule}
                    disabled={importingSubjects}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-400 text-xs font-medium transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    {importingSubjects
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Download size={11} />
                    }
                    {importingSubjects ? 'Импорт...' : `Импортировать ${toImport.length}`}
                  </button>
                )}
                {importedCount !== null && toImport.length === 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <Check size={11} /> Добавлено {importedCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Выберите соответствие между предметами из расписания и предметами в системе. Или нажмите «Импортировать», чтобы автоматически добавить отсутствующие предметы.
              </p>
              <div className="space-y-2">
                {uniqueScheduleNames.map(name => {
                  const mapped = mappings[name] ?? null
                  const linkedSubject = mapped ? subjects.find(s => s.id === mapped) : null
                  const isSaving = savingMap === name
                  return (
                    <div key={name} className="flex items-center gap-3 bg-navy-700/60 rounded-xl px-3 py-2.5 border border-white/[0.05]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{name}</p>
                        {linkedSubject && (
                          <p className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                            <Check size={9} /> {linkedSubject.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSaving && <Loader2 size={12} className="animate-spin text-slate-500" />}
                        <select
                          value={mapped ?? ''}
                          onChange={e => saveMapping(name, e.target.value ? parseInt(e.target.value) : null)}
                          disabled={isSaving}
                          className="bg-navy-600 border border-navy-400 text-slate-300 text-xs px-2 py-1.5 rounded-lg outline-none focus:border-cyan-500 transition-all max-w-[180px]"
                        >
                          <option value="">— Не связан —</option>
                          {subjects.map(s => (
                            <option key={s.id} value={String(s.id)}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 size={24} className="animate-spin text-primary-500" />
          <span className="text-sm text-slate-500">Загружаем расписание...</span>
        </div>
      ) : lessons === null ? null : lessons.length === 0 ? (
        <div className="glass rounded-xl border border-white/[0.06] py-14 flex flex-col items-center text-center">
          <CalendarDays size={28} className="text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">На этой неделе занятий нет</p>
          <p className="text-slate-600 text-xs mt-1">Попробуйте другую неделю</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={week ?? 'current'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {Object.entries(byDate).map(([date, dayLessons]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CalendarDays size={11} />
                  {format(parseISO(date), 'EEEE, d MMMM', { locale: ru })}
                  <span className="text-slate-600 normal-case tracking-normal font-normal">
                    — {dayLessons.length} {dayLessons.length === 1 ? 'занятие' : dayLessons.length <= 4 ? 'занятия' : 'занятий'}
                  </span>
                </p>
                <div className="space-y-2">
                  {dayLessons.map((l, i) => {
                    const mappedId = l.subject ? (mappings[l.subject] ?? null) : null
                    const linkedSubject = mappedId ? subjects.find(s => s.id === mappedId) : null
                    return (
                      <div key={i} className="glass rounded-xl border border-white/[0.06] hover:border-white/10 p-4 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-navy-600 border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BookOpen size={14} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-white">{l.subject || '—'}</span>
                              {l.type && (
                                <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-md border', typeColor(l.type))}>
                                  {l.type}
                                </span>
                              )}
                              {linkedSubject && (
                                <Check size={13} className="text-cyan-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                              {l.time && (
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> {l.time}
                                </span>
                              )}
                              {l.teacher && <span>{l.teacher}</span>}
                              {(l.room || l.building) && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} />
                                  {[l.room, l.building].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
