'use client'

import { UserLevel } from '@/lib/levelSystem'

interface LevelCardProps {
  title: string
  subtitle: string
  level: UserLevel
  totalXP: number
  icon: string
  accentColor: string
  onClick?: () => void
}

export default function LevelCard({ 
  title, 
  subtitle, 
  level, 
  totalXP, 
  icon, 
  accentColor,
  onClick 
}: LevelCardProps) {
  const LevelIcon = level.icon
  
  // 진행률 계산
  const progressPercent = level.xpToNext > 0 
    ? Math.min(100, Math.max(5, (level.currentXP / (level.currentXP + level.xpToNext)) * 100))
    : 100

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-bold text-gray-900">{totalXP}</p>
        </div>
      </div>

      {/* 레벨 정보 */}
      <div className="flex items-center space-x-3 mb-3">
        <div className="relative flex-shrink-0">
          <LevelIcon className={`h-8 w-8 ${level.color}`} />
          <div 
            className={`absolute -top-1 -right-1 ${accentColor} text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm`}
          >
            {level.level}
          </div>
        </div>
        <div className="flex-1 text-left">
          <h4 className="text-base font-bold text-gray-900">{level.title}</h4>
          <p className="text-xs text-gray-600 line-clamp-1">{level.description}</p>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>진행도</span>
          <span>
            {level.xpToNext > 0 ? (
              <>+{level.xpToNext} 더</>
            ) : (
              <>최고 레벨</>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ease-out ${accentColor.replace('bg-', 'bg-opacity-100 bg-')}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </button>
  )
}
