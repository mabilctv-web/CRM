import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, ArrowLeft, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Tab = 'login' | 'register' | 'magic'

export default function ClientAuth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'register' ? 'register' : 'login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

  const [magicEmail, setMagicEmail] = useState('')
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate('/my', { replace: true })
    })
  }, [navigate])

  function changeTab(t: Tab) {
    setTab(t)
    setLoginError(''); setRegError(''); setMagicError('')
    setRegSuccess(false); setMagicSent(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoginLoading(false)
    if (error) setLoginError('Неверный email или пароль')
    else navigate('/my', { replace: true })
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    if (regPassword.length < 6) { setRegError('Минимум 6 символов'); return }
    setRegLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { data: { full_name: regName, role: 'client' } },
    })
    if (error) {
      setRegError(error.message)
    } else if (data.session) {
      await supabase.rpc('create_client_profile', { user_name: regName })
      navigate('/my', { replace: true })
    } else {
      setRegSuccess(true)
    }
    setRegLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMagicError('')
    setMagicLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { shouldCreateUser: false },
    })
    setMagicLoading(false)
    if (error) setMagicError('Пользователь не найден или ошибка отправки')
    else setMagicSent(true)
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-navy-900/80 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={15} /> Назад
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white">EduWork</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/[0.07]">
              {([['login', 'Войти'], ['register', 'Регистрация']] as [Tab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => changeTab(t)}
                  className={`relative flex-1 py-4 text-sm font-semibold transition-colors ${
                    tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                  {tab === t && (
                    <motion.div
                      layoutId="clientTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-violet-500"
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {/* LOGIN */}
                {tab === 'login' && (
                  <motion.div key="login" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
                    <h2 className="text-xl font-bold mb-1">Добро пожаловать</h2>
                    <p className="text-slate-400 text-sm mb-6">Войдите, чтобы просмотреть свои заказы</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Пароль</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-10 pr-10 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
                          <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      {loginError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{loginError}</p>}
                      <button type="submit" disabled={loginLoading}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center mt-2">
                        {loginLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Войти'}
                      </button>
                    </form>
                    <button onClick={() => changeTab('magic')} className="w-full text-center text-xs text-slate-500 hover:text-primary-400 transition-colors mt-4">
                      Нет пароля? Войти по ссылке на почту →
                    </button>
                  </motion.div>
                )}

                {/* REGISTER */}
                {tab === 'register' && (
                  <motion.div key="register" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    {regSuccess ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                          <Mail size={22} className="text-emerald-400" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">Проверьте почту</h3>
                        <p className="text-sm text-slate-400">Мы отправили письмо с подтверждением на <span className="text-primary-400">{regEmail}</span>. Перейдите по ссылке для активации.</p>
                        <button onClick={() => changeTab('login')} className="mt-4 text-sm text-primary-400 hover:text-primary-300 transition-colors">
                          Вернуться ко входу
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl font-bold mb-1">Создать аккаунт</h2>
                        <p className="text-slate-400 text-sm mb-6">Зарегистрируйтесь для отслеживания заказов</p>
                        <form onSubmit={handleRegister} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Имя</label>
                            <div className="relative">
                              <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Иван Иванов"
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <div className="relative">
                              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="your@email.com"
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Пароль</label>
                            <div className="relative">
                              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input type={showRegPass ? 'text' : 'password'} required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Минимум 6 символов"
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-10 pr-10 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
                              <button type="button" onClick={() => setShowRegPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                {showRegPass ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                          {regError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{regError}</p>}
                          <button type="submit" disabled={regLoading}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center mt-2">
                            {regLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Зарегистрироваться'}
                          </button>
                        </form>
                      </>
                    )}
                  </motion.div>
                )}

                {/* MAGIC LINK */}
                {tab === 'magic' && (
                  <motion.div key="magic" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {magicSent ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-primary-500/15 flex items-center justify-center mx-auto mb-4">
                          <Send size={22} className="text-primary-400" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">Письмо отправлено</h3>
                        <p className="text-sm text-slate-400">Перейдите по ссылке в письме на <span className="text-primary-400">{magicEmail}</span> для входа.</p>
                        <button onClick={() => { setMagicSent(false); setMagicEmail('') }} className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                          Отправить снова
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => changeTab('login')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-5">
                          <ArrowLeft size={12} /> Назад
                        </button>
                        <h2 className="text-xl font-bold mb-1">Войти по ссылке</h2>
                        <p className="text-slate-400 text-sm mb-6">Мы отправим ссылку для входа на вашу почту</p>
                        <form onSubmit={handleMagicLink} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <div className="relative">
                              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input type="email" required value={magicEmail} onChange={e => setMagicEmail(e.target.value)} placeholder="your@email.com"
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl focus:border-primary-500 outline-none transition-all text-sm" />
                            </div>
                          </div>
                          {magicError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{magicError}</p>}
                          <button type="submit" disabled={magicLoading}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                            {magicLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} /> Отправить ссылку</>}
                          </button>
                        </form>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
