import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ChevronLeft, ChevronRight, Loader2, CalendarDays, CheckSquare, Square, AlertCircle } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { supabase } from '../../../lib/supabase'
import type { AcademicSubject } from '../../../types/academic'
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

interface Props {
  open: boolean
  onClose: () => void
  clientId: number
  subjects: AcademicSubject[]
  onImported: () => void
}

const DEFAULT_GROUP = '13481'
const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-schedule`

export default function ScheduleImportModal({ open, onClose, clientId, subjects, onImported }: Props) {
  const [groupId, setGroupId] = useState(DEFAULT_GROUP)
  const [week, setWeek] = useState<number | null>(null) // null = current week
  const [fetching, setFetching] = useState(false)
  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({}) // lesson subject name → existing subject id or 'new'
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  function reset() {
    setLessons(null)
    setSelected(new Set())
    setSubjectMap({})
    setError('')
    setDone(false)
  }

  async function fetchSchedule(w: number | null) {
    setFetching(true)
    setError('')
    reset()
    try {
      const res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: groupId.trim(), week: w }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
      const fetchedLessons: Lesson[] = json.lessons ?? []
      setLessons(fetchedLessons)
      setCurrentWeek(json.currentWeek ?? w)
      setWeek(json.currentWeek ?? w)
      // Pre-select all
      setSelected(new Set(fetchedLessons.map((_, i) => i)))
      // Auto-map subjects by name match
      const uniqueNames = [...new Set(fetchedLessons.map(l => l.subject).filter(Boolean))]
      const autoMap: Record<string, string> = {}
      for (const name of uniqueNames) {
        const match = subjects.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim())
        autoMap[name] = match ? String(match.id) : 'new'
      }
      setSubjectMap(autoMap)
    } catch (e) {
      setError(String(e))
    } finally {
      setFetching(false)
    }
  }

  function toggleAll() {
    if (!lessons) return
    if (selected.size === lessons.length) setSelected(new Set())
    else setSelected(new Set(lessons.map((_, i) => i)))
  }

  function toggleOne(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function handleImport() {
    if (!lessons) return
    setImporting(true)
    setError('')

    // Create new subjects for 'new' mappings
    const createdSubjects: Record<string, number> = {}
    const newSubjectNames = [...new Set(
      lessons.filter((_, i) => selected.has(i))
        .map(l => l.subject)
        .filter(n => n && subjectMap[n] === 'new')
    )]
    for (const name of newSubjectNames) {
      const { data } = await supabase.from('academic_subjects')
        .insert({ client_id: clientId, name })
        .select('id')
        .single()
      if (data) createdSubjects[name] = data.id
    }

    const records = lessons
      .filter((_, i) => selected.has(i))
      .map(l => {
        const rawId = l.subject ? subjectMap[l.subject] : undefined
        let subjectId: number | null = null
        if (rawId === 'new') subjectId = createdSubjects[l.subject] ?? null
        else if (rawId) subjectId = parseInt(rawId)

        return {
          client_id: clientId,
          attendance_date: l.date,
          time_slot: l.time || null,
          subject_id: subjectId,
          type: l.type || null,
          status: 'upcoming' as const,
          notified_student: false,
          comment: [l.teacher, l.room, l.building].filter(Boolean).join(' • ') || null,
        }
      })

    if (records.length > 0) {
      const { error: insertError } = await supabase.from('academic_attendance').insert(records)
      if (insertError) { setError(insertError.message); setImporting(false); return }
    }

    setImportedCount(records.length)
    setDone(true)
    setImporting(false)
    onImported()
  }

  function handleClose() {
    reset()
    setWeek(null)
    setGroupId(DEFAULT_GROUP)
    setDone(false)
    onClose()
  }

  // Group lessons by date for display
  const byDate: Record<string, number[]> = {}
  if (lessons) {
    lessons.forEach((l, i) => {
      if (!byDate[l.date]) byDate[l.date] = []
      byDate[l.date].push(i)
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Импорт расписания" maxWidth="max-w-2xl">
      {done ? (
        <div className="py-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <CheckSquare size={28} className="text-emerald-400" />
          </div>
          <p className="text-white font-semibold text-lg">Готово!</p>
          <p className="text-slate-400 text-sm mt-1">Добавлено {importedCount} записей о занятиях</p>
          <button onClick={handleClose} className="mt-6 btn-primary text-sm px-8">Закрыть</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group + fetch */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Номер группы</label>
              <input
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                placeholder="13481"
                className="w-full bg-navy-700 border border-navy-500 text-white px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
              />
            </div>
            <button
              onClick={() => fetchSchedule(week)}
              disabled={!groupId.trim() || fetching}
              className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 flex-shrink-0"
            >
              {fetching ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Загрузить
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Week navigation */}
          {lessons !== null && (
            <div className="flex items-center justify-between bg-navy-700/60 rounded-xl px-4 py-2.5 border border-white/[0.06]">
              <button
                onClick={() => { const w = (currentWeek ?? 1) - 1; setWeek(w); fetchSchedule(w) }}
                disabled={fetching}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
              >
                <ChevronLeft size={14} /> Пред. неделя
              </button>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <CalendarDays size={12} />
                {currentWeek ? `Неделя ${currentWeek}` : 'Текущая неделя'}
              </span>
              <button
                onClick={() => { const w = (currentWeek ?? 1) + 1; setWeek(w); fetchSchedule(w) }}
                disabled={fetching}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors"
              >
                След. неделя <ChevronRight size={14} />
              </button>
            </div>
          )}

          {lessons !== null && lessons.length === 0 && (
            <div className="glass rounded-xl border border-white/[0.06] py-10 text-center">
              <p className="text-slate-500 text-sm">Расписание не найдено</p>
              <p className="text-slate-600 text-xs mt-1">Попробуйте другую неделю или проверьте номер группы</p>
            </div>
          )}

          {lessons !== null && lessons.length > 0 && (
            <>
              {/* Subject mapping */}
              {Object.keys(subjectMap).filter(Boolean).length > 0 && (
                <div className="glass rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Сопоставление предметов</p>
                  {Object.keys(subjectMap).filter(Boolean).map(name => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 flex-1 truncate">{name}</span>
                      <select
                        value={subjectMap[name]}
                        onChange={e => setSubjectMap(m => ({ ...m, [name]: e.target.value }))}
                        className="bg-navy-700 border border-navy-500 text-slate-300 text-xs px-2 py-1.5 rounded-lg outline-none focus:border-primary-500 transition-all"
                      >
                        <option value="new">+ Создать новый предмет</option>
                        {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        <option value="">— Без предмета —</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Lesson list */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                    {selected.size === lessons.length
                      ? <CheckSquare size={13} className="text-primary-400" />
                      : <Square size={13} />}
                    {selected.size === lessons.length ? 'Снять всё' : 'Выбрать всё'} ({selected.size}/{lessons.length})
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                  <AnimatePresence>
                    {Object.entries(byDate).map(([date, indices]) => (
                      <div key={date} className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pl-1 pt-1">
                          {format(parseISO(date), 'EEEE, d MMMM', { locale: ru })}
                        </p>
                        {indices.map(i => {
                          const l = lessons[i]
                          const isSel = selected.has(i)
                          return (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              onClick={() => toggleOne(i)}
                              className={clsx(
                                'w-full text-left glass rounded-xl border p-3 transition-all',
                                isSel ? 'border-primary-500/30 bg-primary-600/10' : 'border-white/[0.06] opacity-50'
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex-shrink-0">
                                  {isSel
                                    ? <CheckSquare size={13} className="text-primary-400" />
                                    : <Square size={13} className="text-slate-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-white">{l.subject || '—'}</span>
                                    {l.type && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/15 text-violet-400 rounded-md border border-violet-500/20">
                                        {l.type}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-slate-500">
                                    {l.time && <span>{l.time}</span>}
                                    {l.teacher && <span>{l.teacher}</span>}
                                    {l.room && <span>{l.room}</span>}
                                    {l.building && <span className="text-slate-600">{l.building}</span>}
                                  </div>
                                </div>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleClose} className="flex-1 btn-secondary text-sm">Отмена</button>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0 || importing}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
                >
                  {importing
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Download size={14} />}
                  Импортировать ({selected.size})
                </button>
              </div>
            </>
          )}

          {!lessons && !fetching && !error && (
            <p className="text-xs text-slate-500 text-center pb-2">
              Введите номер группы и нажмите «Загрузить» для предпросмотра расписания
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
