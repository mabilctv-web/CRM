import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, CalendarCheck, CalendarDays, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'
import ScheduleImportModal from './ScheduleImportModal'
import type { AcademicAttendance, AcademicSubject, AcademicClient } from '../../../types/academic'
import { ATTENDANCE_STATUSES } from '../../../types/academic'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

const emptyForm = {
  attendance_date: '', time_slot: '', subject_id: '', type: '',
  room: '', building: '',
  notified_student: false, status: 'upcoming' as AcademicAttendance['status'], comment: '',
}

const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-schedule`

const LESSON_TYPES = ['', 'Лекция', 'Практика', 'Семинар', 'Лабораторная']
const LESSON_TYPE_LABELS: Record<string, string> = {
  '': '— любой тип —',
  'Лекция': 'Лекция',
  'Практика': 'Практика',
  'Семинар': 'Семинар',
  'Лабораторная': 'Лабораторная',
}

/** Normalize lesson type to lowercase key for comparison */
function typeKey(t: string): string {
  const s = t.toLowerCase().trim()
  if (s.startsWith('лек') || s === 'л') return 'лекция'
  if (s.startsWith('пр')) return 'практика'
  if (s.startsWith('сем')) return 'семинар'
  if (s.startsWith('лаб')) return 'лаборат'
  return s
}

/** Map raw schedule type to canonical display form */
function canonicalType(t: string): string {
  const k = typeKey(t)
  if (k === 'лекция') return 'Лекция'
  if (k === 'практика') return 'Практика'
  if (k === 'семинар') return 'Семинар'
  if (k === 'лаборат') return 'Лабораторная'
  return t
}

interface Props { clientId: number; subjects: AcademicSubject[]; isAdmin: boolean; client: AcademicClient }

export default function AttendanceTab({ clientId, subjects, isAdmin, client }: Props) {
  const [records, setRecords] = useState<AcademicAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicAttendance | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [importModal, setImportModal] = useState(false)
  const [fetchingNext, setFetchingNext] = useState(false)
  // subject_id → schedule_name mapping (loaded once)
  const subjectMapRef = useRef<Record<number, string>>({})
  // cached lessons for current+next week (cleared when modal opens fresh)
  type CachedLesson = { date: string; time: string; subject: string; type: string; room: string; building: string }
  const lessonsCache = useRef<CachedLesson[] | null>(null)

  useEffect(() => {
    if (!client.schedule_group) return
    supabase.from('schedule_subject_mappings')
      .select('schedule_name, subject_id')
      .eq('client_id', clientId)
      .then(({ data }) => {
        if (!data) return
        const map: Record<number, string> = {}
        for (const row of data) if (row.subject_id) map[row.subject_id] = row.schedule_name
        subjectMapRef.current = map
      })
  }, [clientId, client.schedule_group])

  /**
   * Find and fill the nearest upcoming lesson for subjectId.
   * filterType: if set, only match lessons of that type (canonical form).
   * updateType: if true, overwrite form.type with the matched lesson's type.
   */
  async function autofillFromSchedule(subjectId: number, filterType?: string, updateType = true) {
    if (!client.schedule_group) return
    const scheduleName = subjectMapRef.current[subjectId]
    if (!scheduleName) return
    setFetchingNext(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      // Load lessons (use cache if available)
      if (!lessonsCache.current) {
        const fetchWeek = async (w: number | null) => {
          const res = await fetch(EDGE_FN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: client.schedule_group, week: w }),
          })
          const json = await res.json()
          return {
            lessons: (json.lessons ?? []) as CachedLesson[],
            nextWeek: (json.currentWeek ?? w) ? (json.currentWeek ?? w) + 1 : null,
          }
        }
        const { lessons: cur, nextWeek } = await fetchWeek(null)
        const all = [...cur]
        if (nextWeek) {
          const { lessons: nxt } = await fetchWeek(nextWeek)
          all.push(...nxt)
        }
        all.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
        lessonsCache.current = all
      }

      const next = lessonsCache.current.find(l =>
        l.subject === scheduleName &&
        l.date >= today &&
        (!filterType || typeKey(l.type) === typeKey(filterType))
      )
      if (next) {
        setForm(f => ({
          ...f,
          attendance_date: next.date,
          time_slot: next.time,
          ...(updateType ? { type: canonicalType(next.type) } : {}),
          room: next.room || f.room,
          building: next.building || f.building,
        }))
      }
    } catch { /* silent */ }
    finally { setFetchingNext(false) }
  }

  async function load() {
    const { data } = await supabase.from('academic_attendance').select('*')
      .eq('client_id', clientId).order('attendance_date', { ascending: false })
    setRecords((data ?? []) as AcademicAttendance[])
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openAdd() { setEditing(null); setForm(emptyForm); lessonsCache.current = null; setModalOpen(true) }
  function openEdit(r: AcademicAttendance) {
    setEditing(r)
    setForm({
      attendance_date: r.attendance_date,
      time_slot: r.time_slot ?? '',
      subject_id: r.subject_id ? String(r.subject_id) : '',
      type: r.type ?? '',
      room: r.room ?? '',
      building: r.building ?? '',
      notified_student: r.notified_student,
      status: r.status,
      comment: r.comment ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      attendance_date: form.attendance_date,
      time_slot: form.time_slot.trim() || null,
      subject_id: form.subject_id ? parseInt(form.subject_id) : null,
      type: form.type.trim() || null,
      room: form.room.trim() || null,
      building: form.building.trim() || null,
      notified_student: form.notified_student,
      status: form.status,
      comment: form.comment.trim() || null,
    }
    if (editing) {
      await supabase.from('academic_attendance').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('academic_attendance').insert(payload)
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(id: number) {
    await supabase.from('academic_attendance').delete().eq('id', id)
    setDeleteId(null)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const statusInfo = (s: string) => ATTENDANCE_STATUSES.find(x => x.value === s) ?? ATTENDANCE_STATUSES[3]
  const subjectName = (id: number | null) => subjects.find(s => s.id === id)?.name ?? null

  const filtered = filterStatus === 'all' ? records : records.filter(r => r.status === filterStatus)
  const counts = {
    came: records.filter(r => r.status === 'came').length,
    didnt_come: records.filter(r => r.status === 'didnt_come').length,
    upcoming: records.filter(r => r.status === 'upcoming').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[{ key: 'all', label: `Все (${records.length})` }, ...ATTENDANCE_STATUSES.map(s => ({
            key: s.value, label: s.label,
          }))].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterStatus === key ? 'bg-primary-600/25 text-primary-300 border border-primary-500/30' : 'bg-navy-700 text-slate-400 hover:text-slate-200 border border-transparent')}>
              {label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setImportModal(true)}
              className="flex items-center gap-1.5 bg-navy-600 hover:bg-navy-500 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/[0.07] transition-all">
              <CalendarDays size={13} /> Импорт
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-glow transition-all">
              <Plus size={13} /> Добавить запись
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Приехал', value: counts.came, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Не приехал', value: counts.didnt_come, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Предстоит', value: counts.upcoming, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={clsx('glass rounded-xl border p-3 text-center', bg)}>
            <p className={clsx('text-xl font-bold', color)}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-white/[0.06] p-4">
              <div className="h-4 w-40 rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl border border-white/[0.06] py-12 flex flex-col items-center text-center">
          <CalendarCheck size={28} className="text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">Записей нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((r, i) => {
              const si = statusInfo(r.status)
              const sname = subjectName(r.subject_id)
              return (
                <motion.div key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.03 }}
                  className="glass rounded-xl border border-white/[0.06] hover:border-white/10 p-4 group transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {format(parseISO(r.attendance_date), 'd MMMM yyyy', { locale: ru })}
                        </span>
                        {r.time_slot && <span className="text-xs text-slate-500">{r.time_slot}</span>}
                        <span className={clsx('text-xs px-2 py-0.5 rounded-lg', si.bg, si.color)}>{si.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
                        {sname && <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-md border border-violet-500/20 text-[10px]">{sname}</span>}
                        {r.type && <span>{r.type}</span>}
                        {(r.room || r.building) && (
                          <span className="flex items-center gap-1">
                            📍 {[r.room, r.building].filter(Boolean).join(' • ')}
                          </span>
                        )}
                        {r.notified_student && <span className="text-cyan-500">✓ Студент уведомлён</span>}
                      </div>
                      {r.comment && <p className="mt-1.5 text-xs text-slate-500 italic">{r.comment}</p>}
                      <p className="mt-1 text-[10px] text-slate-600">
                        Добавлено {format(parseISO(r.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать явку' : 'Новая запись явки'} maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Дата *</label>
              <input type="date" value={form.attendance_date} onChange={e => setForm(f => ({ ...f, attendance_date: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Пара / время</label>
              <input value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))} placeholder="1 пара / 9:00"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                Предмет
                {fetchingNext && <Loader2 size={11} className="animate-spin text-violet-400" />}
              </label>
              <select value={form.subject_id} onChange={e => {
                const val = e.target.value
                setForm(f => ({ ...f, subject_id: val }))
                if (!editing && val) autofillFromSchedule(parseInt(val), form.type || undefined, true)
              }}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm">
                <option value="">— без предмета —</option>
                {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
              {!editing && client.schedule_group && form.subject_id && !fetchingNext && (
                <p className="mt-1 text-[10px] text-violet-400/70">Дата и время подтянуты из расписания</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Тип занятия</label>
              <select value={form.type} onChange={e => {
                const val = e.target.value
                setForm(f => ({ ...f, type: val }))
                if (!editing && form.subject_id) autofillFromSchedule(parseInt(form.subject_id), val || undefined, false)
              }}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm">
                {LESSON_TYPES.map(t => <option key={t} value={t}>{LESSON_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Аудитория</label>
              <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="504"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Корпус / адрес</label>
              <input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} placeholder="Кузнечный 9/27"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Статус</label>
            <div className="grid grid-cols-2 gap-2">
              {ATTENDANCE_STATUSES.map(s => (
                <button key={s.value} onClick={() => setForm(f => ({ ...f, status: s.value as AcademicAttendance['status'] }))}
                  className={clsx('text-xs py-2 px-3 rounded-xl border transition-all',
                    form.status === s.value ? 'border-primary-500/50 bg-primary-600/20 text-primary-300' : 'border-navy-500 bg-navy-700 text-slate-400 hover:border-navy-400')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, notified_student: !f.notified_student }))}
              className={clsx('w-10 h-6 rounded-full transition-colors duration-200 relative', form.notified_student ? 'bg-cyan-600' : 'bg-navy-600')}>
              <div className={clsx('w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform duration-200', form.notified_student ? 'translate-x-5' : 'translate-x-1')} />
            </div>
            <span className="text-sm text-slate-300">Написал студенту</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Причина / комментарий</label>
            <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} rows={2}
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.attendance_date || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить запись?" maxWidth="max-w-sm">
        <div className="flex gap-3 mt-4">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>

      <ScheduleImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        clientId={clientId}
        subjects={subjects}
        onImported={load}
      />
    </div>
  )
}
