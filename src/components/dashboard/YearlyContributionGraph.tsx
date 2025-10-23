'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subDays, startOfYear, endOfYear, eachDayOfInterval, getDay, differenceInWeeks } from 'date-fns'
import { ko } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { useTheme } from '@/lib/context/ThemeContext'

interface ContributionData {
  date: string
  count: number
  todos?: number
  plans?: number
}

export default function YearlyContributionGraph() {
  const [contributions, setContributions] = useState<Map<string, ContributionData>>(new Map())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [totalContributions, setTotalContributions] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const { getCardStyle } = useTheme()

  const fetchYearlyData = useCallback(async () => {
    const startDate = startOfYear(new Date(selectedYear, 0, 1))
    const endDate = endOfYear(new Date(selectedYear, 0, 1))
    
    // Fetch todos for the year
    const { data: todosData } = await supabase
      .from('todos')
      .select('date, completed')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .eq('completed', true)

    // Fetch plans for the year
    const { data: plansData } = await supabase
      .from('plans')
      .select('completed_at')
      .not('completed_at', 'is', null)
      .gte('completed_at', format(startDate, 'yyyy-MM-dd'))
      .lte('completed_at', format(endDate, 'yyyy-MM-dd'))

    // Process data
    const contributionsMap = new Map<string, ContributionData>()
    
    todosData?.forEach(todo => {
      const existing = contributionsMap.get(todo.date) || { date: todo.date, count: 0, todos: 0, plans: 0 }
      existing.todos = (existing.todos || 0) + 1
      existing.count = existing.todos + (existing.plans || 0)
      contributionsMap.set(todo.date, existing)
    })

    plansData?.forEach(plan => {
      const date = plan.completed_at!.split('T')[0]
      const existing = contributionsMap.get(date) || { date, count: 0, todos: 0, plans: 0 }
      existing.plans = (existing.plans || 0) + 1
      existing.count = (existing.todos || 0) + existing.plans
      contributionsMap.set(date, existing)
    })

    setContributions(contributionsMap)
    
    // Calculate statistics
    calculateStatistics(contributionsMap)
  }, [selectedYear])

  useEffect(() => {
    fetchYearlyData()
  }, [fetchYearlyData])

  const calculateStatistics = (contributionsMap: Map<string, ContributionData>) => {
    let total = 0
    let maxStreak = 0
    let currentStreak = 0
    let lastDate: Date | null = null
    
    const sortedDates = Array.from(contributionsMap.keys()).sort()
    
    sortedDates.forEach(dateStr => {
      const contribution = contributionsMap.get(dateStr)!
      total += contribution.count
      
      const currentDate = new Date(dateStr)
      
      if (lastDate) {
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentStreak++
        } else {
          maxStreak = Math.max(maxStreak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      
      lastDate = currentDate
    })
    
    maxStreak = Math.max(maxStreak, currentStreak)
    
    // Check if current streak continues to today
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    
    if (!contributionsMap.has(today) && !contributionsMap.has(yesterday)) {
      currentStreak = 0
    }
    
    setTotalContributions(total)
    setLongestStreak(maxStreak)
    setCurrentStreak(currentStreak)
  }

  const getContributionLevel = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count <= 2) return 'bg-green-200'
    if (count <= 4) return 'bg-green-400'
    if (count <= 6) return 'bg-green-500'
    return 'bg-green-600'
  }

  const renderYearGrid = () => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1))
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1))
    const days = eachDayOfInterval({ start: yearStart, end: yearEnd })
    
    // Group days by month and organize into weeks
    const monthsData: { month: number; weeks: (Date | null)[][] }[] = []
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthStart = new Date(selectedYear, monthIndex, 1)
      const monthEnd = new Date(selectedYear, monthIndex + 1, 0)
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      
      // 각 월의 첫 날이 무슨 요일인지 확인하고 패딩 추가
      const firstDayOfWeek = getDay(monthStart)
      const paddedDays: (Date | null)[] = []
      
      // 앞쪽 패딩 (일요일=0부터 시작)
      for (let i = 0; i < firstDayOfWeek; i++) {
        paddedDays.push(null)
      }
      
      // 실제 날짜들 추가
      monthDays.forEach(day => paddedDays.push(day))
      
      // 일주일씩 끊어서 2차원 배열로 만들기
      const weeks: (Date | null)[][] = []
      for (let i = 0; i < paddedDays.length; i += 7) {
        weeks.push(paddedDays.slice(i, i + 7))
      }
      
      monthsData.push({ month: monthIndex, weeks })
    }
    
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    
    return (
      <div className="max-h-[600px] overflow-y-auto overflow-x-hidden pb-4">
        <div className="w-full">
          {/* Week day labels at top */}
          <div className="flex sticky top-0 bg-white dark:bg-gray-900 z-10 pb-2 mb-2 border-b border-gray-200">
            <div className="w-12 flex-shrink-0"></div>
            <div className="flex gap-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="w-3 text-[10px] text-gray-600 text-center font-medium"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
          
          {/* Months with contribution grids */}
          <div className="space-y-3">
            {monthsData.map(({ month, weeks }) => (
              <div key={month} className="flex">
                {/* Month label */}
                <div className="w-12 flex-shrink-0 text-xs text-gray-600 pr-2 flex items-start pt-0.5">
                  {months[month]}
                </div>
                
                {/* Contribution grid for the month - week by week */}
                <div className="flex-1">
                  <div className="space-y-1">
                    {weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex gap-1">
                        {week.map((day, dayIndex) => {
                          if (!day) {
                            return <div key={`empty-${month}-${weekIndex}-${dayIndex}`} className="w-3 h-3" />
                          }
                          
                          const dateStr = format(day, 'yyyy-MM-dd')
                          const contribution = contributions.get(dateStr)
                          const count = contribution?.count || 0
                          
                          return (
                            <div
                              key={dateStr}
                              className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 ${getContributionLevel(count)}`}
                              onMouseEnter={() => setHoveredDate(dateStr)}
                              onMouseLeave={() => setHoveredDate(null)}
                              title={`${format(day, 'yyyy년 M월 d일')}: ${count}개 완료`}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend and Statistics */}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>적음</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"></div>
                <div className="w-3 h-3 rounded-sm bg-green-200"></div>
                <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <div className="w-3 h-3 rounded-sm bg-green-600"></div>
              </div>
              <span>많음</span>
            </div>
            
            {/* Statistics */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <div>
                <span className="font-medium">{totalContributions}</span> 총 완료
              </div>
              <div>
                <span className="font-medium">{longestStreak}</span>일 최장 연속
              </div>
              {currentStreak > 0 && (
                <div className="text-green-600">
                  <span className="font-medium">{currentStreak}</span>일 현재 연속
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${getCardStyle()} rounded-lg shadow-sm p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          연간 활동 기록
        </h2>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}년</option>
          ))}
        </select>
      </div>
      
      {renderYearGrid()}
      
      {/* Hover tooltip */}
      {hoveredDate && contributions.get(hoveredDate) && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {format(new Date(hoveredDate), 'yyyy년 M월 d일 (E)', { locale: ko })}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {contributions.get(hoveredDate)!.todos || 0}개 할 일 완료
            {contributions.get(hoveredDate)!.plans ? `, ${contributions.get(hoveredDate)!.plans}개 계획 완료` : ''}
          </div>
        </div>
      )}
    </div>
  )
}