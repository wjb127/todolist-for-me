'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, CheckSquare, Target, BarChart3, Sparkles } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'

const navigation = [
  { name: '템플릿', href: '/templates', icon: FileText },
  { name: 'Todo', href: '/todos', icon: CheckSquare },
  { name: '계획', href: '/plans', icon: Target },
  { name: '버킷', href: '/bucketlist', icon: Sparkles },
  { name: '대시보드', href: '/dashboard', icon: BarChart3 },
]

export default function BottomNavigation() {
  const pathname = usePathname()
  const { getCardStyle, getButtonStyle } = useTheme()

  return (
    <nav className={`fixed bottom-0 left-0 right-0 border-t border-gray-200 px-2 pt-2 pb-4 safe-area-pb ${getCardStyle()}`}>
      <div className="flex">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center space-y-1 py-2 rounded-lg transition-colors ${
                isActive
                  ? `text-blue-600 ${getButtonStyle()}`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium break-keep">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}