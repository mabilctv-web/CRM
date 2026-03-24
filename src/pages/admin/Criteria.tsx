import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Save, X, ListChecks, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import type { SupplierCriteria } from '../../types'
import clsx from 'clsx'

const FIELD_TYPES = [
  { value: 'text', label: 'Текст', color: 'bg-blue-500/15 text-blue-400' },
  { value: 'number', label: 'Число', color: 'bg-emerald-500/15 text-emerald-400' },
  { value: 'boolean', label: 'Да/Нет', color: 'bg-violet-500/15 text-violet-400' },
  { value: 'date', label: 'Дата', color: 'bg-amber-500/15 text-amber-400' },
  { value: 'select', label: 'Список', color: 'bg-cyan-500/15 text-cyan-400' },
]

const emptyForm = { name: '', field_type: 'text' as SupplierCriteria['field_type'], options: '', required: false }

export default function Criteria() {
  const [criteria, setCriteria] = useState<SupplierCriteria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierCriteria | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase.from('supplier_criteria').select('*').order('sort_order', { ascending: true })
    setCriteria((data ?? []) as SupplierCriteria[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(c: SupplierCriteria) {
    setEditing(c)
    setForm({
      name: c.name,
      field_type: c.field_type,
      options: (c.options ?? []).join('\n'),
      required: c.required,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const optionsArr = form.field_type === 'select' && form.options.trim()
      ? form.options.split('\n').map(o => o.trim()).filter(Boolean)
      : null

    const payload = {
      name: form.name,
      field_type: form.field_type,
      options: optionsArr,
      required: form.required,
      sort_order: editing ? editing.sort_order : criteria.length,
    }

    if (editing) {
      await supabase.from('supplier_criteria').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('supplier_criteria').insert(payload)
    }

    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function handleDelete(id: number) {
    await supabase.from('supplier_criteria').delete().eq('id', id)
    setDeleteId(null)
    setCriteria(prev => prev.filter(c => c.id !== id))
  }

  async function moveUp(index: number) {
    if (index === 0) return
    const arr = [...criteria]
    const item = arr[index]
    arr[index] = arr[index - 1]
    arr[index - 1] = item
    setCriteria(arr)
    await Promise.all([
      supabase.from('supplier_criteria').update({ sort_order: index - 1 }).eq('id', item.id),
      supabase.from('supplier_criteria').update({ sort_order: index }).eq('id', arr[index].id),
    ])
  }

  async function moveDown(index: number) {
    if (index === criteria.length - 1) return
    const arr = [...criteria]
    const item = arr[index]
    arr[index] = arr[index + 1]
    arr[index + 1] = item
    setCriteria(arr)
    await Promise.all([
      supabase.from('supplier_criteria').update({ sort_order: index + 1 }).eq('id', item.id),
      supabase.from('supplier_criteria').update({ sort_order: index }).eq('id', arr[index].id),
    ])
  }

  function getTypeInfo(type: string) {
    return FIELD_TYPES.find(t => t.value === type) ?? FIELD_TYPES[0]
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Критерии поставщиков</h1>
          <p className="text-sm text-slate-400 mt-0.5">Управление полями для оценки поставщиков</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-200 text-sm"
        >
          <Plus size={16} /> Добавить критерий
        </motion.button>
      </div>

      {/* Info banner */}
      <div className="glass rounded-xl border border-primary-500/20 p-4 flex items-start gap-3 bg-primary-600/5">
        <ListChecks size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-400">
          Критерии отображаются в карточке каждого поставщика на вкладке «Критерии». Вы можете задать тип поля, обязательность и список вариантов для выпадающего списка.
        </p>
      </div>

      {/* Criteria list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl border border-white/[0.06] p-5">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg shimmer-bg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded shimmer-bg" />
                  <div className="h-3 w-24 rounded shimmer-bg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : criteria.length === 0 ? (
        <div className="glass rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mb-4">
            <ListChecks size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">Критерии не созданы</p>
          <p className="text-slate-600 text-sm mt-1">Добавьте первый критерий для оценки поставщиков</p>
          <button onClick={openAdd} className="mt-4 btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Добавить критерий
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
          {criteria.map((c, i) => {
            const typeInfo = getTypeInfo(c.field_type)
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.04 }}
                className="glass rounded-2xl border border-white/[0.06] hover:border-white/10 transition-all duration-200 p-5 group"
              >
                <div className="flex items-center gap-4">
                  {/* Order */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      ▲
                    </button>
                    <button onClick={() => moveDown(i)} disabled={i === criteria.length - 1} className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      ▼
                    </button>
                  </div>

                  {/* Index */}
                  <div className="w-8 h-8 rounded-lg bg-navy-600 flex items-center justify-center text-xs font-semibold text-slate-400 flex-shrink-0">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{c.name}</span>
                      {c.required && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-md border border-red-500/20">Обязательный</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-md', typeInfo.color)}>{typeInfo.label}</span>
                      {c.field_type === 'select' && c.options && (
                        <span className="text-[11px] text-slate-500">
                          {c.options.length} вариант{c.options.length !== 1 ? 'а/ов' : ''}
                        </span>
                      )}
                    </div>
                    {c.field_type === 'select' && c.options && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {c.options.map(o => (
                          <span key={o} className="text-[10px] px-2 py-0.5 bg-navy-600 text-slate-400 rounded-md">{o}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать критерий' : 'Новый критерий'} maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Название критерия *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Например: Минимальная партия" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Тип поля</label>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, field_type: t.value as SupplierCriteria['field_type'] }))}
                  className={clsx(
                    'text-xs font-medium py-2 px-3 rounded-xl border transition-all duration-200',
                    form.field_type === t.value
                      ? 'border-primary-500/50 bg-primary-600/20 text-primary-300'
                      : 'border-navy-500 bg-navy-700 text-slate-400 hover:border-navy-400',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.field_type === 'select' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Варианты (каждый с новой строки)</label>
              <textarea
                value={form.options}
                onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                placeholder={"Вариант 1\nВариант 2\nВариант 3"}
                rows={4}
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none"
              />
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, required: !f.required }))}
              className={clsx(
                'w-10 h-6 rounded-full transition-colors duration-200 relative',
                form.required ? 'bg-primary-600' : 'bg-navy-600',
              )}
            >
              <div className={clsx(
                'w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform duration-200',
                form.required ? 'translate-x-5' : 'translate-x-1',
              )} />
            </div>
            <span className="text-sm text-slate-300">Обязательный для заполнения</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editing ? <Save size={14} /> : <Plus size={14} />)}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить критерий?" maxWidth="max-w-sm">
        <p className="text-sm text-slate-400 mb-6">Все значения этого критерия у поставщиков также будут удалены.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}
