'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, CheckSquare, Target, BarChart3 } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'

const navigation = [
  { name: '템플릿', href: '/templates', icon: FileText },
  { name: 'Todo', href: '/todos', icon: CheckSquare },
  { name: '계획', href: '/plans', icon: Target },
  { name: '대시보드', href: '/dashboard', icon: BarChart3 },
]

export default function BottomNavigation() {
  const pathname = usePathname()
  const { theme } = useTheme()

  const getNavStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'fixed bottom-0 left-0 right-0 neumorphism-card border-t-0 px-4 pt-2 pb-4 safe-area-pb rounded-t-xl'
      case 'glassmorphism':
        return 'fixed bottom-0 left-0 right-0 glassmorphism-card border-t-0 px-4 pt-2 pb-4 safe-area-pb rounded-t-xl'
      case 'minimalism':
        return 'fixed bottom-0 left-0 right-0 minimalism-card border-t px-4 pt-2 pb-4 safe-area-pb'
      default:
        return 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-2 pb-4 safe-area-pb'
    }
  }

  return (
    <nav className={getNavStyle()}>
      <div className="flex justify-around">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? (() => {
                      switch (theme) {
                        case 'neumorphism':
                          return 'text-blue-600 neumorphism-card-inset'
                        case 'glassmorphism':
                          return 'text-blue-600 glassmorphism-card-inset'
                        case 'minimalism':
                          return 'text-blue-600 minimalism-card-inset'
                        default:
                          return 'text-blue-600 bg-blue-50'
                      }
                    })()
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}