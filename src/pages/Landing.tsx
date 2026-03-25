import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap, BookOpen, Clock, CheckCircle, Star, ArrowRight,
  FileText, MessageCircle, Shield, Zap, Users, Award,
} from 'lucide-react'

const services = [
  { icon: FileText, title: 'Курсовые работы', desc: 'Глубокий анализ и грамотное оформление по любой дисциплине', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: BookOpen, title: 'Рефераты и эссе', desc: 'Структурированные работы с актуальными источниками', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: GraduationCap, title: 'Дипломные работы', desc: 'Комплексное сопровождение от темы до защиты', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Zap, title: 'Контрольные', desc: 'Быстрое и точное выполнение в срок', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: MessageCircle, title: 'Презентации', desc: 'Визуально сильные слайды с чёткой структурой', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { icon: Shield, title: 'Уникальность', desc: 'Проверка на антиплагиат, гарантия оригинальности', color: 'text-blue-400', bg: 'bg-blue-500/10' },
]

const steps = [
  { n: '01', title: 'Оставьте заявку', desc: 'Опишите задание — предмет, объём, срок и требования' },
  { n: '02', title: 'Согласование', desc: 'Обсуждаем детали и подтверждаем стоимость работы' },
  { n: '03', title: 'Выполнение', desc: 'Работа выполняется в срок с соблюдением всех требований' },
  { n: '04', title: 'Получите результат', desc: 'Готовая работа с возможностью правок при необходимости' },
]

const reviews = [
  { name: 'Анастасия К.', text: 'Курсовая сдана на отлично! Всё чётко, в срок, без лишних вопросов. Уже третий раз обращаюсь.', stars: 5 },
  { name: 'Дмитрий М.', text: 'Помогли с дипломной работой. Научный руководитель одобрил без замечаний. Спасибо!', stars: 5 },
  { name: 'Алина В.', text: 'Быстро и качественно. Контрольная по статистике была готова за день. Рекомендую.', stars: 5 },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }),
}

export default function Landing() {
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
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
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
            className="text-lg text-slate-400 mb-10 max-w-xl mx-auto"
          >
            Курсовые, дипломные, рефераты, контрольные — любые задания в срок и на высокую оценку.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/order"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-glow hover:shadow-glow-lg"
            >
              Оставить заявку <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-20 grid grid-cols-3 max-w-xl mx-auto gap-6"
        >
          {[
            { value: '200+', label: 'Выполненных работ' },
            { value: '98%', label: 'Положительных оценок' },
            { value: '24ч', label: 'Минимальный срок' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Что мы делаем</h2>
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
                key={r.name}
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
                    {r.name[0]}
                  </div>
                  <span className="text-xs text-slate-500">{r.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-12 border border-white/[0.06] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-violet-600/5 pointer-events-none" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/15 flex items-center justify-center mx-auto mb-6">
                <Users size={24} className="text-primary-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Готовы помочь</h2>
              <p className="text-slate-400 mb-8">Напишите нам — обсудим задание и назовём точную стоимость. Без скрытых платежей.</p>
              <Link
                to="/order"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-glow hover:shadow-glow-lg"
              >
                Оставить заявку <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
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
    </div>
  )
}
