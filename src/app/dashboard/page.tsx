'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, BarChart3, Award, Quote, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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

        {/* 동기부여 명언 */}
        {currentQuote && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-4 mb-6 text-white">
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
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getCompletionColor(todayStats.completionRate)}`}
                style={{ width: `${todayStats.completionRate}%` }}
              />
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
          <div className="flex items-center space-x-2 mb-4">
            <Award className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">성취 배지</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border-2 transition-all ${
              currentStats && currentStats.avgCompletionRate >= 80 
                ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm font-bold text-gray-800">완벽주의자</div>
                <div className="text-xs text-gray-600">80% 이상 달성</div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl border-2 transition-all ${
              currentStats && currentStats.totalCompleted >= 10 
                ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-md' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-2">💪</div>
                <div className="text-sm font-bold text-gray-800">열정가</div>
                <div className="text-xs text-gray-600">10개 이상 완료</div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl border-2 transition-all ${
              completedPlans >= 5 
                ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-sm font-bold text-gray-800">계획가</div>
                <div className="text-xs text-gray-600">5개 계획 달성</div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl border-2 transition-all ${
              currentStats && currentStats.dailyStats.filter(d => d.completionRate === 100).length >= 3
                ? 'border-red-300 bg-gradient-to-br from-red-50 to-pink-50 shadow-md' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-sm font-bold text-gray-800">연속 달성</div>
                <div className="text-xs text-gray-600">3일 연속 100%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}