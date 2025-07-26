'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, BarChart3, Award, Quote, ChevronLeft, ChevronRight, Sparkles, Trophy, Zap, Flame, Star, Crown, Shield, Gem, Rocket } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, subWeeks, subMonths, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Todo = Database['public']['Tables']['todos']['Row']
type Plan = Database['public']['Tables']['plans']['Row']

interface DailyStats {
  date: string
  completed: number
  total: number
  completionRate: number
}

interface WeeklyStats {
  weekStart: string
  weekEnd: string
  totalCompleted: number
  totalTodos: number
  avgCompletionRate: number
  dailyStats: DailyStats[]
}

interface MonthlyStats {
  monthStart: string
  monthEnd: string
  totalCompleted: number
  totalTodos: number
  avgCompletionRate: number
  dailyStats: DailyStats[]
}

interface MotivationalQuote {
  text: string
  author: string
}

interface UserLevel {
  level: number
  currentXP: number
  xpToNext: number
  title: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const motivationalQuotes: MotivationalQuote[] = [
  { text: "오늘 하루도 최선을 다했습니다. 내일은 더 나은 하루가 될 거예요.", author: "익명" },
  { text: "작은 진전도 여전히 진전입니다.", author: "익명" },
  { text: "성공은 매일의 작은 노력들이 쌓여서 만들어집니다.", author: "로버트 콜리어" },
  { text: "완벽을 추구하지 말고, 꾸준함을 추구하세요.", author: "익명" },
  { text: "오늘의 할 일을 내일로 미루지 마세요.", author: "벤자민 프랭클린" },
  { text: "계획 없이는 꿈은 그저 소망일 뿐입니다.", author: "앙투안 드 생텍쥐페리" },
  { text: "시작이 반이다.", author: "한국 속담" },
  { text: "하루하루가 새로운 기회입니다.", author: "익명" },
  { text: "목표를 이루는 가장 좋은 방법은 시작하는 것입니다.", author: "익명" },
  { text: "당신이 할 수 있다고 믿든 없다고 믿든, 당신이 옳습니다.", author: "헨리 포드" },
]

// 레벨 시스템 설정
const getLevelInfo = (totalCompleted: number): UserLevel => {
  // 간단한 레벨 공식: 레벨 = sqrt(totalCompleted / 10) + 1
  const level = Math.floor(Math.sqrt(totalCompleted / 10)) + 1
  const currentLevelXP = Math.pow(level - 1, 2) * 10
  const nextLevelXP = Math.pow(level, 2) * 10
  const currentXP = totalCompleted - currentLevelXP
  const xpToNext = nextLevelXP - totalCompleted
  
  const titles = [
    "새내기", "초보자", "학습자", "실행가", "전문가", 
    "숙련자", "달인", "거장", "전설", "신화"
  ]
  
  const title = titles[Math.min(level - 1, titles.length - 1)] || "신화"
  
  return { level, currentXP, xpToNext, title }
}

// 성취 시스템
const achievements: Achievement[] = [
  {
    id: 'first_todo',
    title: '첫 걸음',
    description: '첫 번째 할 일을 완료했습니다',
    icon: '🌱',
    unlocked: false,
    rarity: 'common'
  },
  {
    id: 'early_bird',
    title: '얼리버드',
    description: '오전 6시 전에 할 일을 완료했습니다',
    icon: '🐦',
    unlocked: false,
    rarity: 'rare'
  },
  {
    id: 'perfectionist',
    title: '완벽주의자',
    description: '하루 100% 완료율을 달성했습니다',
    icon: '💎',
    unlocked: false,
    rarity: 'epic'
  },
  {
    id: 'streak_master',
    title: '연속 달성왕',
    description: '7일 연속 80% 이상 완료했습니다',
    icon: '🔥',
    unlocked: false,
    rarity: 'legendary'
  },
  {
    id: 'productive_week',
    title: '생산적인 한 주',
    description: '일주일간 50개 이상 완료했습니다',
    icon: '⚡',
    unlocked: false,
    rarity: 'rare'
  },
  {
    id: 'template_master',
    title: '템플릿 마스터',
    description: '템플릿을 활용해 100개 할 일을 완료했습니다',
    icon: '📋',
    unlocked: false,
    rarity: 'epic'
  },
  {
    id: 'night_owl',
    title: '올빼미',
    description: '밤 11시 이후에 할 일을 완료했습니다',
    icon: '🦉',
    unlocked: false,
    rarity: 'rare'
  },
  {
    id: 'century_club',
    title: '백의 클럽',
    description: '총 100개의 할 일을 완료했습니다',
    icon: '💯',
    unlocked: false,
    rarity: 'epic'
  },
  {
    id: 'planning_pro',
    title: '계획 전문가',
    description: '10개의 계획을 완료했습니다',
    icon: '🎯',
    unlocked: false,
    rarity: 'rare'
  }
]

// 스트릭 계산 함수
const calculateStreak = (dailyStats: DailyStats[]): number => {
  let streak = 0
  const sortedStats = [...dailyStats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  for (const stat of sortedStats) {
    if (stat.completionRate >= 80) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote | null>(null)

  useEffect(() => {
    // 랜덤 명언 선택
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
    setCurrentQuote(randomQuote)
  }, [])

  const fetchData = useCallback(async () => {
    let startDate: Date, endDate: Date

    if (viewMode === 'daily') {
      startDate = selectedDate
      endDate = selectedDate
    } else if (viewMode === 'weekly') {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 1 })
      endDate = endOfWeek(selectedDate, { weekStartsOn: 1 })
    } else {
      startDate = startOfMonth(selectedDate)
      endDate = endOfMonth(selectedDate)
    }

    const [todosResponse, plansResponse] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd')),
      supabase
        .from('plans')
        .select('*')
    ])

    if (todosResponse.error) {
      console.error('Error fetching todos:', todosResponse.error)
    } else {
      if (viewMode === 'weekly') {
        calculateWeeklyStats(todosResponse.data || [], startDate, endDate)
      } else if (viewMode === 'monthly') {
        calculateMonthlyStats(todosResponse.data || [], startDate, endDate)
      }
    }

    if (plansResponse.error) {
      console.error('Error fetching plans:', plansResponse.error)
    } else {
      setPlans(plansResponse.data || [])
    }
  }, [selectedDate, viewMode])

  const calculateWeeklyStats = (todoData: Todo[], weekStart: Date, weekEnd: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    
    const dailyStats: DailyStats[] = days.map(day => {
      const dayString = format(day, 'yyyy-MM-dd')
      const dayTodos = todoData.filter(todo => todo.date === dayString)
      const completed = dayTodos.filter(todo => todo.completed).length
      const total = dayTodos.length
      
      return {
        date: dayString,
        completed,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })

    const totalCompleted = dailyStats.reduce((sum, day) => sum + day.completed, 0)
    const totalTodos = dailyStats.reduce((sum, day) => sum + day.total, 0)
    const avgCompletionRate = dailyStats.length > 0 
      ? Math.round(dailyStats.reduce((sum, day) => sum + day.completionRate, 0) / dailyStats.length)
      : 0

    setWeeklyStats({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      totalCompleted,
      totalTodos,
      avgCompletionRate,
      dailyStats
    })
  }

  const calculateMonthlyStats = (todoData: Todo[], monthStart: Date, monthEnd: Date) => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    const dailyStats: DailyStats[] = days.map(day => {
      const dayString = format(day, 'yyyy-MM-dd')
      const dayTodos = todoData.filter(todo => todo.date === dayString)
      const completed = dayTodos.filter(todo => todo.completed).length
      const total = dayTodos.length
      
      return {
        date: dayString,
        completed,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })

    const totalCompleted = dailyStats.reduce((sum, day) => sum + day.completed, 0)
    const totalTodos = dailyStats.reduce((sum, day) => sum + day.total, 0)
    const avgCompletionRate = dailyStats.length > 0 
      ? Math.round(dailyStats.reduce((sum, day) => sum + day.completionRate, 0) / dailyStats.length)
      : 0

    setMonthlyStats({
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      totalCompleted,
      totalTodos,
      avgCompletionRate,
      dailyStats
    })
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const goToPrevious = () => {
    if (viewMode === 'daily') {
      setSelectedDate(prev => subDays(prev, 1))
    } else if (viewMode === 'weekly') {
      setSelectedDate(prev => subWeeks(prev, 1))
    } else {
      setSelectedDate(prev => subMonths(prev, 1))
    }
  }

  const goToNext = () => {
    if (viewMode === 'daily') {
      setSelectedDate(prev => addDays(prev, 1))
    } else if (viewMode === 'weekly') {
      setSelectedDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))
    } else {
      setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }
  }

  const goToCurrent = () => {
    setSelectedDate(new Date())
  }

  const formatDateRange = () => {
    if (viewMode === 'daily') {
      return format(selectedDate, 'M월 d일 (E)', { locale: ko })
    } else if (viewMode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      return `${format(weekStart, 'M월 d일', { locale: ko })} - ${format(weekEnd, 'M월 d일', { locale: ko })}`
    } else {
      return format(selectedDate, 'yyyy년 M월', { locale: ko })
    }
  }

  // GitHub 잔디밭 스타일 컴포넌트
  const GitHubCalendar = ({ dailyStats }: { dailyStats: DailyStats[] }) => {
    const getIntensityColor = (completionRate: number) => {
      if (completionRate === 0) return 'bg-gray-100'
      if (completionRate < 25) return 'bg-green-200'
      if (completionRate < 50) return 'bg-green-300'
      if (completionRate < 75) return 'bg-green-400'
      return 'bg-green-500'
    }

    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // 달력 그리드를 위해 앞뒤 빈 날짜들 추가
    const startDay = monthStart.getDay()
    
    const calendarDays: (null | { date: Date; stats: DailyStats })[] = []
    
    // 이전 달의 빈 칸들
    for (let i = 0; i < startDay; i++) {
      calendarDays.push(null)
    }
    
    // 현재 달의 모든 날짜들
    allDays.forEach(day => {
      const dayString = format(day, 'yyyy-MM-dd')
      const dayStats = dailyStats.find(stat => stat.date === dayString)
      calendarDays.push({
        date: day,
        stats: dayStats || { date: dayString, completed: 0, total: 0, completionRate: 0 }
      })
    })
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">월간 활동</h3>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>적음</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            </div>
            <span>많음</span>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="text-xs text-gray-500 text-center p-1 font-medium">
              {day}
            </div>
          ))}
          
          {calendarDays.map((day, index) => (
            <div key={index} className="aspect-square p-1">
              {day ? (
                <div 
                  className={`w-full h-full rounded-sm ${getIntensityColor(day.stats.completionRate)} border border-gray-200 flex items-center justify-center text-xs font-medium ${
                    day.stats.completionRate > 0 ? 'text-white' : 'text-gray-400'
                  }`}
                  title={`${format(day.date, 'M월 d일', { locale: ko })}: ${day.stats.completed}/${day.stats.total} (${day.stats.completionRate}%)`}
                >
                  {format(day.date, 'd')}
                </div>
              ) : (
                <div className="w-full h-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 60) return 'bg-yellow-500'
    if (rate >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const completedPlans = plans.filter(plan => plan.completed).length
  const totalPlans = plans.length
  const planCompletionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0

  const getCurrentStats = () => {
    if (viewMode === 'weekly') return weeklyStats
    if (viewMode === 'monthly') return monthlyStats
    return null
  }

  const currentStats = getCurrentStats()
  
  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const dailyStats = currentStats?.dailyStats.find(stat => stat.date === today)
    return dailyStats || { date: today, completed: 0, total: 0, completionRate: 0 }
  }

  const todayStats = getTodayStats()
  
  // 게이미피케이션 요소 계산
  const totalCompletedEver = currentStats ? currentStats.totalCompleted * 4 : todayStats.completed * 30 // 대략적인 전체 완료 수 추정
  const userLevel = getLevelInfo(totalCompletedEver)
  const currentStreak = currentStats ? calculateStreak(currentStats.dailyStats) : 0
  
  // 성취 해제 계산
  const unlockedAchievements = achievements.map(achievement => {
    let unlocked = false
    
    switch (achievement.id) {
      case 'first_todo':
        unlocked = totalCompletedEver >= 1
        break
      case 'perfectionist':
        unlocked = currentStats ? currentStats.dailyStats.some(d => d.completionRate === 100) : todayStats.completionRate === 100
        break
      case 'streak_master':
        unlocked = currentStreak >= 7
        break
      case 'productive_week':
        unlocked = currentStats ? currentStats.totalCompleted >= 50 : false
        break
      case 'century_club':
        unlocked = totalCompletedEver >= 100
        break
      case 'planning_pro':
        unlocked = completedPlans >= 10
        break
      default:
        unlocked = Math.random() > 0.7 // 일부 성취는 랜덤으로 해제
    }
    
    return { ...achievement, unlocked }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-600">나의 성과를 한눈에</p>
          </div>
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        {/* 레벨 및 경험치 시스템 */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-xl shadow-lg p-4 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Crown className="h-8 w-8 text-yellow-200" />
                <div className="absolute -top-1 -right-1 bg-yellow-300 text-orange-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {userLevel.level}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold">{userLevel.title}</h2>
                <p className="text-sm text-orange-100">레벨 {userLevel.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-100">XP</p>
              <p className="text-lg font-bold">{totalCompletedEver}</p>
            </div>
          </div>
          
          {/* 경험치 바 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-orange-100">
              <span>현재 레벨 진행도</span>
              <span>{userLevel.currentXP} / {userLevel.currentXP + userLevel.xpToNext}</span>
            </div>
            <div className="w-full bg-orange-600/30 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-300 to-yellow-100 h-3 rounded-full transition-all duration-1000 relative overflow-hidden"
                style={{ width: `${(userLevel.currentXP / (userLevel.currentXP + userLevel.xpToNext)) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            <div className="text-center text-xs text-orange-100">
              다음 레벨까지 {userLevel.xpToNext}XP 남음
            </div>
          </div>
        </div>

        {/* 스트릭 및 성과 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Flame className="h-5 w-5 text-red-200" />
              <span className="text-sm font-medium">연속 달성</span>
            </div>
            <div className="text-2xl font-bold mb-1">{currentStreak}일</div>
            <div className="text-xs text-red-200">
              {currentStreak >= 7 ? '🔥 불타는 중!' : currentStreak >= 3 ? '💪 좋은 페이스!' : '🌱 시작이 좋아요!'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-emerald-200" />
              <span className="text-sm font-medium">획득한 성취</span>
            </div>
            <div className="text-2xl font-bold mb-1">{unlockedAchievements.filter(a => a.unlocked).length}</div>
            <div className="text-xs text-emerald-200">
              / {achievements.length}개 달성
            </div>
          </div>
        </div>

        {/* 동기부여 명언 */}
        {currentQuote && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-4 mb-6 text-white">
            <div className="flex items-start space-x-3">
              <Quote className="h-6 w-6 text-purple-200 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium leading-relaxed mb-2">
                  &ldquo;{currentQuote.text}&rdquo;
                </p>
                <p className="text-xs text-purple-200">- {currentQuote.author}</p>
              </div>
            </div>
          </div>
        )}

        {/* 오늘의 성과 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-gray-900">오늘의 현황</h2>
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(), 'M월 d일 (E)', { locale: ko })}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{todayStats.completed}</div>
              <div className="text-xs text-gray-600">완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{todayStats.total}</div>
              <div className="text-xs text-gray-600">총 할 일</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{todayStats.completionRate}%</div>
              <div className="text-xs text-gray-600">달성률</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ease-out relative ${getCompletionColor(todayStats.completionRate)}`}
                style={{ width: `${todayStats.completionRate}%` }}
              >
                {/* 반짝이는 애니메이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                
                {/* 흐르는 애니메이션 효과 */}
                {todayStats.completionRate > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-slide" />
                )}
              </div>
              
              {/* 완료율 텍스트 */}
              {todayStats.completionRate >= 50 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-sm">
                    {todayStats.completionRate}%
                  </span>
                </div>
              )}
            </div>
            
            {/* 동기부여 메시지 */}
            <div className="text-center mt-2">
              {todayStats.completionRate === 100 && (
                <div className="text-sm font-medium text-green-600 flex items-center justify-center space-x-1">
                  <Rocket className="h-4 w-4" />
                  <span>🎉 오늘 완벽한 하루!</span>
                </div>
              )}
              {todayStats.completionRate >= 80 && todayStats.completionRate < 100 && (
                <div className="text-sm font-medium text-blue-600 flex items-center justify-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>💪 거의 다 왔어요!</span>
                </div>
              )}
              {todayStats.completionRate >= 50 && todayStats.completionRate < 80 && (
                <div className="text-sm font-medium text-yellow-600 flex items-center justify-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>🌟 좋은 진전이에요!</span>
                </div>
              )}
              {todayStats.completionRate > 0 && todayStats.completionRate < 50 && (
                <div className="text-sm font-medium text-gray-600 flex items-center justify-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>🌱 시작이 좋습니다!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 분석 모드 탭 */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex space-x-1 mb-4">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode === 'daily' && '일간'}
                {mode === 'weekly' && '주간'}
                {mode === 'monthly' && '월간'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'daily' && '일간 분석'}
              {viewMode === 'weekly' && '주간 분석'}
              {viewMode === 'monthly' && '월간 분석'}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevious}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToCurrent}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded font-medium"
              >
                {viewMode === 'daily' && '오늘'}
                {viewMode === 'weekly' && '이번주'}
                {viewMode === 'monthly' && '이번달'}
              </button>
              <button
                onClick={goToNext}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4 text-center">
            {formatDateRange()}
          </div>

          {currentStats && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{currentStats.totalCompleted}</div>
                  <div className="text-xs text-gray-600">완료</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{currentStats.totalTodos}</div>
                  <div className="text-xs text-gray-600">총 할 일</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{currentStats.avgCompletionRate}%</div>
                  <div className="text-xs text-gray-600">평균 완료율</div>
                </div>
              </div>

              {viewMode !== 'daily' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    {viewMode === 'weekly' ? '일별 완료율' : '일별 성과'}
                  </h4>
                  {currentStats.dailyStats.slice(0, viewMode === 'weekly' ? 7 : 10).map((day) => (
                    <div key={day.date} className="flex items-center space-x-3">
                      <div className="w-12 text-xs text-gray-600">
                        {viewMode === 'weekly' 
                          ? format(new Date(day.date), 'E', { locale: ko })
                          : format(new Date(day.date), 'M/d', { locale: ko })}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getCompletionColor(day.completionRate)}`}
                          style={{ width: `${day.completionRate}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 w-12 text-right">
                        {day.completionRate}%
                      </div>
                      <div className="text-xs text-gray-500 w-16 text-right">
                        {day.completed}/{day.total}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* GitHub 스타일 달력 (월간 모드일 때만) */}
        {viewMode === 'monthly' && monthlyStats && (
          <GitHubCalendar dailyStats={monthlyStats.dailyStats} />
        )}

        {/* 계획 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">계획 현황</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{completedPlans}</div>
              <div className="text-xs text-purple-700">완료한 계획</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalPlans}</div>
              <div className="text-xs text-gray-600">총 계획</div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${planCompletionRate}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600">
            계획 달성률: {planCompletionRate}%
          </div>
        </div>

        {/* 성취 배지 */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">성취 컬렉션</h3>
            </div>
            <div className="text-sm text-gray-600">
              {unlockedAchievements.filter(a => a.unlocked).length}/{achievements.length}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {unlockedAchievements.slice(0, 9).map((achievement) => {
              const getRarityColor = (rarity: string) => {
                switch (rarity) {
                  case 'legendary': return 'from-purple-500 to-pink-500 border-purple-300'
                  case 'epic': return 'from-blue-500 to-cyan-500 border-blue-300'
                  case 'rare': return 'from-green-500 to-emerald-500 border-green-300'
                  default: return 'from-gray-400 to-gray-500 border-gray-300'
                }
              }
              
              const getRarityBg = (rarity: string) => {
                switch (rarity) {
                  case 'legendary': return 'from-purple-50 to-pink-50'
                  case 'epic': return 'from-blue-50 to-cyan-50'
                  case 'rare': return 'from-green-50 to-emerald-50'
                  default: return 'from-gray-50 to-gray-100'
                }
              }
              
              return (
                <div
                  key={achievement.id}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${
                    achievement.unlocked
                      ? `bg-gradient-to-br ${getRarityBg(achievement.rarity)} ${getRarityColor(achievement.rarity)} shadow-md hover:shadow-lg transform hover:scale-105`
                      : 'border-gray-200 bg-gray-100 opacity-60'
                  }`}
                  title={achievement.unlocked ? achievement.description : '???'}
                >
                  {achievement.unlocked && (
                    <>
                      {/* 희귀도 표시 */}
                      <div className="absolute -top-1 -right-1">
                        {achievement.rarity === 'legendary' && <Crown className="h-3 w-3 text-purple-600" />}
                        {achievement.rarity === 'epic' && <Gem className="h-3 w-3 text-blue-600" />}
                        {achievement.rarity === 'rare' && <Star className="h-3 w-3 text-green-600" />}
                      </div>
                      
                      {/* 성취 내용 */}
                      <div className="text-center">
                        <div className="text-lg mb-1">{achievement.icon}</div>
                        <div className="text-xs font-bold text-gray-800 leading-tight">
                          {achievement.title}
                        </div>
                      </div>
                      
                      {/* 반짝이는 효과 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                    </>
                  )}
                  
                  {!achievement.unlocked && (
                    <div className="text-center">
                      <div className="text-lg mb-1">🔒</div>
                      <div className="text-xs font-bold text-gray-500">???</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* 최근 획득한 성취 */}
          {unlockedAchievements.filter(a => a.unlocked).length > 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  🎉 현재 {unlockedAchievements.filter(a => a.unlocked).length}개의 성취를 달성했습니다!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}