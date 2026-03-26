import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Plus, X, Edit2, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

interface Status {
  id: number
  value: string
  label: string
  color: string
  created_at: string
}

const COLOR_OPTIONS = [
  { value: 'green',  label: 'Зелёный',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'gray',   label: 'Серый',    cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  { value: 'yellow', label: 'Жёлтый',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'blue',   label: 'Синий',   cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'red',    label: 'Красный', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'violet', label: 'Фиолетовый', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  { value: 'cyan',   label: 'Голубой', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
]

function getColorCls(color: string) {
  return COLOR_OPTIONS.find(c => c.value === color)?.cls ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
}

const empty = { value: '', label: '', color: 'gray' }

export default function SupplierStatuses() {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(empty)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const { data } = await supabase.from('supplier_statuses').select('*').order('label')
    setStatuses((data ?? []) as Status[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const value = form.value.trim().toLowerCase().replace(/\s+/g, '_')
    const label = form.label.trim()
    if (!value || !label) return
    setSaving(true)
    await supabase.from('supplier_statuses').insert({ value, label, color: form.color })
    setForm(empty)
    setSaving(false)
    load()
  }

  function openEdit(s: Status) {
    setEditId(s.id)
    setEditForm({ value: s.value, label: s.label, color: s.color })
  }

  async function handleEdit() {
    if (!editId) return
    setSaving(true)
    await supabase.from('supplier_statuses').update({
      value: editForm.value.trim().toLowerCase().replace(/\s+/g, '_'),
      label: editForm.label.trim(),
      color: editForm.color,
    }).eq('id', editId)
    setEditId(null)
    setSaving(false)
    load()
  }

  async function handleDelete(id: number) {
    setDeleting(true)
    await supabase.from('supplier_statuses').delete().eq('id', id)
    setDeleteId(null)
    setDeleting(false)
    load()
  }

  const inp = 'bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Статусы поставщиков</h1>
        <p className="text-sm text-slate-400 mt-0.5">Управление статусами, которые можно присваивать поставщикам</p>
      </div>

      {/* Add form */}
      <div className="glass rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus size={14} className="text-primary-400" /> Добавить статус
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Название (напр. Активный)"
            className={clsx(inp, 'sm:col-span-1')}
          />
          <input
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            placeholder="Ключ (напр. active)"
            className={inp}
          />
          <select
            value={form.color}
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            className={inp}
          >
            {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {form.label && (
            <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-lg border', getColorCls(form.color))}>
              {form.label}
            </span>
          )}
          <button
            onClick={handleAdd}
            disabled={saving || !form.label.trim() || !form.value.trim()}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Добавить
          </button>
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Текущие статусы ({statuses.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : statuses.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-8">Нет статусов</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence>
              {statuses.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  {editId === s.id ? (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <input
                        value={editForm.label}
                        onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                        className={clsx(inp, 'flex-1 min-w-[120px]')}
                      />
                      <input
                        value={editForm.value}
                        onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))}
                        className={clsx(inp, 'w-28')}
                      />
                      <select
                        value={editForm.color}
                        onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                        className={clsx(inp, 'w-28')}
                      >
                        {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <button onClick={handleEdit} disabled={saving}
                        className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-lg border flex-shrink-0', getColorCls(s.color))}>
                        {s.label}
                      </span>
                      <code className="text-xs text-slate-500 font-mono flex-1">{s.value}</code>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(s)}
                          className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeleteId(s.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <X size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                <p className="text-white text-sm">Удалить этот статус? Поставщики с данным статусом сохранят текущее значение, но статус нельзя будет назначить повторно.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm">Отмена</button>
                <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60">
                  {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Удалить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
