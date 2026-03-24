import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, CalendarCheck, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, AlertCircle, Circle, Calendar, FileText, CalendarDays, MapPin,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { AcademicClient, AcademicSubject, AcademicAssignment, AcademicAttendance } from '../../../types/academic'
import { ASSIGNMENT_STATUSES, ATTENDANCE_STATUSES } from '../../../types/academic'
import { format, parseISO, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns'
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

const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-schedule`

function formatLessonDate(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Сегодня'
  if (isTomorrow(d)) return 'Завтра'
  const days = differenceInDays(d, new Date())
  if (days <= 6) return format(d, 'EEEE', { locale: ru })
  return format(d, 'd MMM', { locale: ru })
}

interface Props { clientId: number; subjects: AcademicSubject[]; client: AcademicClient }

export default function SubjectsTab({ clientId, subjects, client }: Props) {
  const [selected, setSelected] = useState<AcademicSubject | null>(null)
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([])
  const [attendance, setAttendance] = useState<AcademicAttendance[]>([])
  const [stats, setStats] = useState<Record<number, { assignments: number; done: number; attendance: number; came: number }>>({})
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  // nextLesson: subject_id → next upcoming Lesson | null
  const [nextLesson, setNextLesson] = useState<Record<number, Lesson | null>>({})

  // Load schedule mappings + upcoming lessons
  useEffect(() => {
    if (!client.schedule_group || subjects.length === 0) return
    async function loadScheduleData() {
      // Load mappings: schedule_name → subject_id
      const { data: mapRows } = await supabase
        .from('schedule_subject_mappings')
        .select('schedule_name, subject_id')
        .eq('client_id', clientId)
      if (!mapRows || mapRows.length === 0) return

      // Build reverse map: schedule_name → subject_id
      const nameToId: Record<string, number> = {}
      for (const row of mapRows) {
        if (row.subject_id) nameToId[row.schedule_name] = row.subject_id
      }
      if (Object.keys(nameToId).length === 0) return

      // Fetch current week + next week in parallel
      const today = format(new Date(), 'yyyy-MM-dd')
      const fetchWeek = async (w: number | null) => {
        try {
          const res = await fetch(EDGE_FN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: client.schedule_group, week: w }),
          })
          const json = await res.json()
          const cw: number | null = json.currentWeek ?? w
          return { lessons: (json.lessons ?? []) as Lesson[], nextWeek: cw ? cw + 1 : null }
        } catch { return { lessons: [], nextWeek: null } }
      }

      const { lessons: curLessons, nextWeek } = await fetchWeek(null)
      let allLessons = curLessons

      // If no future lessons this week, also fetch next week
      const hasFuture = curLessons.some(l => l.date >= today)
      if (!hasFuture && nextWeek) {
        const { lessons: nextLessons } = await fetchWeek(nextWeek)
        allLessons = [...curLessons, ...nextLessons]
      } else if (nextWeek) {
        // Always peek next week too for subjects with no lessons remaining this week
        const { lessons: nextLessons } = await fetchWeek(nextWeek)
        allLessons = [...curLessons, ...nextLessons]
      }

      // Sort by date then time
      allLessons.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

      // Build nextLesson map per subject_id
      const result: Record<number, Lesson | null> = {}
      for (const [name, subjectId] of Object.entries(nameToId)) {
        const upcoming = allLessons.find(l => l.subject === name && l.date >= today)
        result[subjectId] = upcoming ?? null
      }
      setNextLesson(result)
    }
    loadScheduleData()
  }, [client.schedule_group, subjects.length, clientId])

  // Load stats for all subjects
  useEffect(() => {
    if (subjects.length === 0) { setStatsLoading(false); return }
    const ids = subjects.map(s => s.id)
    Promise.all([
      supabase.from('academic_assignments').select('subject_id, status').in('subject_id', ids),
      supabase.from('academic_attendance').select('subject_id, status').in('subject_id', ids),
    ]).then(([{ data: aData }, { data: atData }]) => {
      const map: typeof stats = {}
      for (const s of subjects) {
        const a = (aData ?? []).filter(x => x.subject_id === s.id)
        const at = (atData ?? []).filter(x => x.subject_id === s.id)
        map[s.id] = {
          assignments: a.length,
          done: a.filter(x => x.status === 'done').length,
          attendance: at.length,
          came: at.filter(x => x.status === 'came').length,
        }
      }
      setStats(map)
      setStatsLoading(false)
    })
  }, [subjects])

  async function selectSubject(s: AcademicSubject) {
    setSelected(s)
    setLoading(true)
    const [{ data: aData }, { data: atData }] = await Promise.all([
      supabase.from('academic_assignments').select('*')
        .eq('subject_id', s.id).order('deadline', { ascending: true, nullsFirst: false }),
      supabase.from('academic_attendance').select('*')
        .eq('subject_id', s.id).order('attendance_date', { ascending: false }),
    ])
    setAssignments((aData ?? []) as AcademicAssignment[])
    setAttendance((atData ?? []) as AcademicAttendance[])
    setLoading(false)
  }

  function getEffectiveStatus(a: AcademicAssignment): string {
    if (a.status === 'done') return 'done'
    if (a.deadline && isPast(parseISO(a.deadline))) return 'overdue'
    return a.status
  }

  function getDeadlineInfo(deadline: string | null, eff: string) {
    if (!deadline || eff === 'done') return null
    const days = differenceInDays(parseISO(deadline), new Date())
    if (days < 0) return { text: `Просрочено на ${Math.abs(days)} дн.`, color: 'text-red-400' }
    if (days === 0) return { text: 'Сегодня!', color: 'text-red-400' }
    if (days <= 3) return { text: `Через ${days} дн.`, color: 'text-orange-400' }
    if (days <= 7) return { text: `Через ${days} дн.`, color: 'text-amber-400' }
    return { text: format(parseISO(deadline), 'd MMM yyyy', { locale: ru }), color: 'text-slate-400' }
  }

  const statusInfo = (s: string) => ASSIGNMENT_STATUSES.find(x => x.value === s) ?? ASSIGNMENT_STATUSES[0]
  const attendStatusInfo = (s: string) => ATTENDANCE_STATUSES.find(x => x.value === s) ?? ATTENDANCE_STATUSES[3]

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'done') return <CheckCircle2 size={14} className="text-emerald-400" />
    if (status === 'in_progress') return <Clock size={14} className="text-blue-400" />
    if (status === 'overdue') return <AlertCircle size={14} className="text-red-400" />
    return <Circle size={14} className="text-slate-500" />
  }

  if (subjects.length === 0) {
    return (
      <div className="glass rounded-xl border border-white/[0.06] py-14 flex flex-col items-center text-center">
        <BookOpen size={28} className="text-slate-600 mb-3" />
        <p className="text-slate-500 text-sm">Предметов пока нет</p>
        <p className="text-slate-600 text-xs mt-1">Добавьте предметы во вкладке «Успеваемость»</p>
      </div>
    )
  }

  // Subject detail view
  if (selected) {
    const st = stats[selected.id]
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> Все предметы
        </button>

        <div className="glass rounded-2xl border border-white/[0.06] p-5">
          <h2 className="text-lg font-bold text-white">{selected.name}</h2>
          {st && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-navy-700/60 rounded-xl p-3 text-center border border-white/[0.05]">
                <p className="text-xl font-bold text-white">{st.assignments}</p>
                <p className="text-xs text-slate-500 mt-0.5">заданий <span className="text-emerald-400">({st.done} выполнено)</span></p>
              </div>
              <div className="bg-navy-700/60 rounded-xl p-3 text-center border border-white/[0.05]">
                <p className="text-xl font-bold text-white">{st.attendance}</p>
                <p className="text-xs text-slate-500 mt-0.5">занятий <span className="text-emerald-400">({st.came} посещено)</span></p>
              </div>
            </div>
          )}
          {/* Next lesson block */}
          {nextLesson[selected.id] ? (() => {
            const nl = nextLesson[selected.id]!
            return (
              <div className="mt-3 flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <CalendarDays size={15} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-violet-300 mb-0.5">Ближайшее занятие</p>
                  <p className="text-sm font-semibold text-white">
                    {formatLessonDate(nl.date)}, {format(parseISO(nl.date), 'd MMMM', { locale: ru })}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={10} /> {nl.time}</span>
                    {nl.type && <span className="px-1.5 py-0.5 bg-violet-500/15 text-violet-400 rounded border border-violet-500/20 text-[10px]">{nl.type}</span>}
                    {nl.teacher && <span>{nl.teacher}</span>}
                    {(nl.room || nl.building) && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {[nl.room, nl.building].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })() : nextLesson[selected.id] === null ? (
            <p className="mt-3 text-xs text-slate-600 flex items-center gap-1.5">
              <CalendarDays size={11} /> Ближайших занятий по расписанию не найдено
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-xl border border-white/[0.06] p-4 h-14 shimmer-bg" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Assignments */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <BookOpen size={11} /> Задания ({assignments.length})
              </p>
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-600 pl-1">Нет заданий по этому предмету</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => {
                    const eff = getEffectiveStatus(a)
                    const si = statusInfo(eff)
                    const dl = getDeadlineInfo(a.deadline, eff)
                    return (
                      <div key={a.id} className={clsx(
                        'glass rounded-xl border p-3.5 transition-all',
                        eff === 'done' ? 'border-emerald-500/15' :
                        eff === 'overdue' ? 'border-red-500/20' :
                        eff === 'in_progress' ? 'border-blue-500/15' : 'border-white/[0.06]',
                      )}>
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex-shrink-0"><StatusIcon status={eff} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={clsx('text-sm font-medium', eff === 'done' ? 'text-slate-400 line-through' : 'text-white')}>
                                {a.name}
                              </span>
                              <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-md border', si.color, si.border)}>
                                {si.label}
                              </span>
                              {a.price && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                                  {Number(a.price).toLocaleString('ru')} ₽
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                              <span className="px-2 py-0.5 bg-navy-600 rounded-md text-[10px]">{a.type}</span>
                              {a.platform && <span>{a.platform}</span>}
                              {dl && (
                                <span className={clsx('flex items-center gap-1', dl.color)}>
                                  <Calendar size={10} /> {dl.text}
                                </span>
                              )}
                              {a.completed_at && (
                                <span className="text-emerald-500">✓ {format(parseISO(a.completed_at), 'd MMM', { locale: ru })}</span>
                              )}
                            </div>
                            {a.comment && <p className="mt-1 text-xs text-slate-500 italic">{a.comment}</p>}
                            <p className="mt-1 text-[10px] text-slate-600">
                              Добавлено {format(parseISO(a.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Attendance */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <CalendarCheck size={11} /> Явки ({attendance.length})
              </p>
              {attendance.length === 0 ? (
                <p className="text-xs text-slate-600 pl-1">Нет записей явок по этому предмету</p>
              ) : (
                <div className="space-y-2">
                  {attendance.map(r => {
                    const si = attendStatusInfo(r.status)
                    return (
                      <div key={r.id} className="glass rounded-xl border border-white/[0.06] p-3.5">
                        <div className="flex items-start gap-2.5">
                          <FileText size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white">
                                {format(parseISO(r.attendance_date), 'd MMMM yyyy', { locale: ru })}
                              </span>
                              {r.time_slot && <span className="text-xs text-slate-500">{r.time_slot}</span>}
                              <span className={clsx('text-xs px-2 py-0.5 rounded-lg', si.bg, si.color)}>{si.label}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                              {r.type && <span>{r.type}</span>}
                              {r.notified_student && <span className="text-cyan-500">✓ Уведомлён</span>}
                            </div>
                            {r.comment && <p className="mt-1 text-xs text-slate-500 italic">{r.comment}</p>}
                            <p className="mt-1 text-[10px] text-slate-600">
                              Добавлено {format(parseISO(r.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Subjects list
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {subjects.map((s, i) => {
          const st = stats[s.id]
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.04 }}
              onClick={() => selectSubject(s)}
              className="w-full glass rounded-xl border border-white/[0.06] hover:border-white/10 p-4 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={15} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                  {statsLoading ? (
                    <div className="h-3 w-32 rounded shimmer-bg mt-1" />
                  ) : st ? (
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BookOpen size={10} />
                        {st.assignments} заданий
                        {st.assignments > 0 && <span className="text-emerald-500 ml-0.5">({st.done} готово)</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarCheck size={10} />
                        {st.attendance} явок
                        {st.attendance > 0 && <span className="text-emerald-500 ml-0.5">({st.came} посещено)</span>}
                      </span>
                    </div>
                  ) : null}
                </div>
                {nextLesson[s.id] !== undefined && (
                  nextLesson[s.id] ? (
                    <span className="text-[10px] px-2 py-1 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20 flex items-center gap-1 flex-shrink-0">
                      <CalendarDays size={9} />
                      {formatLessonDate(nextLesson[s.id]!.date)} {nextLesson[s.id]!.time.split(' - ')[0]}
                    </span>
                  ) : null
                )}
                <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </div>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
