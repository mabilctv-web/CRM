import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Clock, CheckCircle2, AlertCircle, Circle, Calendar, Paperclip, Upload, X, Download, FileText } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'
import type { AcademicAssignment, AcademicSubject } from '../../../types/academic'
import { ASSIGNMENT_TYPES, ASSIGNMENT_STATUSES } from '../../../types/academic'
import { format, differenceInDays, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

interface AssignmentFile {
  id: number
  assignment_id: number
  file_name: string
  file_path: string
  file_size: number | null
  created_at: string
}

const emptyForm = {
  subject_id: '', name: '', type: 'Практика', deadline: '',
  platform: '', status: 'queue' as AcademicAssignment['status'],
  completed_at: '', comment: '', price: '',
}

interface Props { clientId: number; subjects: AcademicSubject[]; isAdmin: boolean }

export default function AssignmentsTab({ clientId, subjects, isAdmin }: Props) {
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([])
  const [files, setFiles] = useState<Record<number, AssignmentFile[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicAssignment | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingForId = useRef<number | null>(null)

  async function load() {
    const { data } = await supabase.from('academic_assignments').select('*')
      .eq('client_id', clientId).order('deadline', { ascending: true, nullsFirst: false })
    const list = (data ?? []) as AcademicAssignment[]
    setAssignments(list)

    if (list.length > 0) {
      const ids = list.map(a => a.id)
      const { data: fileData } = await supabase
        .from('academic_assignment_files')
        .select('*')
        .in('assignment_id', ids)
      const map: Record<number, AssignmentFile[]> = {}
      for (const f of (fileData ?? []) as AssignmentFile[]) {
        if (!map[f.assignment_id]) map[f.assignment_id] = []
        map[f.assignment_id].push(f)
      }
      setFiles(map)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(a: AcademicAssignment) {
    setEditing(a)
    setForm({
      subject_id: a.subject_id ? String(a.subject_id) : '',
      name: a.name, type: a.type,
      deadline: a.deadline ?? '', platform: a.platform ?? '',
      status: a.status, completed_at: a.completed_at ?? '',
      comment: a.comment ?? '', price: a.price != null ? String(a.price) : '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      subject_id: form.subject_id ? parseInt(form.subject_id) : null,
      name: form.name.trim(), type: form.type,
      deadline: form.deadline || null, platform: form.platform.trim() || null,
      status: form.status, completed_at: form.completed_at || null,
      comment: form.comment.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
    }
    if (editing) {
      await supabase.from('academic_assignments').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('academic_assignments').insert(payload)
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(id: number) {
    // Delete files from storage first
    const assignmentFiles = files[id] ?? []
    for (const f of assignmentFiles) {
      await supabase.storage.from('assignment-files').remove([f.file_path])
    }
    await supabase.from('academic_assignments').delete().eq('id', id)
    setDeleteId(null)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  function triggerUpload(assignmentId: number) {
    uploadingForId.current = assignmentId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const assignmentId = uploadingForId.current
    if (!file || !assignmentId) return
    e.target.value = ''

    setUploading(assignmentId)
    const ext = file.name.split('.').pop()
    const path = `${assignmentId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('assignment-files')
      .upload(path, file, { upsert: false })

    if (!uploadError) {
      await supabase.from('academic_assignment_files').insert({
        assignment_id: assignmentId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
      })
      // Refresh files for this assignment
      const { data } = await supabase
        .from('academic_assignment_files')
        .select('*')
        .eq('assignment_id', assignmentId)
      setFiles(prev => ({ ...prev, [assignmentId]: (data ?? []) as AssignmentFile[] }))
    }
    setUploading(null)
  }

  async function handleDeleteFile(f: AssignmentFile) {
    await supabase.storage.from('assignment-files').remove([f.file_path])
    await supabase.from('academic_assignment_files').delete().eq('id', f.id)
    setFiles(prev => ({
      ...prev,
      [f.assignment_id]: (prev[f.assignment_id] ?? []).filter(x => x.id !== f.id),
    }))
  }

  function getDownloadUrl(path: string) {
    const { data } = supabase.storage.from('assignment-files').getPublicUrl(path)
    return data.publicUrl
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function getEffectiveStatus(a: AcademicAssignment): string {
    if (a.status === 'done') return 'done'
    if (a.deadline && isPast(parseISO(a.deadline))) return 'overdue'
    return a.status
  }

  function getDeadlineInfo(deadline: string | null) {
    if (!deadline) return null
    const days = differenceInDays(parseISO(deadline), new Date())
    if (days < 0) return { text: `Просрочено на ${Math.abs(days)} дн.`, color: 'text-red-400' }
    if (days === 0) return { text: 'Сегодня!', color: 'text-red-400' }
    if (days <= 3) return { text: `Через ${days} дн.`, color: 'text-orange-400' }
    if (days <= 7) return { text: `Через ${days} дн.`, color: 'text-amber-400' }
    return { text: format(parseISO(deadline), 'd MMM yyyy', { locale: ru }), color: 'text-slate-400' }
  }

  const statusInfo = (s: string) => ASSIGNMENT_STATUSES.find(x => x.value === s) ?? ASSIGNMENT_STATUSES[0]
  const subjectName = (id: number | null) => subjects.find(s => s.id === id)?.name ?? null

  const filtered = assignments.filter(a => {
    const eff = getEffectiveStatus(a)
    if (filter !== 'all' && eff !== filter) return false
    if (subjectFilter !== 'all' && String(a.subject_id) !== subjectFilter) return false
    return true
  })

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'done') return <CheckCircle2 size={15} className="text-emerald-400" />
    if (status === 'in_progress') return <Clock size={15} className="text-blue-400" />
    if (status === 'overdue') return <AlertCircle size={15} className="text-red-400" />
    return <Circle size={15} className="text-slate-500" />
  }

  const counts = {
    all: assignments.length,
    queue: assignments.filter(a => getEffectiveStatus(a) === 'queue').length,
    in_progress: assignments.filter(a => getEffectiveStatus(a) === 'in_progress').length,
    done: assignments.filter(a => getEffectiveStatus(a) === 'done').length,
    overdue: assignments.filter(a => getEffectiveStatus(a) === 'overdue').length,
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'Все', count: counts.all },
            { key: 'queue', label: 'В очереди', count: counts.queue },
            { key: 'in_progress', label: 'В работе', count: counts.in_progress },
            { key: 'done', label: 'Выполнено', count: counts.done },
            { key: 'overdue', label: 'Просрочено', count: counts.overdue },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === key ? 'bg-primary-600/25 text-primary-300 border border-primary-500/30' : 'bg-navy-700 text-slate-400 hover:text-slate-200 border border-transparent')}>
              {label} {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          ))}
        </div>
        {subjects.length > 0 && (
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="bg-navy-700 border border-navy-500 text-slate-300 text-xs px-3 py-1.5 rounded-lg outline-none focus:border-primary-500 transition-all">
            <option value="all">Все предметы</option>
            {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        )}
        {isAdmin && (
          <button onClick={openAdd}
            className="ml-auto flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-glow transition-all">
            <Plus size={13} /> Добавить задание
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-white/[0.06] p-4 space-y-2">
              <div className="h-4 w-48 rounded shimmer-bg" />
              <div className="h-3 w-32 rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl border border-white/[0.06] py-12 flex flex-col items-center text-center">
          <CheckCircle2 size={28} className="text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">Заданий не найдено</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((a, i) => {
              const eff = getEffectiveStatus(a)
              const si = statusInfo(eff)
              const dl = getDeadlineInfo(a.deadline)
              const sname = subjectName(a.subject_id)
              const aFiles = files[a.id] ?? []
              const isUploadingThis = uploading === a.id
              return (
                <motion.div key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.03 }}
                  className={clsx('glass rounded-xl border p-4 group transition-all duration-200',
                    eff === 'done' ? 'border-emerald-500/15' :
                    eff === 'overdue' ? 'border-red-500/20' :
                    eff === 'in_progress' ? 'border-blue-500/15' : 'border-white/[0.06]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0"><StatusIcon status={eff} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={clsx('text-sm font-semibold', eff === 'done' ? 'text-slate-400 line-through' : 'text-white')}>{a.name}</span>
                        <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-md', si.color, si.border, 'border')}>{si.label}</span>
                        {a.price && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">{Number(a.price).toLocaleString('ru')} ₽</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
                        {sname && <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-md border border-violet-500/20 text-[10px]">{sname}</span>}
                        <span className="px-2 py-0.5 bg-navy-600 rounded-md text-[10px]">{a.type}</span>
                        {a.platform && <span>{a.platform}</span>}
                        {dl && eff !== 'done' && (
                          <span className={clsx('flex items-center gap-1', dl.color)}>
                            <Calendar size={10} /> {dl.text}
                          </span>
                        )}
                        {a.completed_at && (
                          <span className="text-emerald-500">
                            ✓ {format(parseISO(a.completed_at), 'd MMM', { locale: ru })}
                          </span>
                        )}
                      </div>
                      {a.comment && <p className="mt-1.5 text-xs text-slate-500 italic">{a.comment}</p>}
                      <p className="mt-1 text-[10px] text-slate-600">
                        Добавлено {format(parseISO(a.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </p>

                      {/* Files */}
                      {(aFiles.length > 0 || isAdmin) && (
                        <div className="mt-2.5 space-y-1.5">
                          {aFiles.map(f => (
                            <div key={f.id} className="flex items-center gap-2 group/file">
                              <FileText size={11} className="text-slate-500 flex-shrink-0" />
                              <a
                                href={getDownloadUrl(f.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={f.file_name}
                                className="text-xs text-primary-400 hover:text-primary-300 hover:underline truncate transition-colors flex items-center gap-1"
                              >
                                {f.file_name}
                                <Download size={10} className="flex-shrink-0 opacity-60" />
                              </a>
                              {f.file_size && <span className="text-[10px] text-slate-600">{formatSize(f.file_size)}</span>}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteFile(f)}
                                  className="ml-auto opacity-0 group-hover/file:opacity-100 p-0.5 rounded text-slate-600 hover:text-red-400 transition-all"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          {isAdmin && (
                            <button
                              onClick={() => triggerUpload(a.id)}
                              disabled={isUploadingThis}
                              className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-primary-400 transition-colors"
                            >
                              {isUploadingThis
                                ? <div className="w-3 h-3 border border-slate-500 border-t-primary-400 rounded-full animate-spin" />
                                : <Paperclip size={10} />}
                              {isUploadingThis ? 'Загрузка...' : 'Прикрепить файл'}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Show attach button for non-admin if no files */}
                      {!isAdmin && aFiles.length === 0 && null}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать задание' : 'Новое задание'} maxWidth="max-w-lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Название задания *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Практика 1.1"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Предмет</label>
              <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm">
                <option value="">— без предмета —</option>
                {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Тип</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm">
                {ASSIGNMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Дедлайн</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Платформа / способ</label>
              <input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="Moodle"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Статус</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AcademicAssignment['status'] }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm">
                {ASSIGNMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Дата выполнения</label>
              <input type="date" value={form.completed_at} onChange={e => setForm(f => ({ ...f, completed_at: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Стоимость (₽)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Комментарий</label>
              <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} rows={2}
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить задание?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">Задание и все прикреплённые файлы будут удалены безвозвратно.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}
