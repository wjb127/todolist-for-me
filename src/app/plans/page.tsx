'use client'

import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react'
import { Plus, Trash2, Save, X, Clock, Sparkles, ChevronRight, ChevronDown, Calendar, ChevronLeft, RefreshCw, GripVertical } from 'lucide-react'
import AnimatedCheckbox from '@/components/ui/AnimatedCheckbox'
import confetti from 'canvas-confetti'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, MeasuringStrategy, type DragEndEvent, type DragStartEvent, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Database } from '@/lib/database.types'
import { useTheme } from '@/lib/context/ThemeContext'
import Portal from '@/components/ui/Portal'

type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']

interface PlanItemProps {
  plan: Plan
  onToggleComplete: (id: string, completed: boolean, element?: HTMLElement) => void
  onEdit: (plan: Plan) => void
  onAddChild: (parentId: string) => void
  getPriorityColor: (priority: string) => string
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpanded: (planId: string) => void
  childrenPlans?: Plan[]
  hasChildrenFn: (planId: string) => boolean
  getChildPlansFn: (planId: string) => Plan[]
  expandedPlans: Set<string>
  dragHandleListeners?: DraggableSyntheticListeners
  dragHandleAttributes?: DraggableAttributes
  onDragEnd: (event: DragEndEvent) => void
  sensors: ReturnType<typeof useSensors>
}

const PlanItem = memo(function PlanItem({
  plan,
  onToggleComplete,
  onEdit,
  onAddChild,
  getPriorityColor,
  hasChildren,
  isExpanded,
  onToggleExpanded,
  childrenPlans = [],
  hasChildrenFn,
  getChildPlansFn,
  expandedPlans,
  dragHandleListeners,
  dragHandleAttributes,
  onDragEnd,
  sensors
}: PlanItemProps) {
  const { getCardStyle } = useTheme()
  const checkboxRef = React.useRef<HTMLDivElement>(null)

  return (
    <div>
      <div
        className={getCardStyle()}
        data-plan-id={plan.id}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-1">
              {/* 펼치기/접기 버튼 */}
              {hasChildren && (
                <button
                  onClick={() => onToggleExpanded(plan.id)}
                  className="text-ink-muted hover:text-ink-secondary"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-4" />}

              {/* 드래그 핸들 */}
              <button
                {...dragHandleListeners}
                {...dragHandleAttributes}
                className="touch-none p-1 text-ink-muted hover:text-ink-secondary cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <div ref={checkboxRef}>
                <AnimatedCheckbox
                  checked={plan.completed}
                  onChange={() => onToggleComplete(plan.id, plan.completed, checkboxRef.current || undefined)}
                  size="md"
                  className="mr-2"
                />
              </div>
              <div className="flex-1">
                <div
                  className="cursor-pointer"
                  onClick={() => onEdit(plan)}
                >
                  <h3 className={`font-semibold ${
                    plan.completed
                      ? 'text-ink-muted line-through'
                      : 'text-ink'
                  }`}>
                    {plan.scheduled_start && (
                      <span className="text-xs font-mono text-accent mr-1.5">
                        {plan.scheduled_start}
                      </span>
                    )}
                    {plan.title}
                  </h3>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center ml-4 space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(plan.id)
              }}
              className="p-1 text-blue-500 hover:text-blue-600"
              title="하위 계획 추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 하위 계획들 렌더링 */}
      {isExpanded && hasChildren && childrenPlans.length > 0 && (
        <div className="ml-4 mt-2 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
            <SortableContext items={childrenPlans.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {childrenPlans.map((child) => {
                const childPlans = getChildPlansFn(child.id)
                return (
                  <SortablePlanItem
                    key={child.id}
                    plan={child}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEdit}
                    onAddChild={onAddChild}
                    getPriorityColor={getPriorityColor}
                    hasChildren={hasChildrenFn(child.id)}
                    isExpanded={expandedPlans.has(child.id)}
                    onToggleExpanded={onToggleExpanded}
                    childrenPlans={childPlans}
                    hasChildrenFn={hasChildrenFn}
                    getChildPlansFn={getChildPlansFn}
                    expandedPlans={expandedPlans}
                    onDragEnd={onDragEnd}
                    sensors={sensors}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
})

// SortablePlanItem 래퍼 - useSortable 훅으로 DnD 기능 부여
function SortablePlanItem({ plan, ...props }: PlanItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <PlanItem
        plan={plan}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
        {...props}
      />
    </div>
  )
}

// DragOverlay용 간단 컴포넌트 — backdrop-filter 미적용 (모바일 stacking context 이슈 방지)
function PlanItemOverlay({ plan }: { plan: Plan }) {
  return (
    <div className="bg-surface-card opacity-90 shadow-xl rounded-lg border border-outline">
      <div className="flex items-center space-x-2 p-2">
        <GripVertical className="h-4 w-4 text-ink-muted" />
        <span className="text-sm font-semibold text-ink">{plan.title}</span>
      </div>
    </div>
  )
}

// 한국 시간 기준 날짜를 YYYY-MM-DD 형식으로 반환
const formatToKoreanDateString = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

// 한국 시간 기준 오늘 날짜
const getKoreanToday = () => formatToKoreanDateString(new Date())

// 한국 시간 기준 날짜 이동 (days: 양수면 미래, 음수면 과거)
const addDaysKorean = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [selectedDate, setSelectedDate] = useState(getKoreanToday())
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: getKoreanToday(), // 한국 시간 기준 오늘 날짜로 기본 설정
    priority: 'high' as 'low' | 'medium' | 'high',
    parent_id: null as string | null
  })
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false) // 새로고침 중 상태
  const [currentKoreanTime, setCurrentKoreanTime] = useState('')
  const [isScheduleLoading, setIsScheduleLoading] = useState(false)
  const [schedulePreview, setSchedulePreview] = useState<Array<{
    plan_id: string; start_time: string; end_time: string
  }> | null>(null)
  const [isApplyingSchedule, setIsApplyingSchedule] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [isMobilePwa, setIsMobilePwa] = useState(false)

  // 테마 시스템 사용
  const { theme, getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle, getFilterButtonStyle } = useTheme()

  // DnD 센서 설정
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 }
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 }
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  // 현재 한국 시각 갱신 (1분마다)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const time = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now).replace(/[^0-9:]/g, '')
      setCurrentKoreanTime(time)
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    const updateMobilePwaState = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      const mobileViewport = window.matchMedia('(max-width: 768px)').matches

      setIsMobilePwa((standalone || iosStandalone) && mobileViewport)
    }

    updateMobilePwaState()

    const displayModeQuery = window.matchMedia('(display-mode: standalone)')
    const mobileQuery = window.matchMedia('(max-width: 768px)')

    displayModeQuery.addEventListener('change', updateMobilePwaState)
    mobileQuery.addEventListener('change', updateMobilePwaState)

    return () => {
      displayModeQuery.removeEventListener('change', updateMobilePwaState)
      mobileQuery.removeEventListener('change', updateMobilePwaState)
    }
  }, [])

  useEffect(() => {
    if (!isModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isModalOpen])

  // 모달이 열릴 때 제목 입력 필드에 포커스
  useEffect(() => {
    if (isModalOpen && titleInputRef.current) {
      // 약간의 딜레이 후 포커스 (모달 애니메이션 고려)
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 50)
    }
  }, [isModalOpen])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      if (!res.ok) throw new Error('Failed to fetch plans')
      const data = await res.json()
      setPlans(data || [])
      // 모든 계획을 기본적으로 펼친 상태로 설정
      const allPlanIds = new Set<string>(data?.map((p: Plan) => p.id) || [])
      setExpandedPlans(allPlanIds)
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchPlans()
    } finally {
      setIsRefreshing(false)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    setPlans(prevPlans => {
      const activePlan = prevPlans.find(p => p.id === active.id)
      const overPlan = prevPlans.find(p => p.id === over.id)
      if (!activePlan || !overPlan) return prevPlans
      // 다른 부모면 무시 (같은 레벨 내에서만 재정렬)
      if (activePlan.parent_id !== overPlan.parent_id) return prevPlans

      const parentId = activePlan.parent_id
      const siblings = prevPlans
        .filter(p => p.parent_id === parentId)
        .sort((a, b) => a.order_index - b.order_index)

      const oldIndex = siblings.findIndex(p => p.id === active.id)
      const newIndex = siblings.findIndex(p => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prevPlans

      const reordered = arrayMove(siblings, oldIndex, newIndex)

      // 배열 전체 재번호 (order_index 꼬임 방지)
      const updates = reordered.map((p, i) => ({ id: p.id, order_index: i }))

      // API 호출 (비동기, 실패 시 fetchPlans로 롤백)
      fetch('/api/plans/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates })
      }).catch(() => fetchPlans())

      return prevPlans.map(p => {
        const update = updates.find(u => u.id === p.id)
        return update ? { ...p, order_index: update.order_index } : p
      })
    })
  }, [])

  const handleSavePlan = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      if (editingPlan) {
        const planData = {
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          parent_id: formData.parent_id,
          order_index: editingPlan.order_index
        }

        const res = await fetch(`/api/plans/${editingPlan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        })

        if (!res.ok) throw new Error('Failed to update plan')

        // 편집된 계획만 로컬 상태에서 직접 업데이트
        setPlans(prevPlans =>
          prevPlans.map(p =>
            p.id === editingPlan.id
              ? { ...p, ...planData }
              : p
          )
        )
      } else {
        // 새 계획 추가 시 같은 부모 + 같은 날짜의 형제들 중에서 order_index 계산
        const siblingPlans = plans.filter(p => {
          const sameParent = (p.parent_id === formData.parent_id) ||
            (p.parent_id === null && formData.parent_id === null)
          const sameDate = p.due_date === formData.due_date
          return sameParent && sameDate
        })

        // 부모의 depth를 기반으로 새 계획의 depth 계산
        let newDepth = 0
        if (formData.parent_id) {
          const parentPlan = plans.find(p => p.id === formData.parent_id)
          if (parentPlan) {
            newDepth = parentPlan.depth + 1
          }
        }

        // order_index 계산: 높음은 min-1, 보통은 max+1
        let newOrderIndex = 0
        if (siblingPlans.length > 0) {
          const orderIndices = siblingPlans.map(p => p.order_index)
          if (formData.priority === 'high') {
            // 높음: 현재 날짜 구간에서 제일 낮은 order_index - 1
            newOrderIndex = Math.min(...orderIndices) - 1
          } else {
            // 보통: 현재 날짜 구간에서 제일 높은 order_index + 1
            newOrderIndex = Math.max(...orderIndices) + 1
          }
        }
        // 형제가 없으면 기본값 0 사용

        const planData = {
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          parent_id: formData.parent_id,
          order_index: newOrderIndex,
          depth: newDepth,
          completed: false
        }

        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        })

        if (!res.ok) throw new Error('Failed to create plan')
        const newPlan = await res.json()

        // 낙관적 업데이트: 로컬 상태에 즉시 반영
        setPlans([...plans, newPlan])
        setExpandedPlans(prev => new Set([...prev, newPlan.id]))
      }

      closeModal()
    } catch (error) {
      console.error('Error saving plan:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const triggerConfetti = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight

    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x, y },
      colors: ['#3b82f6', '#60a5fa', '#93c5fd'],
      gravity: 1.2,
      scalar: 0.8,
      ticks: 150
    })
  }, [])

  const handleToggleComplete = useCallback(async (id: string, completed: boolean, element?: HTMLElement) => {
    // 완료 시 confetti 효과
    if (!completed && element) {
      triggerConfetti(element)
    }

    // 낙관적 업데이트 - UI를 즉시 업데이트
    setPlans(prevPlans =>
      prevPlans.map(p =>
        p.id === id ? { ...p, completed: !completed } : p
      )
    )

    // 백그라운드에서 데이터베이스 업데이트
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })

      if (!res.ok) throw new Error('Failed to update plan')
    } catch (error) {
      console.error('Error updating plan:', error)
      // 에러 발생 시 롤백
      setPlans(prevPlans =>
        prevPlans.map(p =>
          p.id === id ? { ...p, completed: completed } : p
        )
      )
    }
  }, [triggerConfetti])

  const handleDeletePlan = async (id: string) => {
    if (confirm('계획을 삭제하시겠습니까?')) {
      try {
        const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete plan')
        await fetchPlans()
      } catch (error) {
        console.error('Error deleting plan:', error)
      }
    }
  }

  const openModal = (plan?: Plan, parentId?: string) => {
    setEditingPlan(plan || null)
    setFormData({
      title: plan?.title || '',
      description: plan?.description || '',
      due_date: plan?.due_date || selectedDate,
      priority: plan?.priority || 'high',
      parent_id: plan?.parent_id || parentId || null
    })
    setIsModalOpen(true)

    // 하위 계획 추가시 해당 부모 계획으로 스크롤
    if (parentId) {
      setTimeout(() => {
        const parentElement = document.querySelector(`[data-plan-id="${parentId}"]`)
        if (parentElement) {
          parentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      }, 100)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPlan(null)
    setFormData({ title: '', description: '', due_date: selectedDate, priority: 'high', parent_id: null })
    setAiSuggestion('')
    setIsAiLoading(false)
    setIsSaving(false)
  }

  const handleAiHelp = async () => {
    if (!formData.title.trim()) {
      alert('계획 제목을 먼저 입력해주세요.')
      return
    }

    setIsAiLoading(true)
    try {
      const response = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          dueDate: formData.due_date,
          priority: formData.priority,
        }),
      })

      if (!response.ok) {
        throw new Error('AI 요청에 실패했습니다.')
      }

      const data = await response.json()
      setAiSuggestion(data.suggestion)
    } catch (error) {
      console.error('AI 도웄 오류:', error)
      alert('AI 도웄 기능에 오류가 발생했습니다.')
    } finally {
      setIsAiLoading(false)
    }
  }

  const applyAiSuggestion = () => {
    if (aiSuggestion) {
      setFormData(prev => ({
        ...prev,
        description: prev.description + (prev.description ? '\n\n' : '') + aiSuggestion
      }))
      setAiSuggestion('')
    }
  }

  // 시간 배치: AI에게 스케줄 요청
  const handleSchedule = async () => {
    const incompletePlans = plans.filter(p =>
      p.due_date === selectedDate && !p.completed
    )

    if (incompletePlans.length === 0) {
      alert('배치할 미완료 계획이 없습니다.')
      return
    }

    setIsScheduleLoading(true)
    setSchedulePreview(null)

    try {
      const now = new Date()
      const koreanTime = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now)
      const currentTime = koreanTime.replace(/[^0-9:]/g, '')

      const response = await fetch('/api/plans/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plans: incompletePlans.map(p => ({
            id: p.id,
            title: p.title,
            priority: p.priority,
            description: p.description
          })),
          currentTime
        })
      })

      if (!response.ok) {
        throw new Error('시간 배치 요청에 실패했습니다.')
      }

      const data = await response.json()
      setSchedulePreview(data.schedule)
    } catch (error) {
      console.error('시간 배치 오류:', error)
      alert('시간 배치에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsScheduleLoading(false)
    }
  }

  // 시간 배치 결과를 DB에 적용
  const handleApplySchedule = async () => {
    if (!schedulePreview) return

    setIsApplyingSchedule(true)
    try {
      // 시간순 정렬 후 order_index도 함께 갱신 (화살표 이동과 호환)
      const sorted = [...schedulePreview].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )

      const updatePromises = sorted.map((item, idx) =>
        fetch(`/api/plans/${item.plan_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduled_start: item.start_time,
            scheduled_end: item.end_time,
            order_index: idx
          })
        })
      )

      const results = await Promise.all(updatePromises)
      const allOk = results.every(r => r.ok)

      if (!allOk) {
        throw new Error('일부 계획의 시간 배치 저장에 실패했습니다.')
      }

      // 로컬 상태 즉시 반영
      setPlans(prevPlans =>
        prevPlans.map(p => {
          const sortedIdx = sorted.findIndex(s => s.plan_id === p.id)
          if (sortedIdx !== -1) {
            return {
              ...p,
              scheduled_start: sorted[sortedIdx].start_time,
              scheduled_end: sorted[sortedIdx].end_time,
              order_index: sortedIdx
            }
          }
          return p
        })
      )

      setSchedulePreview(null)
    } catch (error) {
      console.error('시간 배치 적용 오류:', error)
      alert('시간 배치 저장에 실패했습니다.')
    } finally {
      setIsApplyingSchedule(false)
    }
  }

  const handleCancelSchedule = () => {
    setSchedulePreview(null)
  }

  // 내일로 미루기: due_date를 내일로 변경하고 시간 배치 초기화
  const handlePostpone = async () => {
    if (!editingPlan) return

    const tomorrow = addDaysKorean(selectedDate, 1)

    try {
      const response = await fetch(`/api/plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          due_date: tomorrow,
          scheduled_start: null,
          scheduled_end: null
        })
      })

      if (!response.ok) throw new Error('미루기 실패')

      // 로컬 상태 반영 (오늘 목록에서 사라짐)
      setPlans(prev => prev.map(p =>
        p.id === editingPlan.id
          ? { ...p, due_date: tomorrow, scheduled_start: null, scheduled_end: null }
          : p
      ))

      closeModal()
    } catch (error) {
      console.error('미루기 오류:', error)
      alert('미루기에 실패했습니다.')
    }
  }

  const toggleExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(planId)) {
        newSet.delete(planId)
      } else {
        newSet.add(planId)
      }
      return newSet
    })
  }

  const hasChildren = (planId: string): boolean => {
    return filteredPlans.some(plan => plan.parent_id === planId)
  }

  const getChildPlans = (planId: string): Plan[] => {
    return filteredPlans
      .filter(plan => plan.parent_id === planId)
      .sort((a, b) => a.order_index - b.order_index)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'M월 d일 (E)', { locale: ko })
  }

  const goToPreviousDay = () => {
    setSelectedDate(addDaysKorean(selectedDate, -1))
  }

  const goToNextDay = () => {
    setSelectedDate(addDaysKorean(selectedDate, 1))
  }

  const goToToday = () => {
    setSelectedDate(getKoreanToday())
  }

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      // 완료 상태 필터
      if (filter === 'pending' && plan.completed) return false
      if (filter === 'completed' && !plan.completed) return false

      // 날짜 필터 - due_date가 선택한 날짜와 같은 것만
      if (plan.due_date && plan.due_date !== selectedDate) return false

      return true
    })
  }, [plans, filter, selectedDate])

  // 최상위 계획들만 가져오기 (부모가 없는 계획들)
  const topLevelPlans = useMemo(() => {
    return filteredPlans
      .filter(plan => !plan.parent_id)
      .sort((a, b) => a.order_index - b.order_index)
  }, [filteredPlans])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-ink-secondary bg-surface-hover'
    }
  }



  const completedCount = plans.filter(plan => plan.completed).length
  const totalCount = plans.length
  const datePlans = plans.filter(plan => plan.due_date === selectedDate)
  const dateCompletedCount = datePlans.filter(plan => plan.completed).length
  const dateTotalCount = datePlans.length

  return (
    <>
    {/* 플로팅 새 계획 버튼 - 최상위에 배치하여 fixed 보장 */}
    {!isModalOpen && (
      <button
        onClick={() => openModal()}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover active:scale-95 transition-transform flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </button>
    )}
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">계획</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg ${getButtonStyle()} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="새로고침"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => openModal()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonStyle()}`}
            >
              <Plus className="h-4 w-4" />
              <span>새 계획</span>
            </button>
          </div>
        </div>

        <div className={`${getCardStyle()} mb-4`}>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-5 w-5 text-ink-muted" />
            <label className="text-sm font-medium text-ink-secondary">날짜 선택</label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={getInputStyle()}
            style={{ width: '320px' }}
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-lg transition-colors"
              title="이전 날"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-center justify-center space-x-2">
              <div className="text-lg font-semibold text-ink">
                {formatDate(selectedDate)}
              </div>
              {selectedDate === getKoreanToday() && (
                <span className="px-2 py-0.5 text-xs font-medium text-accent bg-accent-soft rounded-full">
                  오늘
                </span>
              )}
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-lg transition-colors"
              title="다음 날"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`${getCardStyle()} mb-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-secondary">이 날 한 일</span>
            <span className="text-sm text-ink-secondary">{dateCompletedCount}/{dateTotalCount}</span>
          </div>
          <div className="w-full bg-track rounded-full h-2 mb-3">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: dateTotalCount > 0 ? `${(dateCompletedCount / dateTotalCount) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-secondary">전체 현황</span>
            <span className="text-xs text-ink-muted">{completedCount}/{totalCount}</span>
          </div>
        </div>

        {/* 시간 배치 버튼 */}
        <div className="mb-4">
          <button
            onClick={handleSchedule}
            disabled={isScheduleLoading}
            className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-medium transition-colors ${
              isScheduleLoading
                ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:bg-purple-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{isScheduleLoading ? 'AI 배치 중...' : `시간 배치`}</span>
            {currentKoreanTime && !isScheduleLoading && (
              <span className="text-xs font-mono opacity-70">({currentKoreanTime} 기준)</span>
            )}
            {isScheduleLoading && (
              <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full" />
            )}
          </button>
        </div>

        {/* 시간 배치 미리보기 */}
        {schedulePreview && (
          <div className={`${getCardStyle()} mb-4 border-2 border-purple-300`}>
            <div className="flex items-center space-x-1.5 mb-3">
              <Clock className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-ink">시간 배치 결과</h3>
            </div>

            <div className="space-y-2 mb-4">
              {schedulePreview
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map(item => {
                  const plan = plans.find(p => p.id === item.plan_id)
                  if (!plan) return null
                  return (
                    <div
                      key={item.plan_id}
                      className="flex items-center space-x-3 p-2.5 rounded-lg bg-surface-hover"
                    >
                      <div className="text-sm font-mono font-semibold text-purple-600 whitespace-nowrap">
                        {item.start_time}-{item.end_time}
                      </div>
                      <div className="flex-1 text-sm text-ink truncate">
                        {plan.title}
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleApplySchedule}
                disabled={isApplyingSchedule}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplyingSchedule ? '적용 중...' : '적용'}
              </button>
              <button
                onClick={handleSchedule}
                disabled={isScheduleLoading}
                className="flex-1 py-2.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                다시 배치
              </button>
              <button
                onClick={handleCancelSchedule}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-ink-secondary bg-surface-hover"
              >
                취소
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-1 mb-4">
          {(['all', 'pending', 'completed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={getFilterButtonStyle(filter === filterType)}
            >
              {filterType === 'all' && '전체'}
              {filterType === 'pending' && '진행중'}
              {filterType === 'completed' && '완료'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {topLevelPlans.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>계획이 없습니다.</p>
              <p className="text-sm">새로운 계획을 추가해보세요.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={topLevelPlans.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {topLevelPlans.map((plan) => (
                    <SortablePlanItem
                      key={plan.id}
                      plan={plan}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openModal}
                      onAddChild={(parentId) => openModal(undefined, parentId)}
                      getPriorityColor={getPriorityColor}
                      hasChildren={hasChildren(plan.id)}
                      isExpanded={expandedPlans.has(plan.id)}
                      onToggleExpanded={toggleExpanded}
                      childrenPlans={getChildPlans(plan.id)}
                      hasChildrenFn={hasChildren}
                      getChildPlansFn={getChildPlans}
                      expandedPlans={expandedPlans}
                      onDragEnd={handleDragEnd}
                      sensors={sensors}
                    />
                  ))}
                </div>
              </SortableContext>
              <Portal>
                <DragOverlay zIndex={80}>
                  {activeId && plans.find(p => p.id === activeId) ? (
                    <PlanItemOverlay plan={plans.find(p => p.id === activeId)!} />
                  ) : null}
                </DragOverlay>
              </Portal>
            </DndContext>
          )}
        </div>

        {isModalOpen && (
          <Portal>
          <div
            className={isMobilePwa ? 'mobile-sheet-backdrop' : getModalBackdropStyle()}
            onClick={closeModal}
          >
            <div
              className={`${getModalStyle()} ${isMobilePwa ? `mobile-bottom-sheet ${theme === 'glassmorphism' ? 'mobile-glass-sheet' : ''}` : 'w-full max-w-md'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-outline">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {editingPlan ? '계획 편집' : '새 계획'}
                  </h2>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={handleSavePlan}
                      disabled={!formData.title || isSaving}
                      className="px-2.5 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <Save className="h-3 w-3" />
                      <span>{isSaving ? '저장 중' : '저장'}</span>
                    </button>
                    {editingPlan && (
                      <button
                        onClick={handlePostpone}
                        className="px-2.5 py-1.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-200 flex items-center space-x-1"
                      >
                        <ChevronRight className="h-3 w-3" />
                        <span>미루기</span>
                      </button>
                    )}
                    <button onClick={closeModal} className="p-2 hover:bg-surface-hover rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    계획 제목 *
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && formData.title && !isSaving) {
                        e.preventDefault()
                        handleSavePlan()
                      }
                    }}
                    className={getInputStyle()}
                    placeholder="계획 제목을 입력하세요"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-ink-secondary">
                      계획 내용
                    </label>
                    <button
                      type="button"
                      onClick={handleAiHelp}
                      disabled={isAiLoading || !formData.title}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{isAiLoading ? 'AI 분석 중...' : 'AI 도움'}</span>
                    </button>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={getInputStyle()}
                    rows={aiSuggestion ? 4 : 1}
                    placeholder="상세 설명 (선택사항)"
                  />
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    disabled={!formData.title || isSaving}
                    className="mt-2 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <Save className="h-3 w-3" />
                    <span>{isSaving ? '저장 중...' : '저장'}</span>
                  </button>

                  {/* AI 추천 결과 */}
                  {aiSuggestion && (
                    <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-purple-900 flex items-center space-x-1">
                          <Sparkles className="h-4 w-4" />
                          <span>AI 추천 액션플랜</span>
                        </h4>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={applyAiSuggestion}
                            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            내용에 추가
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiSuggestion('')}
                            className="text-xs px-2 py-1 text-purple-600 hover:text-purple-800"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-purple-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {aiSuggestion}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className={getInputStyle()}
                    style={{ width: isMobilePwa ? '100%' : '320px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    상위 계획
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                    className={getInputStyle()}
                  >
                    <option value="">최상위 계획</option>
                    {plans
                      .filter(plan =>
                        plan.id !== editingPlan?.id && // 자기 자신 제외
                        plan.depth < 3 // 최대 깊이 제한
                      )
                      .map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {'└'.repeat(plan.depth)} {plan.title}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    우선순위
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className={getInputStyle()}
                  >
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-outline flex space-x-2">
                <button
                  onClick={handleSavePlan}
                  disabled={!formData.title || isSaving}
                  className={`flex-1 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${getButtonStyle()}`}
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? '저장 중...' : '저장'}</span>
                </button>
                {editingPlan && (
                  <button
                    onClick={() => {
                      handleDeletePlan(editingPlan.id)
                      closeModal()
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>삭제</span>
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className={`px-4 py-2 rounded-lg ${getCardStyle()} hover:opacity-80`}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}
      </div>
    </div>
    </>
  )
}
