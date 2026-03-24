import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, TrendingUp } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'
import type { AcademicGrade, AcademicSubject } from '../../../types/academic'
import { GRADE_STATUSES } from '../../../types/academic'
import clsx from 'clsx'

interface Props { clientId: number; subjects: AcademicSubject[]; isAdmin: boolean; onSubjectsChange: () => void }

const emptyForm = { subject_id: '', kt1: '', kt2: '', kt3: '', accumulated: '', exam: '', grade_status: 'upcoming' as AcademicGrade['grade_status'] }

export default function GradesTab({ clientId, subjects, isAdmin, onSubjectsChange }: Props) {
  const [grades, setGrades] = useState<AcademicGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicGrade | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [subjectModal, setSubjectModal] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [subjectSaving, setSubjectSaving] = useState(false)
  const [deleteSubjectId, setDeleteSubjectId] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('academic_grades').select('*').eq('client_id', clientId)
    setGrades((data ?? []) as AcademicGrade[])
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(g: AcademicGrade) {
    setEditing(g)
    setForm({
      subject_id: String(g.subject_id),
      kt1: g.kt1 != null ? String(g.kt1) : '',
      kt2: g.kt2 != null ? String(g.kt2) : '',
      kt3: g.kt3 != null ? String(g.kt3) : '',
      accumulated: g.accumulated != null ? String(g.accumulated) : '',
      exam: g.exam != null ? String(g.exam) : '',
      grade_status: g.grade_status,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      subject_id: parseInt(form.subject_id),
      kt1: form.kt1 ? parseFloat(form.kt1) : null,
      kt2: form.kt2 ? parseFloat(form.kt2) : null,
      kt3: form.kt3 ? parseFloat(form.kt3) : null,
      accumulated: form.accumulated ? parseFloat(form.accumulated) : null,
      exam: form.exam ? parseFloat(form.exam) : null,
      grade_status: form.grade_status,
    }
    if (editing) {
      await supabase.from('academic_grades').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('academic_grades').upsert(payload, { onConflict: 'client_id,subject_id' })
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDeleteGrade(id: number) {
    await supabase.from('academic_grades').delete().eq('id', id)
    setGrades(prev => prev.filter(g => g.id !== id))
  }

  async function addSubject() {
    if (!newSubjectName.trim()) return
    setSubjectSaving(true)
    await supabase.from('academic_subjects').insert({ client_id: clientId, name: newSubjectName.trim() })
    setNewSubjectName('')
    setSubjectSaving(false)
    onSubjectsChange()
  }

  async function deleteSubject(id: number) {
    await supabase.from('academic_subjects').delete().eq('id', id)
    setDeleteSubjectId(null)
    onSubjectsChange()
    load()
  }

  const gradeForSubject = (subjectId: number) => grades.find(g => g.subject_id === subjectId)
  const gradeInfo = (s: string) => GRADE_STATUSES.find(x => x.value === s) ?? GRADE_STATUSES[3]

  const numCell = (val: number | null) => (
    <span className={clsx('text-sm font-mono', val != null ? 'text-white' : 'text-slate-600')}>
      {val != null ? val : '—'}
    </span>
  )

  const availableSubjects = subjects.filter(s => !grades.find(g => g.subject_id === s.id) || editing)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{subjects.length} предметов · {grades.length} с оценками</p>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setSubjectModal(true)}
              className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-navy-500 transition-all">
              <Plus size={13} /> Управление предметами
            </button>
            <button onClick={openAdd} disabled={availableSubjects.length === 0}
              className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-glow transition-all disabled:opacity-40">
              <Plus size={13} /> Добавить оценки
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-white/[0.06] p-4">
              <div className="h-4 w-48 rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="glass rounded-xl border border-white/[0.06] py-12 flex flex-col items-center text-center">
          <TrendingUp size={28} className="text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">Предметы не добавлены</p>
          {isAdmin && <button onClick={() => setSubjectModal(true)} className="mt-3 btn-primary text-xs">Добавить предметы</button>}
        </div>
      ) : (
        <div className="glass rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Предмет</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">КТ1</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">КТ2</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">КТ3</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Накоп.</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Экзамен</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                  {isAdmin && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => {
                  const g = gradeForSubject(s.id)
                  const gi = g ? gradeInfo(g.grade_status) : gradeInfo('upcoming')
                  return (
                    <tr key={s.id} className={clsx('border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors', i % 2 === 0 ? '' : 'bg-white/[0.01]')}>
                      <td className="px-4 py-3 text-sm text-white font-medium">{s.name}</td>
                      <td className="px-3 py-3 text-center">{numCell(g?.kt1 ?? null)}</td>
                      <td className="px-3 py-3 text-center">{numCell(g?.kt2 ?? null)}</td>
                      <td className="px-3 py-3 text-center">{numCell(g?.kt3 ?? null)}</td>
                      <td className="px-3 py-3 text-center">{numCell(g?.accumulated ?? null)}</td>
                      <td className="px-3 py-3 text-center">{numCell(g?.exam ?? null)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={clsx('text-xs px-2 py-1 rounded-lg', gi.bg, gi.color)}>{gi.label}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3">
                          <div className="flex gap-1 justify-end">
                            {g ? (
                              <>
                                <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => { setForm({ ...emptyForm, subject_id: String(s.id) }); setEditing(null); setModalOpen(true) }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-primary-400 hover:bg-primary-500/10 transition-all">
                                <Plus size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать оценки' : 'Добавить оценки'} maxWidth="max-w-sm">
        <div className="space-y-3">
          {!editing && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Предмет *</label>
              <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm">
                <option value="">— выберите —</option>
                {subjects.filter(s => !grades.find(g => g.subject_id === s.id)).map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[['КТ1', 'kt1'], ['КТ2', 'kt2'], ['КТ3', 'kt3']].map(([lbl, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{lbl}</label>
                <input type="number" step="0.1" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="—"
                  className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl focus:border-primary-500 outline-none transition-all text-sm text-center" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Накоп. балл</label>
              <input type="number" step="0.1" value={form.accumulated} onChange={e => setForm(f => ({ ...f, accumulated: e.target.value }))} placeholder="—"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl focus:border-primary-500 outline-none transition-all text-sm text-center" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Экзамен</label>
              <input type="number" step="0.1" value={form.exam} onChange={e => setForm(f => ({ ...f, exam: e.target.value }))} placeholder="—"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl focus:border-primary-500 outline-none transition-all text-sm text-center" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Статус</label>
            <div className="grid grid-cols-2 gap-2">
              {GRADE_STATUSES.map(gs => (
                <button key={gs.value} onClick={() => setForm(f => ({ ...f, grade_status: gs.value as AcademicGrade['grade_status'] }))}
                  className={clsx('text-xs py-2 px-3 rounded-xl border transition-all',
                    form.grade_status === gs.value ? 'border-primary-500/50 bg-primary-600/20 text-primary-300' : 'border-navy-500 bg-navy-700 text-slate-400 hover:border-navy-400')}>
                  {gs.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.subject_id || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Сохранить
            </button>
          </div>
        </div>
      </Modal>

      {/* Subject management modal */}
      <Modal open={subjectModal} onClose={() => setSubjectModal(false)} title="Управление предметами" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubject()}
              placeholder="Название предмета"
              className="flex-1 bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            <button onClick={addSubject} disabled={!newSubjectName.trim() || subjectSaving}
              className="btn-primary text-sm px-4">
              {subjectSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={15} />}
            </button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {subjects.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Предметов нет</p>}
            {subjects.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-navy-700/50 rounded-lg">
                <span className="text-sm text-white">{s.name}</span>
                <button onClick={() => setDeleteSubjectId(s.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={deleteSubjectId !== null} onClose={() => setDeleteSubjectId(null)} title="Удалить предмет?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">Все оценки по этому предмету также будут удалены.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteSubjectId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteSubjectId && deleteSubject(deleteSubjectId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}
