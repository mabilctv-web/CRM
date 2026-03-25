import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit2, Save, X, Phone, Mail, MapPin, User, Calendar,
  ExternalLink, Trash2, Plus, CheckSquare, Square,
  FileText, Link,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import clsx from 'clsx'
import type { Supplier, PriceList, SupplierCriteria, SupplierCriteriaValue, SupplierTask } from '../types'
import { SUPPLIER_STATUSES, SUPPLIER_CATEGORIES } from '../types'

const TABS = [
  { id: 'info', label: 'Информация', icon: User },
  { id: 'criteria', label: 'Критерии', icon: FileText },
  { id: 'pricelists', label: 'Прайс-листы', icon: Link },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare },
]

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Supplier>>({})
  const [saving, setSaving] = useState(false)

  // Related data
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [criteria, setCriteria] = useState<SupplierCriteria[]>([])
  const [criteriaValues, setCriteriaValues] = useState<SupplierCriteriaValue[]>([])
  // Local drafts for text/number/date inputs — avoids DB write on every keystroke
  const [draftValues, setDraftValues] = useState<Record<number, string>>({})
  const [tasks, setTasks] = useState<SupplierTask[]>([])

  // Modals
  const [taskModal, setTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', deadline: '' })

  const [linkModal, setLinkModal] = useState(false)
  const [linkForm, setLinkForm] = useState({ file_name: '', url: '' })

  async function loadAll() {
    if (!id) return
    const [{ data: s }, { data: pl }, { data: cr }, { data: cv }, { data: ta }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('price_lists').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      supabase.from('supplier_criteria').select('*').order('sort_order'),
      supabase.from('supplier_criteria_values').select('*').eq('supplier_id', id),
      supabase.from('supplier_tasks').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
    ])
    setSupplier(s as Supplier)
    setForm(s as Supplier)
    setPriceLists((pl ?? []) as PriceList[])
    setCriteria((cr ?? []) as SupplierCriteria[])
    setCriteriaValues((cv ?? []) as SupplierCriteriaValue[])
    setTasks((ta ?? []) as SupplierTask[])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  async function handleSave() {
    if (!id || !supplier) return
    setSaving(true)
    await supabase.from('suppliers').update({ ...form, updated_at: new Date().toISOString() }).eq('id', id)
    setSupplier({ ...supplier, ...form } as Supplier)
    setEditing(false)
    setSaving(false)
  }

  async function addLink() {
    if (!linkForm.url.trim() || !id) return
    const { data } = await supabase.from('price_lists').insert({
      supplier_id: Number(id),
      file_name: linkForm.file_name.trim() || linkForm.url,
      url: linkForm.url.trim(),
    }).select().single()
    if (data) setPriceLists(prev => [data as PriceList, ...prev])
    setLinkForm({ file_name: '', url: '' })
    setLinkModal(false)
  }

  async function deleteLink(pl: PriceList) {
    await supabase.from('price_lists').delete().eq('id', pl.id)
    setPriceLists(prev => prev.filter(x => x.id !== pl.id))
  }

  async function saveCriteriaValue(criteriaId: number, value: string) {
    const existing = criteriaValues.find(v => v.criteria_id === criteriaId && v.supplier_id === Number(id))
    if (existing) {
      await supabase.from('supplier_criteria_values').update({ value }).eq('id', existing.id)
      setCriteriaValues(prev => prev.map(x => x.id === existing.id ? { ...x, value } : x))
    } else {
      const { data } = await supabase.from('supplier_criteria_values').insert({ supplier_id: Number(id), criteria_id: criteriaId, value }).select().single()
      if (data) setCriteriaValues(prev => [...prev, data as SupplierCriteriaValue])
    }
  }

  async function addTask() {
    if (!taskForm.title.trim() || !id) return
    const { data } = await supabase.from('supplier_tasks').insert({ supplier_id: Number(id), ...taskForm, deadline: taskForm.deadline || null }).select().single()
    if (data) setTasks(prev => [data as SupplierTask, ...prev])
    setTaskForm({ title: '', deadline: '' })
    setTaskModal(false)
  }

  async function toggleTask(t: SupplierTask) {
    await supabase.from('supplier_tasks').update({ done: !t.done }).eq('id', t.id)
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !t.done } : x))
  }

  function getCriteriaValue(criteriaId: number) {
    return criteriaValues.find(v => v.criteria_id === criteriaId)?.value ?? ''
  }

  function getDisplayValue(criteriaId: number) {
    return criteriaId in draftValues ? draftValues[criteriaId] : getCriteriaValue(criteriaId)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded-lg shimmer-bg" />
        <div className="glass rounded-2xl p-8 border border-white/[0.06] space-y-4">
          <div className="h-8 w-64 rounded-lg shimmer-bg" />
          <div className="h-5 w-32 rounded shimmer-bg" />
        </div>
      </div>
    )
  }

  if (!supplier) return <div className="text-slate-400 text-center py-20">Поставщик не найден</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/suppliers')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Назад к списку
      </button>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-primary-600 via-cyan-500 to-transparent" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600/30 to-cyan-600/20 flex items-center justify-center text-2xl font-bold text-primary-300 border border-primary-500/20">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
              <div>
                {editing ? (
                  <input
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-navy-700 border border-primary-500/50 text-white text-xl font-bold px-3 py-1 rounded-xl outline-none"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-white">{supplier.name}</h1>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={supplier.status} size="md" />
                  {supplier.category && (
                    <span className="text-xs px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">{supplier.category}</span>
                  )}
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm flex items-center gap-1.5"><X size={14} /> Отмена</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
                      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />} Сохранить
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm flex items-center gap-1.5"><Edit2 size={14} /> Редактировать</button>
                )}
              </div>
            )}
          </div>

          {editing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Категория</label>
                <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-navy-700 border border-navy-500 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500">
                  <option value="">— Выберите —</option>
                  {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Статус</label>
                <select value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-navy-700 border border-navy-500 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500">
                  {SUPPLIER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl border border-white/[0.06] overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 relative',
              tab === tid ? 'text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {tab === tid && (
              <motion.div layoutId="tabBg" className="absolute inset-0 bg-primary-600/30 rounded-lg border border-primary-500/30" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />
            )}
            <Icon size={13} className="relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="glass rounded-2xl border border-white/[0.06] p-6"
        >
          {/* INFO */}
          {tab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: 'Контактное лицо', field: 'contact_person', icon: User, placeholder: 'Иван Иванов' },
                { label: 'Телефон', field: 'phone', icon: Phone, placeholder: '+7 999 000-00-00' },
                { label: 'Email', field: 'email', icon: Mail, placeholder: 'info@company.ru', type: 'email' },
                { label: 'Адрес', field: 'address', icon: MapPin, placeholder: 'г. Москва, ул. ...', colSpan: true },
              ].map(({ label, field, icon: Icon, placeholder, type, colSpan }) => (
                <div key={field} className={clsx(colSpan && 'sm:col-span-2')}>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <Icon size={12} /> {label}
                  </label>
                  {editing ? (
                    <input
                      type={type ?? 'text'}
                      value={(form as Record<string, string>)[field] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                    />
                  ) : (
                    <p className="text-sm text-white">
                      {(supplier as unknown as Record<string, string>)[field] || <span className="text-slate-600 italic">Не указано</span>}
                    </p>
                  )}
                </div>
              ))}
              <div className="sm:col-span-2 pt-4 border-t border-white/[0.06] flex gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> Создан: {format(new Date(supplier.created_at), 'd MMM yyyy', { locale: ru })}</span>
                <span className="flex items-center gap-1.5"><Calendar size={12} /> Обновлён: {format(new Date(supplier.updated_at), 'd MMM yyyy', { locale: ru })}</span>
              </div>
            </div>
          )}

          {/* CRITERIA */}
          {tab === 'criteria' && (
            <div className="space-y-4">
              {criteria.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  Критерии не добавлены. <br />
                  {isAdmin && <span>Перейдите в <a href="/admin/criteria" className="text-primary-400 hover:underline">управление критериями</a>.</span>}
                </div>
              ) : (
                criteria.map(c => (
                  <div key={c.id} className="flex items-start gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
                        {c.name}
                        {c.required && <span className="text-red-400">*</span>}
                      </label>
                      {isAdmin ? (
                        c.field_type === 'boolean' ? (
                          <select
                            value={getCriteriaValue(c.id)}
                            onChange={e => saveCriteriaValue(c.id, e.target.value)}
                            className="bg-navy-700 border border-navy-500 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500 min-w-[120px]"
                          >
                            <option value="">—</option>
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </select>
                        ) : c.field_type === 'select' && c.options ? (
                          <select
                            value={getCriteriaValue(c.id)}
                            onChange={e => saveCriteriaValue(c.id, e.target.value)}
                            className="bg-navy-700 border border-navy-500 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500 min-w-[160px]"
                          >
                            <option value="">—</option>
                            {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={c.field_type === 'number' ? 'number' : c.field_type === 'date' ? 'date' : 'text'}
                            value={getDisplayValue(c.id)}
                            onChange={e => setDraftValues(d => ({ ...d, [c.id]: e.target.value }))}
                            onBlur={e => {
                              const val = e.target.value
                              saveCriteriaValue(c.id, val)
                              setDraftValues(d => { const n = { ...d }; delete n[c.id]; return n })
                            }}
                            className="bg-navy-700 border border-navy-500 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500 min-w-[200px]"
                          />
                        )
                      ) : (
                        <p className="text-sm text-white">
                          {c.field_type === 'boolean'
                            ? getCriteriaValue(c.id) === 'true' ? <span className="text-emerald-400 font-medium">Да</span>
                              : getCriteriaValue(c.id) === 'false' ? <span className="text-red-400 font-medium">Нет</span>
                              : <span className="text-slate-600 italic">Не заполнено</span>
                            : getCriteriaValue(c.id) || <span className="text-slate-600 italic">Не заполнено</span>}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PRICE LISTS */}
          {tab === 'pricelists' && (
            <div className="space-y-4">
              {isAdmin && (
                <button onClick={() => setLinkModal(true)} className="flex items-center gap-2 btn-secondary text-sm">
                  <Plus size={14} /> Добавить ссылку
                </button>
              )}
              {priceLists.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  Прайс-листы не добавлены
                </div>
              ) : (
                <div className="space-y-2">
                  {priceLists.map(pl => (
                    <div key={pl.id} className="flex items-center gap-4 p-3.5 bg-navy-700/50 rounded-xl border border-white/[0.05] hover:border-primary-500/30 transition-all group">
                      <div className="w-9 h-9 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                        <Link size={16} className="text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {pl.url ? (
                          <a href={pl.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-400 hover:text-primary-300 truncate flex items-center gap-1.5 transition-colors">
                            {pl.file_name}
                            <ExternalLink size={12} className="flex-shrink-0 opacity-60" />
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-white truncate">{pl.file_name}</p>
                        )}
                        <p className="text-xs text-slate-600 truncate mt-0.5">{pl.url}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => deleteLink(pl)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TASKS */}
          {tab === 'tasks' && (
            <div className="space-y-4">
              {isAdmin && (
                <button onClick={() => setTaskModal(true)} className="flex items-center gap-2 btn-secondary text-sm">
                  <Plus size={14} /> Добавить задачу
                </button>
              )}
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <CheckSquare size={32} className="mx-auto mb-2 opacity-30" /> Задач нет
                </div>
              ) : (
                tasks.map(t => (
                  <div key={t.id} className={clsx('flex items-start gap-3 p-4 rounded-xl border transition-all', t.done ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-navy-700/50 border-white/[0.05]')}>
                    <button onClick={() => toggleTask(t)} className="mt-0.5 flex-shrink-0">
                      {t.done ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} className="text-slate-500 hover:text-slate-300" />}
                    </button>
                    <div className="flex-1">
                      <p className={clsx('text-sm', t.done ? 'text-slate-500 line-through' : 'text-slate-200')}>{t.title}</p>
                      {t.deadline && <p className="text-xs text-slate-600 mt-0.5">Срок: {format(new Date(t.deadline), 'd MMM yyyy', { locale: ru })}</p>}
                    </div>
                    {isAdmin && (
                      <button onClick={async () => { await supabase.from('supplier_tasks').delete().eq('id', t.id); setTasks(p => p.filter(x => x.id !== t.id)) }} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Link modal */}
      <Modal open={linkModal} onClose={() => { setLinkModal(false); setLinkForm({ file_name: '', url: '' }) }} title="Добавить прайс-лист" maxWidth="max-w-md">
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Название</label>
            <input value={linkForm.file_name} onChange={e => setLinkForm(f => ({ ...f, file_name: e.target.value }))} placeholder="напр. Прайс март 2026" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Ссылка *</label>
            <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} placeholder="https://disk.yandex.ru/d/..." className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2 rounded-xl text-sm outline-none focus:border-primary-500 transition-all" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={addLink} disabled={!linkForm.url.trim()} className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-50">Сохранить</button>
          <button onClick={() => { setLinkModal(false); setLinkForm({ file_name: '', url: '' }) }} className="flex-1 btn-secondary text-sm py-2.5">Отмена</button>
        </div>
      </Modal>

      {/* Task modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Добавить задачу" maxWidth="max-w-md">
        <div className="space-y-4 mb-4">
          <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Название задачи" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Срок выполнения</label>
            <input type="date" value={taskForm.deadline} onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))} className="bg-navy-700 border border-navy-500 text-white px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setTaskModal(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={addTask} disabled={!taskForm.title.trim()} className="flex-1 btn-primary text-sm">Добавить</button>
        </div>
      </Modal>

    </div>
  )
}
