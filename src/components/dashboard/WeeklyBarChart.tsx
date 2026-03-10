'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } from 'date-fns'
import { useTheme } from '@/lib/context/ThemeContext'
import { calcTodoDailyRates, calcPlanDailyRates, DayCompletionRate } from './chartUtils'

export default function WeeklyBarChart() {
  const [tab, setTab] = useState<'todos' | 'plans'>('todos')
  const [thisWeek, setThisWeek] = useState<DayCompletionRate[]>([])
  const [lastWeek, setLastWeek] = useState<DayCompletionRate[]>([])
  const [loading, setLoading] = useState(true)
  const { getFilterButtonStyle, getCardStyle } = useTheme()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      // 이번 주 월~일
      const thisStart = startOfWeek(today, { weekStartsOn: 1 })
      const thisEnd = endOfWeek(today, { weekStartsOn: 1 })
      // 지난 주
      const lastStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
      const lastEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })

      const [thisRes, lastRes] = await Promise.all([
        fetch(`/api/dashboard/stats?startDate=${format(thisStart, 'yyyy-MM-dd')}&endDate=${format(thisEnd, 'yyyy-MM-dd')}`),
        fetch(`/api/dashboard/stats?startDate=${format(lastStart, 'yyyy-MM-dd')}&endDate=${format(lastEnd, 'yyyy-MM-dd')}`)
      ])

      const thisData = await thisRes.json()
      const lastData = await lastRes.json()

      const thisDates = eachDayOfInterval({ start: thisStart, end: thisEnd }).map(d => format(d, 'yyyy-MM-dd'))
      const lastDates = eachDayOfInterval({ start: lastStart, end: lastEnd }).map(d => format(d, 'yyyy-MM-dd'))

      if (tab === 'todos') {
        setThisWeek(calcTodoDailyRates(thisData.todos || [], thisDates))
        setLastWeek(calcTodoDailyRates(lastData.todos || [], lastDates))
      } else {
        setThisWeek(calcPlanDailyRates(thisData.plans || [], thisDates))
        setLastWeek(calcPlanDailyRates(lastData.plans || [], lastDates))
      }
    } catch (err) {
      console.error('WeeklyBarChart fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // SVG 치수
  const W = 350
  const H = 200
  const padLeft = 32
  const padRight = 10
  const padTop = 10
  const padBottom = 28
  const chartW = W - padLeft - padRight
  const chartH = H - padTop - padBottom

  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="bg-surface-card rounded-xl shadow-lg p-4 mb-6">
      <h2 className="text-lg font-bold text-ink mb-3">📊 주간 비교</h2>
      <div className="flex space-x-1 mb-3">
        <button onClick={() => setTab('todos')} className={getFilterButtonStyle(tab === 'todos')}>
          📝 할 일
        </button>
        <button onClick={() => setTab('plans')} className={getFilterButtonStyle(tab === 'plans')}>
          🎯 계획
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px] text-ink-muted text-sm">로딩 중...</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
          {/* Y축 가이드 라인 + 레이블 */}
          {[0, 50, 100].map(v => {
            const y = padTop + chartH - (v / 100) * chartH
            return (
              <g key={v}>
                <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="var(--c-outline)" strokeWidth={0.5} strokeDasharray="4 2" />
                <text x={padLeft - 4} y={y + 3} textAnchor="end" className="fill-ink-muted" style={{ fontSize: 9 }}>
                  {v}%
                </text>
              </g>
            )
          })}

          {/* 막대 그래프 */}
          {dayLabels.map((label, i) => {
            const groupW = chartW / 7
            const barW = groupW * 0.32
            const gap = 2
            const x = padLeft + i * groupW + (groupW - barW * 2 - gap) / 2

            const thisRate = thisWeek[i]?.rate ?? 0
            const lastRate = lastWeek[i]?.rate ?? 0
            const thisH = (thisRate / 100) * chartH
            const lastH = (lastRate / 100) * chartH

            return (
              <g key={i}>
                {/* 지난주 막대 */}
                <rect
                  x={x}
                  y={padTop + chartH - lastH}
                  width={barW}
                  height={lastH}
                  rx={2}
                  fill="var(--c-accent)"
                  opacity={0.3}
                />
                {/* 이번주 막대 */}
                <rect
                  x={x + barW + gap}
                  y={padTop + chartH - thisH}
                  width={barW}
                  height={thisH}
                  rx={2}
                  fill="var(--c-accent)"
                  opacity={1}
                />
                {/* X축 요일 레이블 */}
                <text
                  x={padLeft + i * groupW + groupW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  className="fill-ink-muted"
                  style={{ fontSize: 10 }}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      )}

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-ink-secondary">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--c-accent)' }} />
          이번 주
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--c-accent)', opacity: 0.3 }} />
          지난 주
        </span>
      </div>
    </div>
  )
}
