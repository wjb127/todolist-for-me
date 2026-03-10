'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Brain, Loader2, RefreshCw, CheckSquare, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { format, subDays, addDays, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'

type TopTab = 'todo' | 'plans'
type TodoSubTab = 'weekly' | 'routine' | 'trend'
type PlansSubTab = 'plans' | 'priority' | 'deadline'
type AnalysisType = TodoSubTab | PlansSubTab

interface WeeklyStats { totalCompleted: number; totalTodos: number; completionRate: number; prevWeekRate: number; bestDay: string; worstDay: string }
interface RoutineStats { activeRoutineCount: number; avgCompletionRate: number; topItem: string; bottomItem: string }
interface TrendStats { avgRate: number; weekCount: number; improving: boolean }
interface PlansStats { totalPlans: number; completedPlans: number; overdueCount: number; avgCompletionDays: number }
interface PriorityStats { highRate: number; mediumRate: number; lowRate: number }
interface DeadlineStats { totalWithDue: number; totalWithoutDue: number; overdueCount: number; onTimeRate: number }

type StatsType = WeeklyStats | RoutineStats | TrendStats | PlansStats | PriorityStats | DeadlineStats

const todoSubTabs: { key: TodoSubTab; label: string }[] = [
  { key: 'weekly', label: '주간 리뷰' },
  { key: 'routine', label: '루틴 분석' },
  { key: 'trend', label: '완료 트렌드' },
]

const plansSubTabs: { key: PlansSubTab; label: string }[] = [
  { key: 'plans', label: '계획 패턴' },
  { key: 'priority', label: '우선순위' },
  { key: 'deadline', label: '기한 관리' },
]

export default function AiAnalysisPage() {
  const { getBackgroundStyle, getCardStyle, getFilterButtonStyle } = useTheme()
  const [topTab, setTopTab] = useState<TopTab>('todo')
  const [todoSub, setTodoSub] = useState<TodoSubTab>('weekly')
  const [plansSub, setPlansSub] = useState<PlansSubTab>('plans')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [analyses, setAnalyses] = useState<Record<string, string>>({})
  const [statsMap, setStatsMap] = useState<Record<string, StatsType | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const activeType: AnalysisType = topTab === 'todo' ? todoSub : plansSub
  const analysis = analyses[activeType] || ''
  const stats = statsMap[activeType] || null
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  // 날짜 변경 시 저장된 리포트 로드
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const res = await fetch(`/api/ai-reports?date=${dateStr}`)
        if (!res.ok) return
        const { reports } = await res.json()

        const savedAnalyses: Record<string, string> = {}
        const savedStats: Record<string, StatsType | null> = {}
        if (reports && reports.length > 0) {
          for (const report of reports) {
            savedAnalyses[report.type] = report.content
            if (report.stats) savedStats[report.type] = report.stats
          }
        }
        setAnalyses(savedAnalyses)
        setStatsMap(savedStats)
      } catch {
        // 로드 실패 무시
      }
    }
    loadSavedReports()
  }, [dateStr])

  // 리포트 DB 저장
  const saveReport = useCallback(async (type: string, content: string, reportStats: StatsType | null, reportDate: string) => {
    try {
      await fetch('/api/ai-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, stats: reportStats, report_date: reportDate }),
      })
    } catch {
      // 저장 실패 무시
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setIsStreaming(true)
    const currentType = activeType
    const currentDateStr = dateStr
    setAnalyses(prev => ({ ...prev, [currentType]: '' }))

    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: currentType }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('API 오류')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let currentStats: StatsType | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'stats') {
              currentStats = data.stats
              setStatsMap(prev => ({ ...prev, [currentType]: data.stats }))
              setIsLoading(false)
            } else if (data.type === 'chunk') {
              fullContent += data.text
              setAnalyses(prev => ({ ...prev, [currentType]: (prev[currentType] || '') + data.text }))
            } else if (data.type === 'done') {
              setIsStreaming(false)
              saveReport(currentType, fullContent, currentStats, currentDateStr)
            } else if (data.type === 'error') {
              setAnalyses(prev => ({ ...prev, [currentType]: '<p style="color:#ef4444">분석 중 오류가 발생했습니다.</p>' }))
              setIsStreaming(false)
            }
          } catch {
            // 파싱 실패 무시
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setAnalyses(prev => ({ ...prev, [currentType]: '<p style="color:#ef4444">분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>' }))
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [activeType, dateStr, saveReport])

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '-'
    const d = new Date(dateStr)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`
  }

  const StatCard = ({ label, value, color = 'text-accent' }: { label: string; value: string | number; color?: string }) => (
    <div className={`${getCardStyle()} rounded-xl p-3 text-center`}>
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
    </div>
  )

  const renderStats = () => {
    if (!stats) return null

    switch (activeType) {
      case 'weekly': {
        const s = stats as WeeklyStats
        const diff = s.completionRate - s.prevWeekRate
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="완료율" value={`${s.completionRate}%`} />
            <StatCard label="전주 대비" value={`${diff > 0 ? '+' : ''}${diff}%`} color={diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-ink-muted'} />
            <StatCard label="최고의 날" value={formatDateLabel(s.bestDay)} color="text-ink" />
          </div>
        )
      }
      case 'routine': {
        const s = stats as RoutineStats
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="루틴 항목" value={`${s.activeRoutineCount}개`} />
            <StatCard label="평균 완료율" value={`${s.avgCompletionRate}%`} />
            <StatCard label="최저 항목" value={s.bottomItem} color="text-ink" />
          </div>
        )
      }
      case 'trend': {
        const s = stats as TrendStats
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="4주 평균" value={`${s.avgRate}%`} />
            <StatCard label="분석 기간" value={`${s.weekCount}주`} color="text-ink" />
            <StatCard label="추세" value={s.improving ? '상승' : '하락'} color={s.improving ? 'text-green-500' : 'text-red-500'} />
          </div>
        )
      }
      case 'plans': {
        const s = stats as PlansStats
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="총 계획" value={`${s.totalPlans}개`} />
            <StatCard label="완료" value={`${s.completedPlans}개`} color="text-green-500" />
            <StatCard label="기한 초과" value={`${s.overdueCount}개`} color={s.overdueCount > 0 ? 'text-red-500' : 'text-ink-muted'} />
          </div>
        )
      }
      case 'priority': {
        const s = stats as PriorityStats
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="높음 완료율" value={`${s.highRate}%`} color="text-red-500" />
            <StatCard label="보통 완료율" value={`${s.mediumRate}%`} color="text-yellow-500" />
            <StatCard label="낮음 완료율" value={`${s.lowRate}%`} color="text-blue-500" />
          </div>
        )
      }
      case 'deadline': {
        const s = stats as DeadlineStats
        return (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="기한 설정" value={`${s.totalWithDue}개`} />
            <StatCard label="기한 초과" value={`${s.overdueCount}개`} color={s.overdueCount > 0 ? 'text-red-500' : 'text-ink-muted'} />
            <StatCard label="기한 내 완료" value={`${s.onTimeRate}%`} color="text-green-500" />
          </div>
        )
      }
    }
  }

  return (
    <div className={`min-h-screen ${getBackgroundStyle()}`}>
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-bold text-ink">AI 분석</h1>
        </div>

        {/* 날짜 네비게이션 */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => setSelectedDate(prev => subDays(prev, 1))}
            className="p-1.5 rounded-lg text-ink-secondary active:bg-surface-hover"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-sm font-medium text-ink min-w-[120px] text-center"
          >
            {isToday(selectedDate)
              ? `오늘 (${format(selectedDate, 'M/d')})`
              : format(selectedDate, 'yyyy. M. d (EEE)', { locale: ko })
            }
          </button>
          <button
            onClick={() => setSelectedDate(prev => addDays(prev, 1))}
            disabled={isToday(selectedDate)}
            className="p-1.5 rounded-lg text-ink-secondary active:bg-surface-hover disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* 상위 탭 */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTopTab('todo')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${getFilterButtonStyle(topTab === 'todo')}`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>TODO</span>
          </button>
          <button
            onClick={() => setTopTab('plans')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${getFilterButtonStyle(topTab === 'plans')}`}
          >
            <Target className="h-4 w-4" />
            <span>계획</span>
          </button>
        </div>

        {/* 하위 탭 */}
        <div className="flex gap-2 mb-4">
          {topTab === 'todo'
            ? todoSubTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setTodoSub(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${getFilterButtonStyle(todoSub === tab.key)}`}
                >
                  {tab.label}
                </button>
              ))
            : plansSubTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPlansSub(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${getFilterButtonStyle(plansSub === tab.key)}`}
                >
                  {tab.label}
                </button>
              ))
          }
        </div>

        {/* 요약 카드 */}
        {renderStats()}

        {/* 리포트 생성 버튼 - 오늘만 생성 가능 */}
        {isToday(selectedDate) ? (
          <button
            onClick={handleGenerate}
            disabled={isLoading || isStreaming}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors mb-4 ${
              isLoading || isStreaming
                ? 'bg-accent/50 text-white/70 cursor-not-allowed'
                : 'bg-accent text-white active:bg-accent/80'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                데이터 수집 중...
              </>
            ) : isStreaming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                리포트 작성 중...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {analysis ? '다시 분석하기' : '리포트 생성'}
              </>
            )}
          </button>
        ) : null}

        {/* 분석 결과 (HTML 스트리밍 렌더링) */}
        {analysis && (
          <div
            className={`${getCardStyle()} rounded-xl p-4 ai-report`}
            dangerouslySetInnerHTML={{ __html: analysis }}
          />
        )}

        {/* 비어있을 때 안내 */}
        {!analysis && !isLoading && !isStreaming && (
          <div className={`${getCardStyle()} rounded-xl p-8 text-center`}>
            <Brain className="h-10 w-10 text-ink-muted mx-auto mb-3" />
            <p className="text-sm text-ink-muted">
              {isToday(selectedDate)
                ? <>리포트 생성 버튼을 눌러<br />AI 분석을 시작하세요</>
                : '이 날짜에 저장된 리포트가 없습니다'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
