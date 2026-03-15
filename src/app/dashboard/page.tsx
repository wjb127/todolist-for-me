'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, BarChart3, Award, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Sparkles, Trophy, Zap, Star, Crown, Shield, Gem, Rocket, X, Palette, StickyNote, Plus, Edit2, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, subWeeks, subMonths, addDays, min } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Database } from '@/lib/database.types'
import YearlyContributionGraph from '@/components/dashboard/YearlyContributionGraph'
import LevelCard from '@/components/dashboard/LevelCard'
import WeeklyBarChart from '@/components/dashboard/WeeklyBarChart'
import MonthlyLineChart from '@/components/dashboard/MonthlyLineChart'
import Portal from '@/components/ui/Portal'
import {
  getLevelInfo,
  todoDailyLevels,
  todoWeeklyLevels,
  todoMonthlyLevels,
  planDailyLevels,
  planWeeklyLevels,
  planMonthlyLevels,
  UserLevel,
  LevelData
} from '@/lib/levelSystem'

type Todo = Database['public']['Tables']['todos']['Row']
type Plan = Database['public']['Tables']['plans']['Row']
type Note = Database['public']['Tables']['notes']['Row']

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

interface GrowthMetric {
  current: number
  previous: number
  // 계획용: 완료/전체 개수
  currentCount?: string
  previousCount?: string
}

interface GrowthSet {
  dod: GrowthMetric
  wow: GrowthMetric
  mom: GrowthMetric
  yoy: GrowthMetric
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  progress?: number
  total?: number
  progressText?: string
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
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [todoGrowth, setTodoGrowth] = useState<GrowthSet | null>(null)
  const [planGrowth, setPlanGrowth] = useState<GrowthSet | null>(null)
  const [growthTab, setGrowthTab] = useState<'todos' | 'plans'>('todos')
  const [selectedLevelSystem, setSelectedLevelSystem] = useState<{
    title: string
    levels: LevelData[]
    currentLevel: UserLevel
    totalXP: number
    type: 'todo' | 'plan'
    period: 'daily' | 'weekly' | 'monthly'
  } | null>(null)

  // 메모 관련 state
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const [isNoteLoading, setIsNoteLoading] = useState(false)

  // 테마 시스템 사용
  const { theme, setTheme, colorMode, setColorMode, getBackgroundStyle, getCardStyle, getButtonStyle, getModalStyle, getModalBackdropStyle, getInputStyle, getFilterButtonStyle } = useTheme()
  const [graphTab, setGraphTab] = useState<'todos' | 'plans'>('todos')
  const [levelTab, setLevelTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    fetchNotes()
  }, [])

  // 메모 관련 함수들
  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      const data = await res.json()
      setNotes((data || []).slice(0, 5)) // 최근 5개만 표시
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsNoteLoading(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() })
      })
      if (!res.ok) throw new Error('Failed to add note')
      const data = await res.json()
      setNotes([data, ...notes.slice(0, 4)]) // 최근 5개 유지
      setNewNote('')
    } catch (error) {
      console.error('Error adding note:', error)
    }
    setIsNoteLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  const openEditModal = (note: Note) => {
    setEditingNote(note)
    setModalContent(note.content)
    setIsNoteModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingNote || !modalContent.trim()) return

    setIsNoteLoading(true)
    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: modalContent.trim() })
      })
      if (!res.ok) throw new Error('Failed to update note')

      setNotes(notes.map(n =>
        n.id === editingNote.id
          ? { ...n, content: modalContent.trim(), updated_at: new Date().toISOString() }
          : n
      ))
      closeNoteModal()
    } catch (error) {
      console.error('Error updating note:', error)
    }
    setIsNoteLoading(false)
  }

  const handleDeleteNote = async () => {
    if (!editingNote) return

    if (confirm('이 메모를 삭제하시겠습니까?')) {
      setIsNoteLoading(true)
      try {
        const res = await fetch(`/api/notes/${editingNote.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete note')
        setNotes(notes.filter(n => n.id !== editingNote.id))
        closeNoteModal()
      } catch (error) {
        console.error('Error deleting note:', error)
      }
      setIsNoteLoading(false)
    }
  }

  const closeNoteModal = () => {
    setIsNoteModalOpen(false)
    setEditingNote(null)
    setModalContent('')
  }

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return '방금 전'
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`
    if (diffInHours < 24) return `${diffInHours}시간 전`
    if (diffInDays < 7) return `${diffInDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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

    try {
      const res = await fetch(`/api/dashboard/stats?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard stats')
      const { todos: allTodos, plans: allPlans } = await res.json()

      // 데이터 처리
      if (viewMode === 'daily') {
        calculateDailyStats(allTodos, selectedDate)
      } else if (viewMode === 'weekly') {
        calculateWeeklyStats(allTodos, startDate, endDate)
      } else if (viewMode === 'monthly') {
        calculateMonthlyStats(allTodos, startDate, endDate)
      }

      setPlans(allPlans)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }, [selectedDate, viewMode])

  const calculateDailyStats = (todoData: Todo[], selectedDay: Date) => {
    const dayString = format(selectedDay, 'yyyy-MM-dd')
    const dayTodos = todoData.filter(todo => todo.date === dayString)
    const completed = dayTodos.filter(todo => todo.completed).length
    const total = dayTodos.length

    setDailyStats({
      date: dayString,
      completed,
      total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    })
  }

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

  // 성장 지표 계산
  const fetchGrowthMetrics = useCallback(async () => {
    try {
      const now = new Date()
      const today = format(now, 'yyyy-MM-dd')
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd')

      const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const lastWeek = subWeeks(now, 1)
      const lastWeekStart = format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const lastWeekEnd = format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

      // MTD 동기간 비교: 이번달 1일~오늘 vs 저번달 1일~같은 날짜
      const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const thisMonthEnd = format(now, 'yyyy-MM-dd') // 오늘까지만
      const lastMonth = subMonths(now, 1)
      const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
      const lastMonthSameDay = min([new Date(lastMonth.getFullYear(), lastMonth.getMonth(), now.getDate()), endOfMonth(lastMonth)])
      const lastMonthEnd = format(lastMonthSameDay, 'yyyy-MM-dd')

      // YoY: 작년 같은달 1일~같은 날짜
      const lastYearDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      const lastYearMonthStart = format(startOfMonth(lastYearDate), 'yyyy-MM-dd')
      const lastYearSameDay = min([new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), endOfMonth(lastYearDate)])
      const lastYearMonthEnd = format(lastYearSameDay, 'yyyy-MM-dd')

      const [recentRes, lastYearRes, plansRes] = await Promise.all([
        fetch(`/api/dashboard/stats?startDate=${lastMonthStart}&endDate=${thisMonthEnd}`),
        fetch(`/api/dashboard/stats?startDate=${lastYearMonthStart}&endDate=${lastYearMonthEnd}`),
        fetch(`/api/dashboard/stats?startDate=${lastYearMonthStart}&endDate=${thisMonthEnd}`)
      ])

      const recentData = await recentRes.json()
      const lastYearData = await lastYearRes.json()
      const plansData = await plansRes.json()
      const recentTodos = (recentData.todos || []) as Todo[]
      const lastYearTodos = (lastYearData.todos || []) as Todo[]
      const allPlans = (plansData.plans || []) as Plan[]

      const countCompleted = (todos: Todo[], start: string, end: string) =>
        todos.filter(t => t.date && t.date >= start && t.date <= end && t.completed).length

      // 계획: due_date 기준 완료율(%) + 절대 개수
      const planMetric = (start: string, end: string): { rate: number; count: string } => {
        const inRange = allPlans.filter(p => p.due_date && p.due_date >= start && p.due_date <= end)
        if (inRange.length === 0) return { rate: -1, count: '0/0' }
        const completed = inRange.filter(p => p.completed).length
        return { rate: Math.round((completed / inRange.length) * 100), count: `${completed}/${inRange.length}` }
      }

      setTodoGrowth({
        dod: {
          current: countCompleted(recentTodos, today, today),
          previous: countCompleted(recentTodos, yesterday, yesterday)
        },
        wow: {
          current: countCompleted(recentTodos, thisWeekStart, thisWeekEnd),
          previous: countCompleted(recentTodos, lastWeekStart, lastWeekEnd)
        },
        mom: {
          current: countCompleted(recentTodos, thisMonthStart, thisMonthEnd),
          previous: countCompleted(recentTodos, lastMonthStart, lastMonthEnd)
        },
        yoy: {
          current: countCompleted(recentTodos, thisMonthStart, thisMonthEnd),
          previous: countCompleted(lastYearTodos, lastYearMonthStart, lastYearMonthEnd)
        }
      })

      const dodC = planMetric(today, today), dodP = planMetric(yesterday, yesterday)
      const wowC = planMetric(thisWeekStart, thisWeekEnd), wowP = planMetric(lastWeekStart, lastWeekEnd)
      const momC = planMetric(thisMonthStart, thisMonthEnd), momP = planMetric(lastMonthStart, lastMonthEnd)
      const yoyC = planMetric(thisMonthStart, thisMonthEnd), yoyP = planMetric(lastYearMonthStart, lastYearMonthEnd)

      setPlanGrowth({
        dod: { current: dodC.rate, previous: dodP.rate, currentCount: dodC.count, previousCount: dodP.count },
        wow: { current: wowC.rate, previous: wowP.rate, currentCount: wowC.count, previousCount: wowP.count },
        mom: { current: momC.rate, previous: momP.rate, currentCount: momC.count, previousCount: momP.count },
        yoy: { current: yoyC.rate, previous: yoyP.rate, currentCount: yoyC.count, previousCount: yoyP.count },
      })
    } catch (error) {
      console.error('Error fetching growth metrics:', error)
    }
  }, [])

  useEffect(() => {
    fetchGrowthMetrics()
  }, [fetchGrowthMetrics])

  const calcGrowthPercent = (m: GrowthMetric): number | null => {
    // -1은 해당 기간 데이터 없음
    if (m.current === -1 && m.previous === -1) return null
    if (m.current === -1 || m.previous === -1) return null
    if (m.previous === 0 && m.current === 0) return null
    if (m.previous === 0) return 100
    return Math.round(((m.current - m.previous) / m.previous) * 100)
  }

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
  const GitHubCalendar = ({ dailyStats, type = 'todo' }: { dailyStats: DailyStats[], type?: 'todo' | 'plan' }) => {
    const getIntensityColor = (completed: number) => {
      if (completed === 0) return 'bg-surface-hover'
      if (type === 'plan') {
        // 계획: 0, 1, 2~3, 4~5, 6+
        if (completed <= 1) return 'bg-green-200'
        if (completed <= 3) return 'bg-green-300'
        if (completed <= 5) return 'bg-green-400'
        return 'bg-green-500'
      }
      // Todo: 0, 1~12, 13~24, 25~36, 37+
      if (completed <= 12) return 'bg-green-200'
      if (completed <= 24) return 'bg-green-300'
      if (completed <= 36) return 'bg-green-400'
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
      <div className="bg-surface-card rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">월간 활동</h3>
          <div className="flex items-center space-x-2 text-xs text-ink-muted">
            <span>적음</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-surface-hover rounded-sm"></div>
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
            <div key={day} className="text-xs text-ink-muted text-center p-1 font-medium">
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => (
            <div key={index} className="aspect-square p-1">
              {day ? (
                <div
                  className={`w-full h-full rounded-sm ${getIntensityColor(day.stats.completed)} border border-outline flex items-center justify-center text-xs font-medium ${
                    day.stats.completed > 0 ? 'text-white' : 'text-ink-muted'
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

  // 현재 월의 마감일을 가진 계획들만 필터링
  const getCurrentMonthPlans = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    return plans.filter(plan => {
      if (!plan.due_date) return false

      const dueDate = new Date(plan.due_date)
      const dueYear = dueDate.getFullYear()
      const dueMonth = dueDate.getMonth() + 1

      return dueYear === currentYear && dueMonth === currentMonth
    })
  }

  const currentMonthPlans = getCurrentMonthPlans()
  const completedPlans = currentMonthPlans.filter(plan => plan.completed).length
  const totalPlans = currentMonthPlans.length
  const planCompletionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0

  const getCurrentStats = () => {
    if (viewMode === 'daily') return dailyStats
    if (viewMode === 'weekly') return weeklyStats
    if (viewMode === 'monthly') return monthlyStats
    return null
  }

  const currentStats = getCurrentStats()

  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd')

    if (viewMode === 'daily' && dailyStats) {
      return dailyStats
    }

    if (currentStats && 'dailyStats' in currentStats) {
      const todayData = currentStats.dailyStats.find(stat => stat.date === today)
      return todayData || { date: today, completed: 0, total: 0, completionRate: 0 }
    }

    return { date: today, completed: 0, total: 0, completionRate: 0 }
  }

  const todayStats = getTodayStats()

  // 게이미피케이션 요소 계산
  const totalCompletedEver = (() => {
    if (currentStats && 'totalCompleted' in currentStats) {
      return currentStats.totalCompleted * 4
    }
    return todayStats.completed * 30 // 대략적인 전체 완료 수 추정
  })()

  const currentStreak = (() => {
    if (currentStats && 'dailyStats' in currentStats) {
      return calculateStreak(currentStats.dailyStats)
    }
    return 0
  })()

  // 성취 해제 계산
  const unlockedAchievements = achievements.map(achievement => {
    let unlocked = false
    let progress = 0
    let total = 1
    let progressText = ''

    switch (achievement.id) {
      case 'first_todo':
        unlocked = totalCompletedEver >= 1
        progress = Math.min(totalCompletedEver, 1)
        total = 1
        progressText = `첨 번째 할 일 완료: ${progress}/${total}`
        break
      case 'perfectionist':
        const perfectDays = (() => {
          if (currentStats && 'dailyStats' in currentStats) {
            return currentStats.dailyStats.filter(d => d.completionRate === 100).length
          }
          return todayStats.completionRate === 100 ? 1 : 0
        })()
        unlocked = perfectDays >= 1
        progress = Math.min(perfectDays, 1)
        total = 1
        progressText = `100% 완료 달성 일수: ${progress}/${total}`
        break
      case 'streak_master':
        unlocked = currentStreak >= 7
        progress = Math.min(currentStreak, 7)
        total = 7
        progressText = `연속 달성 일수: ${progress}/${total}일`
        break
      case 'productive_week':
        const weeklyCompleted = (() => {
          if (currentStats && 'totalCompleted' in currentStats) {
            return currentStats.totalCompleted
          }
          return 0
        })()
        unlocked = weeklyCompleted >= 50
        progress = Math.min(weeklyCompleted, 50)
        total = 50
        progressText = `주간 완료 수: ${progress}/${total}개`
        break
      case 'century_club':
        unlocked = totalCompletedEver >= 100
        progress = Math.min(totalCompletedEver, 100)
        total = 100
        progressText = `총 완료 수: ${progress}/${total}개`
        break
      case 'planning_pro':
        unlocked = completedPlans >= 10
        progress = Math.min(completedPlans, 10)
        total = 10
        progressText = `완료한 계획: ${progress}/${total}개`
        break
      case 'early_bird':
        // 간단한 예시로 설정
        unlocked = Math.random() > 0.8
        progress = unlocked ? 1 : 0
        total = 1
        progressText = `오전 6시 전 완료: ${progress}/${total}번`
        break
      case 'night_owl':
        unlocked = Math.random() > 0.8
        progress = unlocked ? 1 : 0
        total = 1
        progressText = `밤 11시 이후 완료: ${progress}/${total}번`
        break
      case 'template_master':
        const templateCompleted = Math.floor(totalCompletedEver * 0.6) // 템플릿 기반 완료 수 추정
        unlocked = templateCompleted >= 100
        progress = Math.min(templateCompleted, 100)
        total = 100
        progressText = `템플릿 기반 완룼: ${progress}/${total}개`
        break
      default:
        unlocked = Math.random() > 0.7
        progress = unlocked ? 1 : 0
        total = 1
        progressText = '???'
    }

    return {
      ...achievement,
      unlocked,
      progress,
      total,
      progressText
    }
  })

  return (
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">대시보드</h1>
            <p className="text-sm text-ink-secondary">나의 성과를 한눈에</p>
          </div>
          <div className="flex items-center space-x-2">
            {/* 테마 선택기 */}
            <button
              onClick={() => setSelectedAchievement({
                id: 'theme_selector',
                title: '디자인 테마 선택',
                description: '원하는 디자인 스타일을 선택하세요',
                icon: '🎨',
                unlocked: true,
                rarity: 'common'
              })}
              className={getButtonStyle()}
            >
              <Palette className="h-6 w-6 text-accent" />
            </button>
            <div className={getButtonStyle()}>
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        {/* GitHub 스타일 연간 잔디 - 탭 전환 */}
        <div>
          <div className="flex space-x-1 mb-4">
            <button onClick={() => setGraphTab('todos')} className={getFilterButtonStyle(graphTab === 'todos')}>
              📝 Todo 기록
            </button>
            <button onClick={() => setGraphTab('plans')} className={getFilterButtonStyle(graphTab === 'plans')}>
              🎯 계획 기록
            </button>
          </div>
          <YearlyContributionGraph type={graphTab} />
        </div>

        {/* 성장 지표 */}
        {(todoGrowth || planGrowth) && (
          <div className="bg-surface-card rounded-xl shadow-lg p-4 mb-6">
            <h2 className="text-lg font-bold text-ink mb-3">📈 성장 지표</h2>
            <div className="flex space-x-1 mb-3">
              <button onClick={() => setGrowthTab('todos')} className={getFilterButtonStyle(growthTab === 'todos')}>
                📝 할 일
              </button>
              <button onClick={() => setGrowthTab('plans')} className={getFilterButtonStyle(growthTab === 'plans')}>
                🎯 계획
              </button>
            </div>
            {(() => {
              const data = growthTab === 'todos' ? todoGrowth : planGrowth
              if (!data) return <p className="text-sm text-ink-secondary">데이터 로딩 중...</p>
              const metrics = [
                { label: 'DoD', sub: '일간', metric: data.dod },
                { label: 'WoW', sub: '주간', metric: data.wow },
                { label: 'MoM', sub: '전월 동기간', metric: data.mom },
                { label: 'YoY', sub: '전년 동기간', metric: data.yoy },
              ]
              return (
                <div className="grid grid-cols-4 gap-2">
                  {metrics.map(({ label, sub, metric }) => {
                    const pct = calcGrowthPercent(metric)
                    const isUp = pct !== null && pct > 0
                    const isDown = pct !== null && pct < 0
                    return (
                      <div key={label} className="text-center p-2 rounded-lg bg-surface-hover">
                        <div className="text-[10px] text-ink-muted font-medium">{label}</div>
                        <div className="text-[10px] text-ink-secondary">{sub}</div>
                        <div className={`text-sm font-bold mt-1 flex items-center justify-center gap-0.5 ${isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-ink-secondary'}`}>
                          {pct === null ? (
                            <Minus className="h-3 w-3" />
                          ) : (
                            <>
                              {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {pct > 0 ? '+' : ''}{pct}%
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-muted mt-0.5">
                          {growthTab === 'plans'
                            ? `${metric.previous === -1 ? '-' : metric.previous + '%'}→${metric.current === -1 ? '-' : metric.current + '%'}`
                            : `${metric.previous}→${metric.current}`
                          }
                        </div>
                        {growthTab === 'plans' && metric.currentCount && (
                          <div className="text-[9px] text-ink-muted">
                            {metric.previousCount}→{metric.currentCount}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* 주간 막대그래프 */}
        <WeeklyBarChart />

        {/* 월간 라인차트 */}
        <MonthlyLineChart />

        {/* 6가지 레벨 시스템 */}
        <div className="mt-6 mb-6">
          <h2 className="text-xl font-bold text-ink mb-4">🎮 레벨 시스템</h2>

          <div className="flex space-x-1 mb-4">
            <button onClick={() => setLevelTab('daily')} className={getFilterButtonStyle(levelTab === 'daily')}>
              ☀️ 일간
            </button>
            <button onClick={() => setLevelTab('weekly')} className={getFilterButtonStyle(levelTab === 'weekly')}>
              📅 주간
            </button>
            <button onClick={() => setLevelTab('monthly')} className={getFilterButtonStyle(levelTab === 'monthly')}>
              🗓️ 월간
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 할 일 레벨 */}
            {levelTab === 'daily' && (
              <LevelCard
                title="할 일 일간 레벨"
                subtitle="오늘 완료한 할 일"
                level={getLevelInfo(todayStats.completed, todoDailyLevels)}
                totalXP={todayStats.completed}
                icon="☀️"
                accentColor="bg-blue-500"
                onClick={() => setSelectedLevelSystem({
                  title: '할 일 일간 레벨',
                  levels: todoDailyLevels,
                  currentLevel: getLevelInfo(todayStats.completed, todoDailyLevels),
                  totalXP: todayStats.completed,
                  type: 'todo',
                  period: 'daily'
                })}
              />
            )}
            {levelTab === 'weekly' && (
              <LevelCard
                title="할 일 주간 레벨"
                subtitle="이번 주 완료한 할 일"
                level={getLevelInfo(
                  weeklyStats ? weeklyStats.totalCompleted : 0,
                  todoWeeklyLevels
                )}
                totalXP={weeklyStats ? weeklyStats.totalCompleted : 0}
                icon="📅"
                accentColor="bg-green-500"
                onClick={() => setSelectedLevelSystem({
                  title: '할 일 주간 레벨',
                  levels: todoWeeklyLevels,
                  currentLevel: getLevelInfo(
                    weeklyStats ? weeklyStats.totalCompleted : 0,
                    todoWeeklyLevels
                  ),
                  totalXP: weeklyStats ? weeklyStats.totalCompleted : 0,
                  type: 'todo',
                  period: 'weekly'
                })}
              />
            )}
            {levelTab === 'monthly' && (
              <LevelCard
                title="할 일 월간 레벨"
                subtitle="이번 달 완료한 할 일"
                level={getLevelInfo(
                  monthlyStats ? monthlyStats.totalCompleted : 0,
                  todoMonthlyLevels
                )}
                totalXP={monthlyStats ? monthlyStats.totalCompleted : 0}
                icon="🗓️"
                accentColor="bg-purple-500"
                onClick={() => setSelectedLevelSystem({
                  title: '할 일 월간 레벨',
                  levels: todoMonthlyLevels,
                  currentLevel: getLevelInfo(
                    monthlyStats ? monthlyStats.totalCompleted : 0,
                    todoMonthlyLevels
                  ),
                  totalXP: monthlyStats ? monthlyStats.totalCompleted : 0,
                  type: 'todo',
                  period: 'monthly'
                })}
              />
            )}

            {/* 계획 레벨 */}
            {levelTab === 'daily' && (
              <LevelCard
                title="계획 일간 레벨"
                subtitle="오늘 완료한 계획"
                level={getLevelInfo(
                  plans.filter(p => {
                    const today = format(new Date(), 'yyyy-MM-dd')
                    return p.completed && p.updated_at?.startsWith(today)
                  }).length,
                  planDailyLevels
                )}
                totalXP={plans.filter(p => {
                  const today = format(new Date(), 'yyyy-MM-dd')
                  return p.completed && p.updated_at?.startsWith(today)
                }).length}
                icon="🌟"
                accentColor="bg-orange-500"
                onClick={() => {
                  const dailyPlans = plans.filter(p => {
                    const today = format(new Date(), 'yyyy-MM-dd')
                    return p.completed && p.updated_at?.startsWith(today)
                  }).length
                  setSelectedLevelSystem({
                    title: '계획 일간 레벨',
                    levels: planDailyLevels,
                    currentLevel: getLevelInfo(dailyPlans, planDailyLevels),
                    totalXP: dailyPlans,
                    type: 'plan',
                    period: 'daily'
                  })
                }}
              />
            )}
            {levelTab === 'weekly' && (
              <LevelCard
                title="계획 주간 레벨"
                subtitle="이번 주 완료한 계획"
                level={getLevelInfo(
                  plans.filter(p => {
                    if (!p.completed || !p.updated_at) return false
                    const updatedDate = new Date(p.updated_at)
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
                    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
                    return updatedDate >= weekStart && updatedDate <= weekEnd
                  }).length,
                  planWeeklyLevels
                )}
                totalXP={plans.filter(p => {
                  if (!p.completed || !p.updated_at) return false
                  const updatedDate = new Date(p.updated_at)
                  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
                  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
                  return updatedDate >= weekStart && updatedDate <= weekEnd
                }).length}
                icon="🎯"
                accentColor="bg-pink-500"
                onClick={() => {
                  const weeklyPlans = plans.filter(p => {
                    if (!p.completed || !p.updated_at) return false
                    const updatedDate = new Date(p.updated_at)
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
                    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
                    return updatedDate >= weekStart && updatedDate <= weekEnd
                  }).length
                  setSelectedLevelSystem({
                    title: '계획 주간 레벨',
                    levels: planWeeklyLevels,
                    currentLevel: getLevelInfo(weeklyPlans, planWeeklyLevels),
                    totalXP: weeklyPlans,
                    type: 'plan',
                    period: 'weekly'
                  })
                }}
              />
            )}
            {levelTab === 'monthly' && (
              <LevelCard
                title="계획 월간 레벨"
                subtitle="이번 달 완료한 계획"
                level={getLevelInfo(
                  plans.filter(p => {
                    if (!p.completed || !p.updated_at) return false
                    const updatedDate = new Date(p.updated_at)
                    const monthStart = startOfMonth(new Date())
                    const monthEnd = endOfMonth(new Date())
                    return updatedDate >= monthStart && updatedDate <= monthEnd
                  }).length,
                  planMonthlyLevels
                )}
                totalXP={plans.filter(p => {
                  if (!p.completed || !p.updated_at) return false
                  const updatedDate = new Date(p.updated_at)
                  const monthStart = startOfMonth(new Date())
                  const monthEnd = endOfMonth(new Date())
                  return updatedDate >= monthStart && updatedDate <= monthEnd
                }).length}
                icon="🏆"
                accentColor="bg-indigo-500"
                onClick={() => {
                  const monthlyPlans = plans.filter(p => {
                    if (!p.completed || !p.updated_at) return false
                    const updatedDate = new Date(p.updated_at)
                    const monthStart = startOfMonth(new Date())
                    const monthEnd = endOfMonth(new Date())
                    return updatedDate >= monthStart && updatedDate <= monthEnd
                  }).length
                  setSelectedLevelSystem({
                    title: '계획 월간 레벨',
                    levels: planMonthlyLevels,
                    currentLevel: getLevelInfo(monthlyPlans, planMonthlyLevels),
                    totalXP: monthlyPlans,
                    type: 'plan',
                    period: 'monthly'
                  })
                }}
              />
            )}
          </div>
        </div>

        {/* 성과 카드 */}
        <div className="bg-surface-card rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Trophy className="h-6 w-6 text-emerald-500" />
              <div>
                <h2 className="text-lg font-bold text-ink">획득한 성취</h2>
                <p className="text-sm text-ink-secondary">나의 성취 컬렉션</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">{unlockedAchievements.filter(a => a.unlocked).length}</div>
              <div className="text-sm text-ink-secondary">/ {achievements.length}개 달성</div>
            </div>
          </div>

          {/* 성취 진행률 바 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-ink-secondary">
              <span>전체 성취 진행률</span>
              <span>{Math.round((unlockedAchievements.filter(a => a.unlocked).length / achievements.length) * 100)}%</span>
            </div>
            <div className="w-full bg-track rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(unlockedAchievements.filter(a => a.unlocked).length / achievements.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 성장 지표는 레벨 시스템 위로 이동됨 */}

        {/* 할 일 성과 카드 */}
        <div className="bg-surface-card rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold text-ink">오늘의 할 일</h2>
            </div>
            <div className="text-xs text-ink-muted">
              {format(new Date(), 'M월 d일 (E)', { locale: ko })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{todayStats.completed}</div>
              <div className="text-xs text-ink-secondary">완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ink">{todayStats.total}</div>
              <div className="text-xs text-ink-secondary">총 할 일</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{todayStats.completionRate}%</div>
              <div className="text-xs text-ink-secondary">달성률</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-track rounded-full h-4 relative overflow-hidden">
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
                <div className="text-sm font-medium text-ink-secondary flex items-center justify-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>🌱 시작이 좋습니다!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 할 일 분석 모드 탭 */}
        <div className="bg-surface-card rounded-xl shadow-lg p-4 mb-6">
          <div className="flex space-x-1 mb-4">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                  viewMode === mode
                    ? 'bg-accent text-white shadow-md'
                    : 'text-ink-secondary hover:bg-surface-hover'
                }`}
              >
                {mode === 'daily' && '일간'}
                {mode === 'weekly' && '주간'}
                {mode === 'monthly' && '월간'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">
              {viewMode === 'daily' && '할 일 일간 분석'}
              {viewMode === 'weekly' && '할 일 주간 분석'}
              {viewMode === 'monthly' && '할 일 월간 분석'}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevious}
                className="p-1 text-ink-secondary hover:text-ink hover:bg-surface-hover rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToCurrent}
                className="px-2 py-1 text-xs bg-accent-soft text-accent rounded font-medium"
              >
                {viewMode === 'daily' && '오늘'}
                {viewMode === 'weekly' && '이번주'}
                {viewMode === 'monthly' && '이번달'}
              </button>
              <button
                onClick={goToNext}
                className="p-1 text-ink-secondary hover:text-ink hover:bg-surface-hover rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-sm text-ink-secondary mb-4 text-center">
            {formatDateRange()}
          </div>

          {currentStats && (
            <>
              {viewMode === 'daily' ? (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{dailyStats?.completed || 0}</div>
                    <div className="text-xs text-ink-secondary">완료된 할 일</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-ink">{dailyStats?.total || 0}</div>
                    <div className="text-xs text-ink-secondary">총 할 일</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dailyStats?.completionRate || 0}%</div>
                    <div className="text-xs text-ink-secondary">완료율</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {'totalCompleted' in currentStats ? currentStats.totalCompleted : 0}
                    </div>
                    <div className="text-xs text-ink-secondary">완료된 할 일</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-ink">
                      {'totalTodos' in currentStats ? currentStats.totalTodos : 0}
                    </div>
                    <div className="text-xs text-ink-secondary">총 할 일</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {'avgCompletionRate' in currentStats ? currentStats.avgCompletionRate : 0}%
                    </div>
                    <div className="text-xs text-ink-secondary">평균 완료율</div>
                  </div>
                </div>
              )}

              {viewMode !== 'daily' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-ink-secondary">
                    {viewMode === 'weekly' ? '일별 할 일 완료율' : '일별 할 일 성과'}
                  </h4>
                  {('dailyStats' in currentStats ? currentStats.dailyStats : []).slice(0, viewMode === 'weekly' ? 7 : 10).map((day) => (
                    <div key={day.date} className="flex items-center space-x-3">
                      <div className="w-12 text-xs text-ink-secondary">
                        {viewMode === 'weekly'
                          ? format(new Date(day.date), 'E', { locale: ko })
                          : format(new Date(day.date), 'M/d', { locale: ko })}
                      </div>
                      <div className="flex-1 bg-track rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getCompletionColor(day.completionRate)}`}
                          style={{ width: `${day.completionRate}%` }}
                        />
                      </div>
                      <div className="text-xs text-ink-secondary w-12 text-right">
                        {day.completionRate}%
                      </div>
                      <div className="text-xs text-ink-muted w-16 text-right">
                        {day.completed}/{day.total}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'daily' && dailyStats && dailyStats.total === 0 && (
                <div className="text-center py-4 text-ink-muted">
                  <p className="text-sm">선택한 날짜에 할 일이 없습니다.</p>
                  <p className="text-xs">할 일을 추가해보세요!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* GitHub 스타일 달력 (월간 모드일 때만) */}
        {viewMode === 'monthly' && monthlyStats && (
          <GitHubCalendar dailyStats={monthlyStats.dailyStats} />
        )}

        {/* 계획 성과 카드 */}
        <div className="bg-surface-card rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-500" />
              <div>
                <h2 className="text-lg font-bold text-ink">이번 달 계획</h2>
                <p className="text-sm text-ink-secondary">{format(new Date(), 'M월', { locale: ko })} 마감 계획</p>
              </div>
            </div>
            <div className="text-xs text-ink-muted">
              총 {totalPlans}개 계획
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{completedPlans}</div>
              <div className="text-xs text-ink-secondary">완료된 계획</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ink">{totalPlans - completedPlans}</div>
              <div className="text-xs text-ink-secondary">남은 계획</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{planCompletionRate}%</div>
              <div className="text-xs text-ink-secondary">달성률</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-track rounded-full h-4 relative overflow-hidden">
              <div
                className="bg-purple-500 h-4 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${planCompletionRate}%` }}
              >
                {/* 반짝이는 애니메이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />

                {/* 흐르는 애니메이션 효과 */}
                {planCompletionRate > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-slide" />
                )}
              </div>

              {/* 달성률 텍스트 */}
              {planCompletionRate >= 50 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-sm">
                    {planCompletionRate}%
                  </span>
                </div>
              )}
            </div>

            {/* 동기부여 메시지 */}
            <div className="text-center mt-2">
              {totalPlans === 0 && (
                <div className="text-sm font-medium text-ink-muted flex items-center justify-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>📅 이번 달 마감 계획이 없습니다</span>
                </div>
              )}
              {totalPlans > 0 && planCompletionRate === 100 && (
                <div className="text-sm font-medium text-purple-600 flex items-center justify-center space-x-1">
                  <Rocket className="h-4 w-4" />
                  <span>🎉 이번 달 계획 모두 완료!</span>
                </div>
              )}
              {totalPlans > 0 && planCompletionRate >= 80 && planCompletionRate < 100 && (
                <div className="text-sm font-medium text-purple-600 flex items-center justify-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>💪 거의 다 완료!</span>
                </div>
              )}
              {totalPlans > 0 && planCompletionRate >= 50 && planCompletionRate < 80 && (
                <div className="text-sm font-medium text-purple-600 flex items-center justify-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>🌟 좋은 진전!</span>
                </div>
              )}
              {totalPlans > 0 && planCompletionRate > 0 && planCompletionRate < 50 && (
                <div className="text-sm font-medium text-ink-secondary flex items-center justify-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>🌱 시작이 좋습니다!</span>
                </div>
              )}
              {totalPlans > 0 && planCompletionRate === 0 && (
                <div className="text-sm font-medium text-ink-secondary flex items-center justify-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>🚀 계획을 시작해보세요!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 성취 모달 */}
        {selectedAchievement && (
          <Portal>
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} max-w-sm w-full p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink">
                  {selectedAchievement.id === 'theme_selector' ? '디자인 테마 선택' : '성취 정보'}
                </h3>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="p-1 text-ink-muted hover:text-ink-secondary rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selectedAchievement.id === 'theme_selector' ? (
                // 테마 선택기
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🎨</div>
                    <p className="text-sm text-ink-secondary">원하는 디자인 스타일을 선택하세요</p>
                  </div>

                  {/* 다크모드 토글 */}
                  <div className="mb-6 p-4 bg-surface-hover rounded-xl">
                    <h4 className="text-sm font-semibold text-ink mb-3">화면 모드</h4>
                    <div className="flex space-x-2">
                      {([
                        { value: 'light' as const, label: '라이트', icon: '☀️' },
                        { value: 'dark' as const, label: '다크', icon: '🌙' },
                        { value: 'system' as const, label: '시스템', icon: '💻' },
                      ]).map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setColorMode(mode.value)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            colorMode === mode.value
                              ? 'bg-accent text-white shadow-md'
                              : 'bg-surface-card text-ink-muted border border-outline hover:bg-surface-hover'
                          }`}
                        >
                          <span className="mr-1">{mode.icon}</span>
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setTheme('classic')
                        setSelectedAchievement(null)
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        theme === 'classic'
                          ? 'border-accent bg-accent-soft'
                          : 'border-outline bg-surface-card hover:border-outline-strong'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded border shadow-sm"></div>
                        <div>
                          <h4 className="font-semibold text-ink">클래식</h4>
                          <p className="text-sm text-ink-secondary">깔끔하고 모던한 카드 디자인</p>
                        </div>
                        {theme === 'classic' && (
                          <div className="ml-auto text-accent">
                            <Trophy className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setTheme('neumorphism')
                        setSelectedAchievement(null)
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        theme === 'neumorphism'
                          ? 'border-accent bg-accent-soft'
                          : 'border-outline bg-surface-card hover:border-outline-strong'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded border bg-gray-100 shadow-inner"></div>
                        <div>
                          <h4 className="font-semibold text-ink">뉴모피즘</h4>
                          <p className="text-sm text-ink-secondary">부드러운 그림자 효과의 입체적 디자인</p>
                        </div>
                        {theme === 'neumorphism' && (
                          <div className="ml-auto text-accent">
                            <Trophy className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setTheme('glassmorphism')
                        setSelectedAchievement(null)
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        theme === 'glassmorphism'
                          ? 'border-accent bg-accent-soft'
                          : 'border-outline bg-surface-card hover:border-outline-strong'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded border bg-gradient-to-br from-purple-100 to-blue-100 backdrop-blur"></div>
                        <div>
                          <h4 className="font-semibold text-ink">글래스모피즘</h4>
                          <p className="text-sm text-ink-secondary">투명한 유리 질감의 미래적 디자인</p>
                        </div>
                        {theme === 'glassmorphism' && (
                          <div className="ml-auto text-accent">
                            <Trophy className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setTheme('minimalism')
                        setSelectedAchievement(null)
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        theme === 'minimalism'
                          ? 'border-accent bg-accent-soft'
                          : 'border-outline bg-surface-card hover:border-outline-strong'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded border bg-surface-card border-outline-strong"></div>
                        <div>
                          <h4 className="font-semibold text-ink">미니멀리즘</h4>
                          <p className="text-sm text-ink-secondary">단순하고 깔끔한 라인의 간결한 디자인</p>
                        </div>
                        {theme === 'minimalism' && (
                          <div className="ml-auto text-accent">
                            <Trophy className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{selectedAchievement.icon}</div>
                  <h4 className="text-xl font-bold text-ink mb-1">{selectedAchievement.title}</h4>
                  <p className="text-sm text-ink-secondary mb-3">{selectedAchievement.description}</p>

                  {/* 희귀도 표시 */}
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedAchievement.rarity === 'legendary' ? 'bg-purple-100 text-purple-700' :
                      selectedAchievement.rarity === 'epic' ? 'bg-blue-100 text-blue-700' :
                      selectedAchievement.rarity === 'rare' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedAchievement.rarity === 'legendary' && '전설'}
                      {selectedAchievement.rarity === 'epic' && '에픽'}
                      {selectedAchievement.rarity === 'rare' && '희귀'}
                      {selectedAchievement.rarity === 'common' && '일반'}
                    </div>
                  </div>
                </div>
              )}

              {selectedAchievement.id !== 'theme_selector' && (
                <div>
                  {/* 진척사항 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-secondary">진척사항</span>
                      <span className="font-medium text-ink">
                        {selectedAchievement.unlocked ? '달성 완료!' : selectedAchievement.progressText}
                      </span>
                    </div>

                    {!selectedAchievement.unlocked && (
                      <div className="w-full bg-track rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            selectedAchievement.rarity === 'legendary' ? 'bg-purple-500' :
                            selectedAchievement.rarity === 'epic' ? 'bg-blue-500' :
                            selectedAchievement.rarity === 'rare' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${(selectedAchievement.progress! / selectedAchievement.total!) * 100}%` }}
                        />
                      </div>
                    )}

                    {selectedAchievement.unlocked && (
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <Trophy className="h-4 w-4" />
                        <span className="text-sm font-medium">🎉 성취 달성!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </Portal>
        )}

        {/* 성취 배지 */}
        <div className="bg-surface-card rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-ink">성취 컬렉션</h3>
            </div>
            <div className="text-sm text-ink-secondary">
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
                  onClick={() => setSelectedAchievement(achievement)}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                    achievement.unlocked
                      ? `bg-gradient-to-br ${getRarityBg(achievement.rarity)} ${getRarityColor(achievement.rarity)} shadow-md hover:shadow-lg transform hover:scale-105`
                      : 'border-outline bg-surface-hover opacity-75 hover:opacity-90'
                  }`}
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
                        <div className="text-xs font-bold text-ink leading-tight">
                          {achievement.title}
                        </div>
                      </div>

                      {/* 반짝이는 효과 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                    </>
                  )}

                  {!achievement.unlocked && (
                    <div className="text-center">
                      <div className="text-lg mb-1 filter grayscale">{achievement.icon}</div>
                      <div className="text-xs font-bold text-ink-muted">{achievement.title}</div>
                      <div className="text-xs text-ink-muted mt-1">
                        {Math.round((achievement.progress! / achievement.total!) * 100)}%
                      </div>
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

        {/* 메모 섹션 */}
        <div className={`${getCardStyle()} mb-6`}>
          <button
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <StickyNote className="h-5 w-5 text-amber-500" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-ink">빠른 메모</h3>
                <p className="text-sm text-ink-secondary">최근 메모 {notes.length}개</p>
              </div>
            </div>
            {isNotesExpanded ? (
              <ChevronUp className="h-5 w-5 text-ink-muted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-ink-muted" />
            )}
          </button>

          {/* 펼쳐진 메모 영역 */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isNotesExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* 새 메모 입력 영역 */}
              <div className="flex space-x-2 pt-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="새 메모를 입력하세요..."
                  className={`flex-1 ${getInputStyle()}`}
                  disabled={isNoteLoading}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isNoteLoading}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyle()}`}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* 메모 목록 */}
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <StickyNote className="h-10 w-10 mx-auto mb-2 text-ink-muted" />
                    <p className="text-sm text-ink-muted">아직 메모가 없습니다</p>
                    <p className="text-xs text-ink-muted mt-1">위에서 첫 메모를 작성해보세요</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-amber-50 rounded-lg border border-amber-200 group hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => openEditModal(note)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 mr-2">
                          <p className="text-sm text-ink break-words line-clamp-2">
                            {note.content}
                          </p>
                          <p className="text-xs text-ink-muted mt-1">
                            {formatNoteDate(note.created_at)}
                            {note.updated_at !== note.created_at && ' (수정됨)'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(note)
                          }}
                          className="p-1.5 text-ink-muted hover:text-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 메모 페이지로 이동 */}
              {notes.length > 0 && (
                <button
                  onClick={() => window.location.href = '/notes'}
                  className="w-full py-2 text-sm text-accent hover:text-accent-hover font-medium"
                >
                  모든 메모 보기 →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 메모 편집 모달 */}
        {isNoteModalOpen && editingNote && (
          <Portal>
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-outline">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">메모 편집</h2>
                  <button onClick={closeNoteModal} className="p-2 hover:bg-surface-hover rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className={`w-full ${getInputStyle()} min-h-[120px] resize-none`}
                  placeholder="메모 내용을 입력하세요..."
                  autoFocus
                />
                <p className="text-xs text-ink-muted mt-2">
                  작성: {formatNoteDate(editingNote.created_at)}
                  {editingNote.updated_at !== editingNote.created_at &&
                    ` | 수정: ${formatNoteDate(editingNote.updated_at)}`
                  }
                </p>
              </div>

              <div className="p-4 border-t border-outline flex justify-between">
                <button
                  onClick={handleDeleteNote}
                  disabled={isNoteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>삭제</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={closeNoteModal}
                    disabled={isNoteLoading}
                    className={`px-4 py-2 rounded-lg ${getCardStyle()} hover:opacity-80 disabled:opacity-50`}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!modalContent.trim() || isNoteLoading}
                    className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${getButtonStyle()}`}
                  >
                    <Save className="h-4 w-4" />
                    <span>저장</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </Portal>
        )}

        {/* 레벨 상세 정보 모달 */}
        {selectedLevelSystem && (
          <Portal>
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} max-w-md w-full p-6 max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink">{selectedLevelSystem.title}</h3>
                <button
                  onClick={() => setSelectedLevelSystem(null)}
                  className="p-1 text-ink-muted hover:text-ink-secondary rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 현재 레벨 정보 */}
              <div className="mb-6 p-4 bg-surface-hover rounded-lg border border-outline">
                <div className="flex items-center space-x-3 mb-2">
                  {(() => {
                    const LevelIcon = selectedLevelSystem.currentLevel.icon
                    return <LevelIcon className={`h-8 w-8 ${selectedLevelSystem.currentLevel.color}`} />
                  })()}
                  <div>
                    <h4 className="text-lg font-bold text-ink">{selectedLevelSystem.currentLevel.title}</h4>
                    <p className="text-sm text-ink-secondary">Lv.{selectedLevelSystem.currentLevel.level}</p>
                  </div>
                </div>
                <p className="text-sm text-ink-secondary mb-3">{selectedLevelSystem.currentLevel.description}</p>

                {/* 통계 정보 */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-surface-card rounded-lg p-2">
                    <p className="text-xs text-ink-secondary">총 완료</p>
                    <p className="text-lg font-bold text-ink">{selectedLevelSystem.totalXP}</p>
                  </div>
                  <div className="bg-surface-card rounded-lg p-2">
                    <p className="text-xs text-ink-secondary">다음 랭크까지</p>
                    <p className="text-lg font-bold text-ink">
                      {selectedLevelSystem.currentLevel.xpToNext > 0 ? selectedLevelSystem.currentLevel.xpToNext : '최고'}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-ink-secondary mb-1">
                    <span>진행도</span>
                    <span>
                      {selectedLevelSystem.currentLevel.xpToNext > 0
                        ? `${Math.round((selectedLevelSystem.currentLevel.currentXP / (selectedLevelSystem.currentLevel.currentXP + selectedLevelSystem.currentLevel.xpToNext)) * 100)}%`
                        : '100%'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-track rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: selectedLevelSystem.currentLevel.xpToNext > 0
                          ? `${Math.max(5, (selectedLevelSystem.currentLevel.currentXP / (selectedLevelSystem.currentLevel.currentXP + selectedLevelSystem.currentLevel.xpToNext)) * 100)}%`
                          : '100%'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 모든 레벨 목록 */}
              <div>
                <h4 className="text-md font-semibold text-ink mb-3">모든 레벨</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedLevelSystem.levels.map((data) => {
                    const isUnlocked = selectedLevelSystem.totalXP >= data.xpRequired
                    const isCurrent = data.level === selectedLevelSystem.currentLevel.level
                    const IconComponent = data.icon

                    return (
                      <div
                        key={data.level}
                        className={`flex items-center space-x-3 p-3 rounded-lg border ${
                          isCurrent
                            ? 'bg-accent-soft border-accent'
                            : isUnlocked
                              ? 'bg-surface-hover border-outline-strong'
                              : 'bg-surface-hover border-outline opacity-60'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <IconComponent
                            className={`h-6 w-6 ${
                              isUnlocked ? data.color : 'text-ink-muted'
                            } ${!isUnlocked ? 'opacity-50' : ''}`}
                          />
                          {isCurrent && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              ✓
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h5 className={`font-semibold text-sm ${
                              isUnlocked ? 'text-ink' : 'text-ink-muted'
                            }`}>
                              {data.title}
                            </h5>
                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                              isCurrent
                                ? 'bg-accent-soft text-accent'
                                : isUnlocked
                                  ? 'bg-surface-hover text-ink-secondary'
                                  : 'bg-surface-hover text-ink-muted'
                            }`}>
                              Lv.{data.level}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${
                            isUnlocked ? 'text-ink-secondary' : 'text-ink-muted'
                          }`}>
                            {data.description}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isUnlocked ? 'text-ink-muted' : 'text-ink-muted'
                          }`}>
                            필요: {data.xpRequired}개
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 닫기 버튼 */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setSelectedLevelSystem(null)}
                  className={`px-6 py-2 rounded-lg ${getButtonStyle()}`}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}
      </div>
    </div>
  )
}
