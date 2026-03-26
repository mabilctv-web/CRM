import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, CheckCircle, Star, ArrowRight,
  FileText, MessageCircle, Shield, Zap, Users, Award, Crown, X,
  Send, ExternalLink, Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const CHANNEL_URL = 'https://t.me/EduWorkRev'

const services = [
  { icon: FileText,      title: 'Курсовые работы',  desc: 'Глубокий анализ и грамотное оформление по любой дисциплине', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: BookOpen,      title: 'Рефераты и эссе',  desc: 'Структурированные работы с актуальными источниками',         color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  { icon: GraduationCap, title: 'Дипломные работы', desc: 'Комплексное сопровождение от темы до защиты',                color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  { icon: Zap,           title: 'Контрольные',      desc: 'Быстрое и точное выполнение в срок',                         color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  { icon: MessageCircle, title: 'Презентации',      desc: 'Визуально сильные слайды с чёткой структурой',               color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
  { icon: Shield,        title: 'Уникальность',     desc: 'Проверка на антиплагиат, гарантия оригинальности',           color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
]

const steps = [
  { n: '01', title: 'Оставьте заявку',   desc: 'Опишите задание — предмет, объём, срок и требования' },
  { n: '02', title: 'Согласование',      desc: 'Обсуждаем детали и подтверждаем стоимость работы' },
  { n: '03', title: 'Выполнение',        desc: 'Работа выполняется в срок с соблюдением всех требований' },
  { n: '04', title: 'Получите результат',desc: 'Готовая работа с возможностью правок при необходимости' },
]

interface Review { id: number; author_name: string; text: string; stars: number }

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }),
}

const emptyForm = { name: '', email: '', phone: '', telegram: '', course: '', university: '' }

export default function Landing() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [reviews, setReviews]       = useState<Review[]>([])
  const [doneCount, setDoneCount]   = useState<number | null>(null)

  useEffect(() => {
    supabase.from('landing_reviews').select('id, author_name, text, stars').eq('visible', true).order('sort_order').then(({ data }) => {
      if (data) setReviews(data as Review[])
    })
    setDoneCount(374)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    const { error } = await supabase.from('orders').insert({
      client_name:     form.name.trim(),
      client_email:    form.email.trim(),
      client_phone:    form.phone.trim() || null,
      client_telegram: form.telegram.trim() || null,
      subject:         'Полное сопровождение',
      description:     `Курс: ${form.course}`,
      university:      form.university.trim() || null,
      source:          'website',
      order_type:      'full_service',
      status:          'new',
    })
    setSubmitting(false)
    if (error) { setSubmitError('Ошибка при отправке. Попробуйте ещё раз.') }
    else { setSubmitted(true); setForm(emptyForm) }
  }

  function closeModal() {
    setModalOpen(false)
    setTimeout(() => setSubmitted(false), 300)
  }

  const inp = 'w-full bg-navy-700 border border-navy-500 text-white placeholder-slate-600 px-4 py-2.5 rounded-xl focus:border-amber-500 outline-none transition-all text-sm'

  return (
    <div className="min-h-screen bg-navy-900 text-white">

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-navy-900/80 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">EduWork</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors">
              Войти
            </Link>
            <Link
              to="/auth?tab=register"
              className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 shadow-glow"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 mb-6">
              <Award size={12} /> Академическая помощь студентам
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl md:text-6xl font-extrabold leading-tight mb-6"
          >
            Проблемы с учебой?<br />
            <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">Мы решим.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-slate-400 mb-4 max-w-xl mx-auto"
          >
            Курсовые, дипломные, рефераты, контрольные — любые задания в срок и на высокую оценку.
          </motion.p>

          {/* CTA choice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
          >
            <p className="text-sm font-medium text-slate-500 mb-5">Что вас интересует?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/order"
                className="flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all duration-200"
              >
                <FileText size={15} /> Разовое задание
              </Link>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-amber-500/25"
              >
                <Crown size={15} /> Полное сопровождение
              </button>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 grid grid-cols-3 max-w-xl mx-auto gap-6"
        >
          {[
            { value: doneCount !== null ? `${doneCount}+` : '...', label: 'Выполненных работ' },
            { value: '98%', label: 'Положительных оценок' },
            { value: '1 час', label: 'Минимальный срок' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Full Service highlight card */}
      <section className="pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-navy-800/80 p-8 md:p-10"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                    <Crown size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-white">Полное сопровождение</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                        Уникальная услуга
                      </span>
                    </div>
                    <p className="text-sm text-amber-400/70 mt-0.5">Условия рассчитываются индивидуально</p>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">
                  Полностью берём на себя вашу учёбу на весь семестр:
                </p>
                <ul className="space-y-2.5 text-sm text-slate-300">
                  {[
                    'Выполняем все задания и работы в срок',
                    'Полностью следим за происходящим в вашем вузе',
                    'Оповещаем, когда нужно лично приехать и что-то сдать',
                    'На связи 24/7 — всегда знаем ваше расписание и зачётку',
                    'Полная конфиденциальность',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-shrink-0 flex flex-col gap-3 w-full md:w-auto md:min-w-[160px]">
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-amber-500/30 whitespace-nowrap"
                >
                  <Sparkles size={15} /> Хочу
                </button>
                <p className="text-xs text-slate-500 text-center">Свяжемся в течение часа</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* One-time services */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Единоразовые задания</h2>
            <p className="text-slate-400">Любые учебные работы — от небольшого реферата до дипломной</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass rounded-2xl p-6 border border-white/[0.06] hover:border-white/10 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <Link
              to="/order"
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-glow hover:shadow-glow-lg"
            >
              Оформить заявку <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-navy-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Как это работает</h2>
            <p className="text-slate-400">Четыре простых шага до готовой работы</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex gap-5 glass rounded-2xl p-6 border border-white/[0.06]"
              >
                <div className="text-3xl font-black text-primary-500/30 flex-shrink-0 leading-none">{s.n}</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-400">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Отзывы студентов</h2>
            <p className="text-slate-400">Что говорят те, кто уже обратился за помощью</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass rounded-2xl p-6 border border-white/[0.06]"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: r.stars }).map((_, j) => (
                    <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">"{r.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-semibold text-primary-300">
                    {r.author_name[0]}
                  </div>
                  <span className="text-xs text-slate-500">{r.author_name}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/40 text-sky-400 font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-200"
            >
              <ExternalLink size={14} /> Посмотреть все отзывы в канале
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <GraduationCap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-400">EduWork</span>
          </div>
          <p className="text-xs text-slate-600">© 2025 EduWork — академическая помощь студентам</p>
          <Link to="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Войти в CRM →
          </Link>
        </div>
      </footer>

      {/* Full Service Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-800 border border-amber-500/20 rounded-2xl w-full max-w-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Crown size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Полное сопровождение</h2>
                      <p className="text-xs text-slate-500">Свяжемся и обсудим условия</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={28} className="text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Заявка отправлена!</h3>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                      Мы свяжемся с вами в течение часа для обсуждения условий сопровождения.
                    </p>
                    <button
                      onClick={closeModal}
                      className="px-6 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium transition-colors"
                    >
                      Закрыть
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Имя студента *</label>
                      <input
                        required value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ваше имя"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email *</label>
                      <input
                        type="email" required value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="your@email.com"
                        className={inp}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Телефон</label>
                        <input
                          type="tel" value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="+7 (999) 000-00-00"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Telegram</label>
                        <input
                          type="text" value={form.telegram}
                          onChange={e => setForm(f => ({ ...f, telegram: e.target.value.replace('@', '') }))}
                          placeholder="@username"
                          className={inp}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Курс *</label>
                        <select
                          required value={form.course}
                          onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                          className={inp}
                        >
                          <option value="">—</option>
                          {[1,2,3,4,5,6].map(n => (
                            <option key={n} value={String(n)}>{n} курс</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">ВУЗ *</label>
                        <input
                          required value={form.university}
                          onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
                          placeholder="Название вуза"
                          className={inp}
                        />
                      </div>
                    </div>

                    {submitError && <p className="text-xs text-red-400">{submitError}</p>}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-amber-500/20 mt-1"
                    >
                      {submitting
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Send size={14} /> Отправить заявку</>
                      }
                    </button>
                    <p className="text-xs text-slate-600 text-center">Свяжемся в течение часа для обсуждения условий</p>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
