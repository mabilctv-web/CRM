import clsx from 'clsx'
import { SUPPLIER_STATUSES } from '../../types'

interface Props {
  status: string
  size?: 'sm' | 'md'
}

const colorMap: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  gray:  'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30',
  yellow:'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  blue:  'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
  red:   'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
}

const dotMap: Record<string, string> = {
  green: 'bg-emerald-400',
  gray:  'bg-slate-400',
  yellow:'bg-amber-400',
  blue:  'bg-blue-400',
  red:   'bg-red-400',
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const found = SUPPLIER_STATUSES.find(s => s.value === status)
  const label = found?.label ?? status
  const color = found?.color ?? 'gray'

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      colorMap[color],
      size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
    )}>
      <span className={clsx('rounded-full flex-shrink-0', dotMap[color], size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {label}
    </span>
  )
}
