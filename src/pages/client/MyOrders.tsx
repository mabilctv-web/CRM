import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, PackageOpen, ChevronRight, LogOut, Key, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Order {
  id: string
  subject: string
  university: string | null
  status: string
  deadline: string | null
  created_at: string
}

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новая', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  in_progress: { label: 'В работе', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  done: { label: 'Выполнена', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Отменена', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

export default function MyOrders() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = searchParams.get('new') === '1'

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [showPassModal, setShowPassModal] = useState(isNew)
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState('')
  const [passDone, setPassDone] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/'); return }
      setEmail(data.user.email ?? '')
    })
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setOrders((data ?? []) as Order[])
      setLoading(false)
    })
  }, [navigate])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPassError('')
    if (newPass !== newPass2) { setPassError('Пароли не совпадают'); return }
    if (newPass.length < 6) { setPassError('Минимум 6 символов'); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassLoading(false)
    if (error) { setPassError(error.message); return }
    setPassDone(true)
    setTimeout(() => setShowPassModal(false), 1500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-navy-900/80 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white">EduWork</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{email}</span>
            <button onClick={() => setShowPassModal(true)} className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
              <Key size={16} />
            </button>
            <button onClick={signOut} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Мои заказы</h1>
              <p className="text-slate-400 text-sm mt-0.5">История ваших заявок</p>
            </div>
            <Link
              to="/order"
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-glow"
            >
              + Новая заявка
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="glass rounded-2xl border border-white/[0.06] p-5 h-20 shimmer-bg" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-2xl border border-white/[0.06] flex flex-col items-center py-16 text-center">
              <PackageOpen size={32} className="text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Заявок пока нет</p>
              <Link to="/order" className="mt-4 text-sm text-primary-400 hover:text-primary-300 transition-colors">Оставить первую заявку →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o, i) => {
                const s = STATUS[o.status] ?? STATUS.new
                return (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      to={`/my/orders/${o.id}`}
                      className="glass rounded-2xl border border-white/[0.06] hover:border-white/10 p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 block"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">{o.subject}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {o.university && <span>{o.university}</span>}
                          {o.deadline && <span>До {format(new Date(o.deadline), 'd MMM yyyy', { locale: ru })}</span>}
                          <span>{format(new Date(o.created_at), 'd MMM yyyy', { locale: ru })}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Set password modal */}
      <AnimatePresence>
        {showPassModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-navy-800 border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm"
            >
              {passDone ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                    <Key size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-white font-semibold">Пароль установлен!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white">Установите пароль</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Для входа в личный кабинет в будущем</p>
                    </div>
                    <button onClick={() => setShowPassModal(false)} className="text-slate-500 hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleSetPassword} className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder="Новый пароль (мин. 6 символов)"
                        className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 pr-10 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPass2}
                      onChange={e => setNewPass2(e.target.value)}
                      placeholder="Повторите пароль"
                      className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
                    />
                    {passError && <p className="text-red-400 text-xs">{passError}</p>}
                    <button
                      type="submit"
                      disabled={passLoading}
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                      {passLoading ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Сохранить пароль'}
                    </button>
                    <button type="button" onClick={() => setShowPassModal(false)} className="w-full text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors">
                      Пропустить
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
