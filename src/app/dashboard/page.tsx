'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, CheckCircle2, Target, BarChart3, Award } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
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

export default function DashboardPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [selectedWeek, setSelectedWeek] = useState(new Date())

  const fetchData = useCallback(async () => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

    const [todosResponse, plansResponse] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd')),
      supabase
        .from('plans')
        .select('*')
    ])

    if (todosResponse.error) {
      console.error('Error fetching todos:', todosResponse.error)
    } else {
      calculateWeeklyStats(todosResponse.data || [], weekStart, weekEnd)
    }

    if (plansResponse.error) {
      console.error('Error fetching plans:', plansResponse.error)
    } else {
      setPlans(plansResponse.data || [])
    }
  }, [selectedWeek])

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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const goToPreviousWeek = () => {
    setSelectedWeek(prev => subDays(prev, 7))
  }

  const goToNextWeek = () => {
    setSelectedWeek(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date())
  }

  const formatWeekRange = () => {
    if (!weeklyStats) return ''
    return `${format(new Date(weeklyStats.weekStart), 'M월 d일', { locale: ko })} - ${format(new Date(weeklyStats.weekEnd), 'M월 d일', { locale: ko })}`
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <BarChart3 className="h-6 w-6 text-gray-600" />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">주간 분석</h2>
            <div className="flex space-x-2">
              <button
                onClick={goToPreviousWeek}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                ‹
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded"
              >
                이번주
              </button>
              <button
                onClick={goToNextWeek}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                ›
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-4">{formatWeekRange()}</div>
          
          {weeklyStats && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{weeklyStats.totalCompleted}</div>
                  <div className="text-xs text-gray-600">완료한 할 일</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{weeklyStats.totalTodos}</div>
                  <div className="text-xs text-gray-600">총 할 일</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{weeklyStats.avgCompletionRate}%</div>
                  <div className="text-xs text-gray-600">평균 완료율</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">일별 완료율</h3>
                {weeklyStats.dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center space-x-3">
                    <div className="w-8 text-xs text-gray-600">
                      {format(new Date(day.date), 'E', { locale: ko })}
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
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">계획 현황</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{completedPlans}</div>
              <div className="text-xs text-gray-600">완료한 계획</div>
            </div>
            <div className="text-center">
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

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">최근 7일</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              {weeklyStats ? weeklyStats.totalCompleted : 0}
            </div>
            <div className="text-xs text-gray-600">완료된 할 일</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">성과</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {weeklyStats ? weeklyStats.avgCompletionRate : 0}%
            </div>
            <div className="text-xs text-gray-600">평균 완료율</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">성취 배지</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border-2 ${
              weeklyStats && weeklyStats.avgCompletionRate >= 80 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xs font-medium">완벽주의자</div>
                <div className="text-xs text-gray-600">80% 이상</div>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border-2 ${
              weeklyStats && weeklyStats.totalCompleted >= 10 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-2xl mb-1">💪</div>
                <div className="text-xs font-medium">열정가</div>
                <div className="text-xs text-gray-600">10개 이상</div>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border-2 ${
              completedPlans >= 5 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs font-medium">계획가</div>
                <div className="text-xs text-gray-600">5개 계획</div>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border-2 ${
              weeklyStats && weeklyStats.dailyStats.filter(d => d.completionRate === 100).length >= 3
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xs font-medium">연속 달성</div>
                <div className="text-xs text-gray-600">3일 100%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}