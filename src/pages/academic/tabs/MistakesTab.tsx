import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'
import type { AcademicMistake } from '../../../types/academic'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

const emptyForm = { mistake_date: '', situation: '', what_went_wrong: '', how_resolved: '' }

interface Props { clientId: number; isAdmin: boolean }

export default function MistakesTab({ clientId, isAdmin }: Props) {
  const [mistakes, setMistakes] = useState<AcademicMistake[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicMistake | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('academic_mistakes').select('*')
      .eq('client_id', clientId).order('created_at', { ascending: false })
    setMistakes((data ?? []) as AcademicMistake[])
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(m: AcademicMistake) {
    setEditing(m)
    setForm({
      mistake_date: m.mistake_date ?? '',
      situation: m.situation ?? '',
      what_went_wrong: m.what_went_wrong ?? '',
      how_resolved: m.how_resolved ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      mistake_date: form.mistake_date || null,
      situation: form.situation.trim() || null,
      what_went_wrong: form.what_went_wrong.trim() || null,
      how_resolved: form.how_resolved.trim() || null,
    }
    if (editing) {
      await supabase.from('academic_mistakes').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('academic_mistakes').insert(payload)
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(id: number) {
    await supabase.from('academic_mistakes').delete().eq('id', id)
    setDeleteId(null)
    setMistakes(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <AlertTriangle size={13} className="text-amber-400" />
          {mistakes.length} записей · {mistakes.filter(m => m.how_resolved).length} решено
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-glow transition-all">
            <Plus size={13} /> Добавить запись
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-white/[0.06] p-5 space-y-3">
              <div className="h-4 w-40 rounded shimmer-bg" />
              <div className="h-3 w-full rounded shimmer-bg" />
            </div>
          ))}
        </div>
      ) : mistakes.length === 0 ? (
        <div className="glass rounded-xl border border-white/[0.06] py-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle size={24} className="text-emerald-500" />
          </div>
          <p className="text-slate-400 font-medium">Ошибок не зафиксировано</p>
          <p className="text-slate-600 text-sm mt-1">Отличная работа!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {mistakes.map((m, i) => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.04 }}
                className={clsx(
                  'glass rounded-xl border p-5 group transition-all',
                  m.how_resolved ? 'border-emerald-500/15' : 'border-amber-500/15',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    m.how_resolved ? 'bg-emerald-500/15' : 'bg-amber-500/15')}>
                    {m.how_resolved
                      ? <CheckCircle size={15} className="text-emerald-400" />
                      : <AlertTriangle size={15} className="text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {m.mistake_date && (
                        <span className="text-xs text-slate-500">
                          {format(parseISO(m.mistake_date), 'd MMMM yyyy', { locale: ru })}
                        </span>
                      )}
                      {m.situation && <span className="text-sm font-semibold text-white">{m.situation}</span>}
                    </div>
                    {m.what_went_wrong && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Что пошло не так</p>
                        <p className="text-sm text-slate-300">{m.what_went_wrong}</p>
                      </div>
                    )}
                    {m.how_resolved && (
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5">
                        <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Как решили</p>
                        <p className="text-sm text-slate-300">{m.how_resolved}</p>
                      </div>
                    )}
                    {!m.how_resolved && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md mt-1">
                        <AlertTriangle size={9} /> Ещё не решено
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать ошибку' : 'Зафиксировать ошибку'} maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Дата</label>
              <input type="date" value={form.mistake_date} onChange={e => setForm(f => ({ ...f, mistake_date: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Предмет / ситуация</label>
              <input value={form.situation} onChange={e => setForm(f => ({ ...f, situation: e.target.value }))} placeholder="Где произошло"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Что пошло не так</label>
            <textarea value={form.what_went_wrong} onChange={e => setForm(f => ({ ...f, what_went_wrong: e.target.value }))} rows={3}
              placeholder="Опишите проблему..."
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Как решили / что сделать</label>
            <textarea value={form.how_resolved} onChange={e => setForm(f => ({ ...f, how_resolved: e.target.value }))} rows={3}
              placeholder="Решение или план действий..."
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
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
    </div>
  )
}
