'use client'

import Link from 'next/link'

type AdminPageNavProps = {
  current?: string
}

const NAV_ITEMS = [
  { href: '/', label: '返回对话页', key: 'home' },
  { href: '/conversations', label: '返回会话列表', key: 'conversations' },
  { href: '/dashboard', label: '运营看板', key: 'dashboard' },
  { href: '/reflections', label: '反思记录', key: 'reflections' },
  { href: '/improvements', label: '改进建议', key: 'improvements' },
  { href: '/actions', label: '执行动作', key: 'actions' },
  { href: '/action-draft-dashboard', label: '动作草案看板', key: 'action-draft-dashboard' },
  { href: '/governance-dashboard', label: '治理看板', key: 'governance-dashboard' },
  { href: '/governance-effectiveness', label: '治理效果', key: 'governance-effectiveness' },
  { href: '/learning-dashboard', label: '学习看板', key: 'learning-dashboard' },
]

export function AdminPageNav({ current }: AdminPageNavProps) {
  return (
    <nav className='mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
      <div className='flex flex-wrap gap-2'>
        {NAV_ITEMS.map((item) => {
          const isActive = current === item.key
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive
                ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white'
                : 'rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}