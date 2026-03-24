import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, Layers,
  CheckCircle, TrendingUp, FileText, Shield, User,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const features = [
  { icon: CheckCircle, text: 'Единая база поставщиков', color: 'text-emerald-400' },
  { icon: TrendingUp, text: 'Аналитика и метрики в реальном времени', color: 'text-cyan-400' },
  { icon: FileText, text: 'Управление прайс-листами', color: 'text-violet-400' },
  { icon: Shield, text: 'Разграничение прав доступа', color: 'text-amber-400' },
]

type Tab = 'login' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, signUp, user } = useAuth()
  const [tab, setTab] = useState<Tab>('login')

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Register form
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { error } = await signIn(loginEmail, loginPassword)
    setLoginLoading(false)
    if (error) {
      setLoginError('Неверный email или пароль')
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    if (regPassword !== regPassword2) {
      setRegError('Пароли не совпадают')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Пароль должен быть не менее 6 символов')
      return
    }
    setRegLoading(true)
    const { error } = await signUp(regEmail, regPassword, regName)
    setRegLoading(false)
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        setRegError('Этот email уже зарегистрирован')
      } else if (msg.includes('invalid') && msg.includes('email')) {
        setRegError('Некорректный формат email адреса')
      } else if (msg.includes('weak') || msg.includes('password')) {
        setRegError('Пароль слишком простой. Используйте буквы и цифры')
      } else if (msg.includes('rate') || msg.includes('limit')) {
        setRegError('Слишком много попыток. Подождите несколько минут')
      } else {
        setRegError(`Ошибка регистрации: ${error.message}`)
      }
    } else {
      setRegSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb w-[600px] h-[600px] bg-primary-700 opacity-10 -top-32 -left-32 animate-float" />
        <div className="orb w-[400px] h-[400px] bg-cyan-600 opacity-10 top-1/2 -right-32 animate-float-delayed" />
        <div className="orb w-[300px] h-[300px] bg-emerald-600 opacity-[0.08] bottom-0 left-1/3 animate-float-slow" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-md"
        >
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-lg">
              <Layers size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SupplierCRM</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Управляйте поставщиками{' '}
            <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
              профессионально
            </span>
          </h1>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Полный контроль над базой поставщиков, прайс-листами и аналитикой в одном месте.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text, color }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className={color} />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="absolute bottom-12 left-16 right-16"
        >
          <div className="flex gap-3">
            {[
              { label: 'Поставщиков', value: '10+', color: 'from-primary-500/20 to-primary-600/10' },
              { label: 'Активных', value: '7', color: 'from-emerald-500/20 to-emerald-600/10' },
              { label: 'Категорий', value: '9', color: 'from-cyan-500/20 to-cyan-600/10' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`flex-1 glass rounded-xl px-4 py-3 bg-gradient-to-br ${color}`}>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
              <Layers size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">SupplierCRM</span>
          </div>

          <div className="glass rounded-2xl shadow-card-hover gradient-border overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b border-white/[0.07]">
              {(['login', 'register'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setLoginError(''); setRegError(''); setRegSuccess(false) }}
                  className={`relative flex-1 py-4 text-sm font-semibold transition-colors duration-200 ${
                    tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'login' ? 'Вход' : 'Регистрация'}
                  {tab === t && (
                    <motion.div
                      layoutId="tabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-cyan-500"
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {/* ─── LOGIN ─── */}
                {tab === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22 }}
                  >
                    <h2 className="text-xl font-bold text-white mb-1">Добро пожаловать</h2>
                    <p className="text-slate-400 text-sm mb-7">Войдите в свой аккаунт для продолжения</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={e => setLoginEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Пароль</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type={showLoginPass ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-11 py-3 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
                          />
                          <button type="button" onClick={() => setShowLoginPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                            {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {loginError && (
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                          {loginError}
                        </motion.div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={loginLoading}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-glow hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                      >
                        {loginLoading
                          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : 'Войти в систему'}
                      </motion.button>
                    </form>

                    <p className="text-center text-xs text-slate-600 mt-6">
                      Нет аккаунта?{' '}
                      <button onClick={() => setTab('register')} className="text-primary-400 hover:text-primary-300 transition-colors">
                        Зарегистрируйтесь
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* ─── REGISTER ─── */}
                {tab === 'register' && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22 }}
                  >
                    <h2 className="text-xl font-bold text-white mb-1">Создать аккаунт</h2>
                    <p className="text-slate-400 text-sm mb-7">Зарегистрируйтесь как пользователь системы</p>

                    <AnimatePresence mode="wait">
                      {regSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center text-center py-6 gap-4"
                        >
                          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle size={32} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-white font-semibold text-lg">Аккаунт создан!</p>
                            <p className="text-slate-400 text-sm mt-1">
                              Подтверждение отправлено на{' '}
                              <span className="text-primary-400">{regEmail}</span>
                              <br />Проверьте почту и нажмите на ссылку, затем войдите.
                            </p>
                          </div>
                          <button
                            onClick={() => { setTab('login'); setRegSuccess(false) }}
                            className="btn-primary text-sm px-6"
                          >
                            Перейти ко входу
                          </button>
                        </motion.div>
                      ) : (
                        <motion.form
                          key="form"
                          onSubmit={handleRegister}
                          className="space-y-4"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Имя и фамилия</label>
                            <div className="relative">
                              <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input
                                type="text"
                                value={regName}
                                onChange={e => setRegName(e.target.value)}
                                placeholder="Иван Иванов"
                                required
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <div className="relative">
                              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input
                                type="email"
                                value={regEmail}
                                onChange={e => setRegEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Пароль</label>
                            <div className="relative">
                              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input
                                type={showRegPass ? 'text' : 'password'}
                                value={regPassword}
                                onChange={e => setRegPassword(e.target.value)}
                                placeholder="Минимум 6 символов"
                                required
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-11 py-3 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
                              />
                              <button type="button" onClick={() => setShowRegPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                {showRegPass ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Повторите пароль</label>
                            <div className="relative">
                              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input
                                type={showRegPass ? 'text' : 'password'}
                                value={regPassword2}
                                onChange={e => setRegPassword2(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 pl-11 pr-4 py-3 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm"
                              />
                            </div>

                            {/* Password strength indicator */}
                            {regPassword && (
                              <div className="mt-2 flex gap-1">
                                {[1, 2, 3, 4].map((i) => {
                                  const strength = regPassword.length >= 6
                                    ? (regPassword.length >= 10 ? (regPassword.match(/[A-Z]/) ? (/[0-9]/.test(regPassword) ? 4 : 3) : 2) : 1)
                                    : 0
                                  return (
                                    <div
                                      key={i}
                                      className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                                        i <= strength
                                          ? strength <= 1 ? 'bg-red-500' : strength <= 2 ? 'bg-amber-500' : strength <= 3 ? 'bg-cyan-500' : 'bg-emerald-500'
                                          : 'bg-navy-500'
                                      }`}
                                    />
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {regError && (
                            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                              {regError}
                            </motion.div>
                          )}

                          <motion.button
                            type="submit"
                            disabled={regLoading}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-glow hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                          >
                            {regLoading
                              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              : 'Создать аккаунт'}
                          </motion.button>

                          <p className="text-xs text-slate-600 text-center">
                            Уже есть аккаунт?{' '}
                            <button type="button" onClick={() => setTab('login')} className="text-primary-400 hover:text-primary-300 transition-colors">
                              Войти
                            </button>
                          </p>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-center text-xs text-slate-700 mt-6">
            SupplierCRM © 2025 — Система управления поставщиками
          </p>
        </motion.div>
      </div>
    </div>
  )
}
