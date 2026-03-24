import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit2, Save, X, Phone, Mail, MapPin, User, Calendar,
  Upload, Download, Trash2, Plus, CheckSquare, Square, AlertTriangle,
  PhoneCall, FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import clsx from 'clsx'
import type { Supplier, PriceList, SupplierCriteria, SupplierCriteriaValue, SupplierRisk, SupplierTask, SupplierCall } from '../types'
import { SUPPLIER_STATUSES, SUPPLIER_CATEGORIES } from '../types'

const TABS = [
  { id: 'info', label: 'Информация', icon: User },
  { id: 'criteria', label: 'Критерии', icon: FileText },
  { id: 'pricelists', label: 'Прайс-листы', icon: Download },
  { id: 'risks', label: 'Риски', icon: AlertTriangle },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare },
  { id: 'calls', label: 'Звонки', icon: PhoneCall },
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
  const [risks, setRisks] = useState<SupplierRisk[]>([])
  const [tasks, setTasks] = useState<SupplierTask[]>([])
  const [calls, setCalls] = useState<SupplierCall[]>([])

  // Modals
  const [riskModal, setRiskModal] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [callModal, setCallModal] = useState(false)
  const [riskText, setRiskText] = useState('')
  const [taskForm, setTaskForm] = useState({ title: '', deadline: '' })
  const [callForm, setCallForm] = useState({ call_date: '', summary: '', result: '' })

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function loadAll() {
    if (!id) return
    const [{ data: s }, { data: pl }, { data: cr }, { data: cv }, { data: ri }, { data: ta }, { data: ca }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', id).single(),
      supabase.from('price_lists').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      supabase.from('supplier_criteria').select('*').order('sort_order'),
      supabase.from('supplier_criteria_values').select('*').eq('supplier_id', id),
      supabase.from('supplier_risks').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      supabase.from('supplier_tasks').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      supabase.from('supplier_calls').select('*').eq('supplier_id', id).order('call_date', { ascending: false }),
    ])
    setSupplier(s as Supplier)
    setForm(s as Supplier)
    setPriceLists((pl ?? []) as PriceList[])
    setCriteria((cr ?? []) as SupplierCriteria[])
    setCriteriaValues((cv ?? []) as SupplierCriteriaValue[])
    setRisks((ri ?? []) as SupplierRisk[])
    setTasks((ta ?? []) as SupplierTask[])
    setCalls((ca ?? []) as SupplierCall[])
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

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    const path = `${id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('price-lists').upload(path, file)
    if (!error) {
      await supabase.from('price_lists').insert({ supplier_id: Number(id), file_name: file.name, file_path: path, file_size: file.size })
      loadAll()
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function downloadFile(pl: PriceList) {
    const { data } = await supabase.storage.from('price-lists').createSignedUrl(pl.file_path, 3600)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = pl.file_name
      a.click()
    }
  }

  async function deleteFile(pl: PriceList) {
    await supabase.storage.from('price-lists').remove([pl.file_path])
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

  async function addRisk() {
    if (!riskText.trim() || !id) return
    const { data } = await supabase.from('supplier_risks').insert({ supplier_id: Number(id), text: riskText }).select().single()
    if (data) setRisks(prev => [data as SupplierRisk, ...prev])
    setRiskText('')
    setRiskModal(false)
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

  async function addCall() {
    if (!callForm.call_date || !id) return
    const { data } = await supabase.from('supplier_calls').insert({ supplier_id: Number(id), ...callForm, summary: callForm.summary || null, result: callForm.result || null }).select().single()
    if (data) setCalls(prev => [data as SupplierCall, ...prev])
    setCallForm({ call_date: '', summary: '', result: '' })
    setCallModal(false)
  }

  function getCriteriaValue(criteriaId: number) {
    return criteriaValues.find(v => v.criteria_id === criteriaId)?.value ?? ''
  }

  function getDisplayValue(criteriaId: number) {
    return criteriaId in draftValues ? draftValues[criteriaId] : getCriteriaValue(criteriaId)
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
                        <span className="bg-navy-600 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{c.field_type}</span>
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
                          {getCriteriaValue(c.id) || <span className="text-slate-600 italic">Не заполнено</span>}
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
                <div>
                  <input type="file" ref={fileRef} onChange={uploadFile} className="hidden" accept=".pdf,.xls,.xlsx,.doc,.docx,.csv,.zip" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 btn-secondary text-sm"
                  >
                    {uploading
                      ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                      : <Upload size={14} />}
                    Загрузить прайс-лист
                  </button>
                </div>
              )}
              {priceLists.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  Прайс-листы не загружены
                </div>
              ) : (
                <div className="space-y-2">
                  {priceLists.map(pl => (
                    <div key={pl.id} className="flex items-center gap-4 p-3.5 bg-navy-700/50 rounded-xl border border-white/[0.05] hover:border-white/10 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{pl.file_name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(pl.file_size)} · {format(new Date(pl.created_at), 'd MMM yyyy', { locale: ru })}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => downloadFile(pl)} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all" title="Скачать">
                          <Download size={14} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => deleteFile(pl)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Удалить">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RISKS */}
          {tab === 'risks' && (
            <div className="space-y-4">
              {isAdmin && (
                <button onClick={() => setRiskModal(true)} className="flex items-center gap-2 btn-secondary text-sm">
                  <Plus size={14} /> Добавить риск
                </button>
              )}
              {risks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" /> Рисков нет
                </div>
              ) : (
                risks.map(r => (
                  <div key={r.id} className="flex gap-3 p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{r.text}</p>
                      <p className="text-xs text-slate-600 mt-1">{format(new Date(r.created_at), 'd MMM yyyy', { locale: ru })}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={async () => { await supabase.from('supplier_risks').delete().eq('id', r.id); setRisks(p => p.filter(x => x.id !== r.id)) }} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
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

          {/* CALLS */}
          {tab === 'calls' && (
            <div className="space-y-4">
              {isAdmin && (
                <button onClick={() => setCallModal(true)} className="flex items-center gap-2 btn-secondary text-sm">
                  <Plus size={14} /> Добавить звонок
                </button>
              )}
              {calls.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <PhoneCall size={32} className="mx-auto mb-2 opacity-30" /> Звонков нет
                </div>
              ) : (
                calls.map(c => (
                  <div key={c.id} className="p-4 bg-navy-700/50 border border-white/[0.05] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cyan-400 flex items-center gap-1.5"><PhoneCall size={12} /> {format(new Date(c.call_date), 'd MMM yyyy HH:mm', { locale: ru })}</span>
                      {isAdmin && (
                        <button onClick={async () => { await supabase.from('supplier_calls').delete().eq('id', c.id); setCalls(p => p.filter(x => x.id !== c.id)) }} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    {c.summary && <p className="text-sm text-slate-300">{c.summary}</p>}
                    {c.result && <p className="text-xs text-slate-500 bg-navy-600/50 rounded-lg px-3 py-1.5">Результат: {c.result}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Risk modal */}
      <Modal open={riskModal} onClose={() => setRiskModal(false)} title="Добавить риск" maxWidth="max-w-md">
        <textarea value={riskText} onChange={e => setRiskText(e.target.value)} placeholder="Описание риска..." rows={4} className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none mb-4" />
        <div className="flex gap-3">
          <button onClick={() => setRiskModal(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={addRisk} disabled={!riskText.trim()} className="flex-1 btn-primary text-sm">Добавить</button>
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

      {/* Call modal */}
      <Modal open={callModal} onClose={() => setCallModal(false)} title="Добавить звонок" maxWidth="max-w-md">
        <div className="space-y-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Дата и время *</label>
            <input type="datetime-local" value={callForm.call_date} onChange={e => setCallForm(f => ({ ...f, call_date: e.target.value }))} className="bg-navy-700 border border-navy-500 text-white px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <textarea value={callForm.summary} onChange={e => setCallForm(f => ({ ...f, summary: e.target.value }))} placeholder="Краткое описание разговора..." rows={3} className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:border-primary-500 outline-none transition-all text-sm resize-none" />
          <input value={callForm.result} onChange={e => setCallForm(f => ({ ...f, result: e.target.value }))} placeholder="Результат звонка" className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setCallModal(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={addCall} disabled={!callForm.call_date} className="flex-1 btn-primary text-sm">Добавить</button>
        </div>
      </Modal>
    </div>
  )
}
