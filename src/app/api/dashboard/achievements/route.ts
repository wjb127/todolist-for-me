import { NextResponse } from 'next/server'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

import { Database } from '@/lib/database.types'
import { supabaseAdmin } from '@/lib/supabase/server'

type Todo = Database['public']['Tables']['todos']['Row']
type Plan = Database['public']['Tables']['plans']['Row']

const pageSize = 1000

const paginateSelect = async <T>(table: 'todos' | 'plans') => {
  let allRows: T[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`Error fetching ${table}:`, error)
      break
    }

    if (data && data.length > 0) {
      allRows = [...allRows, ...(data as T[])]
      hasMore = data.length === pageSize
      page++
    } else {
      hasMore = false
    }
  }

  return allRows
}

const calculateDailyStats = (todos: Todo[]) => {
  const dailyMap = new Map<string, { completed: number; total: number }>()

  todos.forEach((todo) => {
    const dayKey = todo.date
    const existing = dailyMap.get(dayKey) || { completed: 0, total: 0 }
    dailyMap.set(dayKey, {
      completed: existing.completed + (todo.completed ? 1 : 0),
      total: existing.total + 1
    })
  })

  const dailyStats = Array.from(dailyMap.entries()).map(([date, value]) => ({
    date,
    ...value
  }))

  dailyStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return dailyStats
}

const getLongestStreak = (dailyStats: { date: string; completed: number; total: number }[]) => {
  let longestStreak = 0
  let currentStreak = 0
  let previousDate: Date | null = null

  dailyStats.forEach((day) => {
    const dayDate = new Date(day.date)
    const completionRate = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0

    if (completionRate >= 80) {
      if (previousDate) {
        const diffInDays = (dayDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        currentStreak = diffInDays === 1 ? currentStreak + 1 : 1
      } else {
        currentStreak = 1
      }
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 0
    }

    previousDate = dayDate
  })

  return { longestStreak, currentStreak }
}

const countRangeCompletion = (
  todos: Todo[],
  rangeStart: Date,
  rangeEnd: Date
) => {
  return todos.reduce(
    (acc, todo) => {
      const todoDate = new Date(todo.date)
      if (todoDate >= rangeStart && todoDate <= rangeEnd) {
        acc.completed += todo.completed ? 1 : 0
        acc.total += 1
      }
      return acc
    },
    { completed: 0, total: 0 }
  )
}

export async function GET() {
  try {
    const [allTodos, allPlans] = await Promise.all([
      paginateSelect<Todo>('todos'),
      paginateSelect<Plan>('plans')
    ])

    const dailyStats = calculateDailyStats(allTodos)
    const { longestStreak, currentStreak } = getLongestStreak(dailyStats)

    const perfectDays = dailyStats.filter((day) => day.total > 0 && day.completed === day.total).length

    const weekRange = {
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 })
    }
    const monthRange = {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    }

    const weeklyStats = countRangeCompletion(allTodos, weekRange.start, weekRange.end)
    const monthlyStats = countRangeCompletion(allTodos, monthRange.start, monthRange.end)

    const templateCompleted = allTodos.filter((todo) => todo.completed && !!todo.template_id).length

    return NextResponse.json({
      totalTodos: allTodos.length,
      completedTodos: allTodos.filter((todo) => todo.completed).length,
      daysWithTodos: dailyStats.length,
      perfectDays,
      longestStreak,
      currentStreak,
      currentWeekCompleted: weeklyStats.completed,
      currentWeekTotal: weeklyStats.total,
      currentMonthCompleted: monthlyStats.completed,
      currentMonthTotal: monthlyStats.total,
      templateCompleted,
      plansCompleted: allPlans.filter((plan) => plan.completed).length,
      weekRange: {
        start: format(weekRange.start, 'yyyy-MM-dd'),
        end: format(weekRange.end, 'yyyy-MM-dd')
      },
      monthRange: {
        start: format(monthRange.start, 'yyyy-MM-dd'),
        end: format(monthRange.end, 'yyyy-MM-dd')
      }
    })
  } catch (error) {
    console.error('Error fetching achievement metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch achievement metrics' }, { status: 500 })
  }
}
