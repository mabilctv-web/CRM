import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, TrendingDown, TrendingUp, Wallet, CreditCard, Copy, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'
import type { AcademicFinance, PaymentContact } from '../../../types/academic'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

const emptyForm = { finance_date: '', description: '', debt: '', income: '', comment: '' }

interface Props { clientId: number; isAdmin: boolean }

export default function FinancesTab({ clientId, isAdmin }: Props) {
  const [finances, setFinances] = useState<AcademicFinance[]>([])
  const [contacts, setContacts] = useState<PaymentContact[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicFinance | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  async function load() {
    const [fin, con] = await Promise.all([
      supabase.from('academic_finances').select('*').eq('client_id', clientId).order('finance_date', { ascending: false }),
      supabase.from('payment_contacts').select('*').order('sort_order'),
    ])
    setFinances((fin.data ?? []) as AcademicFinance[])
    setContacts((con.data ?? []) as PaymentContact[])
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  function openAdd() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(f: AcademicFinance) {
    setEditing(f)
    setForm({
      finance_date: f.finance_date ?? '',
      description: f.description,
      debt: f.debt ? String(f.debt) : '',
      income: f.income ? String(f.income) : '',
      comment: f.comment ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      finance_date: form.finance_date || null,
      description: form.description.trim(),
      debt: parseFloat(form.debt || '0') || 0,
      income: parseFloat(form.income || '0') || 0,
      comment: form.comment.trim() || null,
    }
    if (editing) {
      await supabase.from('academic_finances').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('academic_finances').insert(payload)
    }
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(id: number) {
    await supabase.from('academic_finances').delete().eq('id', id)
    setDeleteId(null)
    setFinances(prev => prev.filter(f => f.id !== id))
  }

  function copyToClipboard(text: string, id: number) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const totalDebt = finances.reduce((s, f) => s + (Number(f.debt) || 0), 0)
  const totalIncome = finances.reduce((s, f) => s + (Number(f.income) || 0), 0)
  const balance = totalDebt - totalIncome

  const fmt = (n: number) => n.toLocaleString('ru') + ' ₽'

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-xs text-slate-500 font-medium">Начислено</span>
          </div>
          <p className="text-xl font-bold text-red-400">{fmt(totalDebt)}</p>
        </div>
        <div className="glass rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs text-slate-500 font-medium">Оплачено</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{fmt(totalIncome)}</p>
        </div>
        <div className={clsx('glass rounded-xl border p-4',
          balance > 0 ? 'border-amber-500/20 bg-amber-500/5' : balance < 0 ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-white/[0.06]')}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className={balance > 0 ? 'text-amber-400' : balance < 0 ? 'text-cyan-400' : 'text-slate-500'} />
            <span className="text-xs text-slate-500 font-medium">Остаток</span>
          </div>
          <p className={clsx('text-xl font-bold', balance > 0 ? 'text-amber-400' : balance < 0 ? 'text-cyan-400' : 'text-slate-400')}>
            {balance > 0 ? `Долг: ${fmt(balance)}` : balance < 0 ? `Переплата: ${fmt(Math.abs(balance))}` : 'Закрыто'}
          </p>
        </div>
      </div>

      {/* Payment contacts */}
      {contacts.length > 0 && (
        <div className="glass rounded-xl border border-primary-500/20 bg-primary-600/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-primary-400" />
            <span className="text-sm font-semibold text-white">Реквизиты для оплаты</span>
          </div>
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 bg-navy-700/50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary-400">{c.method}</p>
                  <p className="text-sm text-white font-mono">{c.details}</p>
                  {c.comment && <p className="text-xs text-slate-500 mt-0.5">{c.comment}</p>}
                </div>
                <button onClick={() => copyToClipboard(c.details, c.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
                  {copied === c.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">История операций</h3>
          {isAdmin && (
            <button onClick={openAdd}
              className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-glow transition-all">
              <Plus size={13} /> Добавить
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl border border-white/[0.06] p-4">
                <div className="h-4 w-40 rounded shimmer-bg" />
              </div>
            ))}
          </div>
        ) : finances.length === 0 ? (
          <div className="glass rounded-xl border border-white/[0.06] py-10 flex flex-col items-center text-center">
            <Wallet size={24} className="text-slate-600 mb-2" />
            <p className="text-slate-500 text-sm">Операций пока нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {finances.map((f, i) => (
                <motion.div key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.03 }}
                  className="glass rounded-xl border border-white/[0.06] hover:border-white/10 p-4 group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{f.description}</span>
                        {f.finance_date && (
                          <span className="text-xs text-slate-500">
                            {format(parseISO(f.finance_date), 'd MMM yyyy', { locale: ru })}
                          </span>
                        )}
                      </div>
                      {f.comment && <p className="text-xs text-slate-500 mt-0.5">{f.comment}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {Number(f.debt) > 0 && (
                        <span className="text-sm font-semibold text-red-400">−{fmt(Number(f.debt))}</span>
                      )}
                      {Number(f.income) > 0 && (
                        <span className="text-sm font-semibold text-emerald-400">+{fmt(Number(f.income))}</span>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteId(f.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактировать операцию' : 'Новая операция'} maxWidth="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Описание *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Оплата за семестр"
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Дата</label>
            <input type="date" value={form.finance_date} onChange={e => setForm(f => ({ ...f, finance_date: e.target.value }))}
              className="w-full bg-navy-700 border border-navy-500 text-slate-300 px-3 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-red-400 mb-1.5">Начислено (₽)</label>
              <input type="number" value={form.debt} onChange={e => setForm(f => ({ ...f, debt: e.target.value }))} placeholder="0"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl focus:border-red-500 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1.5">Оплачено (₽)</label>
              <input type="number" value={form.income} onChange={e => setForm(f => ({ ...f, income: e.target.value }))} placeholder="0"
                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-3 py-2.5 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Комментарий</label>
            <input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="flex-1 btn-secondary text-sm">Отмена</button>
            <button onClick={handleSave} disabled={!form.description.trim() || saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Удалить операцию?" maxWidth="max-w-sm">
        <div className="flex gap-3 mt-4">
          <button onClick={() => setDeleteId(null)} className="flex-1 btn-secondary text-sm">Отмена</button>
          <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 btn-danger text-sm">Удалить</button>
        </div>
      </Modal>
    </div>
  )
}
