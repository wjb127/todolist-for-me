'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, eachDayOfInterval, subMonths } from 'date-fns'
import { useTheme } from '@/lib/context/ThemeContext'
import { calcTodoDailyRates, calcPlanDailyRates, DayCompletionRate } from './chartUtils'

export default function MonthlyLineChart() {
  const [tab, setTab] = useState<'todos' | 'plans'>('todos')
  const [thisMonth, setThisMonth] = useState<DayCompletionRate[]>([])
  const [lastMonth, setLastMonth] = useState<DayCompletionRate[]>([])
  const [loading, setLoading] = useState(true)
  const { getFilterButtonStyle } = useTheme()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      const thisStart = startOfMonth(today)
      const lastMonthDate = subMonths(today, 1)
      const lastStart = startOfMonth(lastMonthDate)
      // 지난 달 같은 날짜까지 (MTD 비교)
      const lastEnd = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), today.getDate())

      const [thisRes, lastRes] = await Promise.all([
        fetch(`/api/dashboard/stats?startDate=${format(thisStart, 'yyyy-MM-dd')}&endDate=${format(today, 'yyyy-MM-dd')}`),
        fetch(`/api/dashboard/stats?startDate=${format(lastStart, 'yyyy-MM-dd')}&endDate=${format(lastEnd, 'yyyy-MM-dd')}`)
      ])

      const thisData = await thisRes.json()
      const lastData = await lastRes.json()

      const thisDates = eachDayOfInterval({ start: thisStart, end: today }).map(d => format(d, 'yyyy-MM-dd'))
      const lastDates = eachDayOfInterval({ start: lastStart, end: lastEnd }).map(d => format(d, 'yyyy-MM-dd'))

      if (tab === 'todos') {
        setThisMonth(calcTodoDailyRates(thisData.todos || [], thisDates))
        setLastMonth(calcTodoDailyRates(lastData.todos || [], lastDates))
      } else {
        setThisMonth(calcPlanDailyRates(thisData.plans || [], thisDates))
        setLastMonth(calcPlanDailyRates(lastData.plans || [], lastDates))
      }
    } catch (err) {
      console.error('MonthlyLineChart fetch error:', err)
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

  // 포인트 좌표 계산
  const toPoint = (data: DayCompletionRate[], idx: number) => {
    const totalPoints = Math.max(data.length - 1, 1)
    const x = padLeft + (idx / totalPoints) * chartW
    const y = padTop + chartH - (data[idx].rate / 100) * chartH
    return { x, y }
  }

  // polyline 포인트 문자열
  const toPolyline = (data: DayCompletionRate[]) =>
    data.map((_, i) => {
      const p = toPoint(data, i)
      return `${p.x},${p.y}`
    }).join(' ')

  // 영역 채우기 경로
  const toAreaPath = (data: DayCompletionRate[]) => {
    if (data.length === 0) return ''
    const points = data.map((_, i) => toPoint(data, i))
    const startX = points[0].x
    const endX = points[points.length - 1].x
    const baseY = padTop + chartH
    return `M${startX},${baseY} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${endX},${baseY} Z`
  }

  // X축 레이블: 5일 간격
  const xLabels: { day: number; x: number }[] = []
  if (thisMonth.length > 0) {
    const totalPoints = Math.max(thisMonth.length - 1, 1)
    for (let i = 0; i < thisMonth.length; i++) {
      const day = i + 1
      if (day === 1 || day % 5 === 0 || i === thisMonth.length - 1) {
        xLabels.push({ day, x: padLeft + (i / totalPoints) * chartW })
      }
    }
  }

  return (
    <div className="bg-surface-card rounded-xl shadow-lg p-4 mb-6">
      <h2 className="text-lg font-bold text-ink mb-3">📈 월간 비교 (MTD)</h2>
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
          {/* Y축 가이드 라인 */}
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

          {/* 이번 달 영역 채우기 */}
          {thisMonth.length > 0 && (
            <path d={toAreaPath(thisMonth)} fill="var(--c-accent)" opacity={0.08} />
          )}

          {/* 지난 달 점선 */}
          {lastMonth.length > 0 && (
            <polyline
              points={toPolyline(lastMonth)}
              fill="none"
              stroke="var(--c-accent)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.35}
            />
          )}

          {/* 이번 달 실선 */}
          {thisMonth.length > 0 && (
            <polyline
              points={toPolyline(thisMonth)}
              fill="none"
              stroke="var(--c-accent)"
              strokeWidth={2}
            />
          )}

          {/* 이번 달 데이터 포인트 */}
          {thisMonth.map((d, i) => {
            const p = toPoint(thisMonth, i)
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={thisMonth.length > 20 ? 1.5 : 2.5}
                fill="var(--c-accent)"
              />
            )
          })}

          {/* X축 레이블 */}
          {xLabels.map(({ day, x }) => (
            <text
              key={day}
              x={x}
              y={H - 6}
              textAnchor="middle"
              className="fill-ink-muted"
              style={{ fontSize: 9 }}
            >
              {day}일
            </text>
          ))}
        </svg>
      )}

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-ink-secondary">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5" style={{ backgroundColor: 'var(--c-accent)' }} />
          이번 달
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 border-t border-dashed" style={{ borderColor: 'var(--c-accent)', opacity: 0.5 }} />
          지난 달
        </span>
      </div>
    </div>
  )
}
