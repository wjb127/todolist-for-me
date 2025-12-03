'use client'

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { Plus, Trash2, Save, X, Clock, Sparkles, ChevronRight, ChevronDown, ChevronUp, Calendar, ChevronLeft } from 'lucide-react'
import AnimatedCheckbox from '@/components/ui/AnimatedCheckbox'
import confetti from 'canvas-confetti'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTheme } from '@/lib/context/ThemeContext'

type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']

interface PlanItemProps {
  plan: Plan
  onToggleComplete: (id: string, completed: boolean, element?: HTMLElement) => void
  onEdit: (plan: Plan) => void
  onAddChild: (parentId: string) => void
  onMoveUp: (planId: string, parentId: string | null) => void
  onMoveDown: (planId: string, parentId: string | null) => void
  getPriorityColor: (priority: string) => string
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpanded: (planId: string) => void
  childrenPlans?: Plan[]
  hasChildrenFn: (planId: string) => boolean
  getChildPlansFn: (planId: string) => Plan[]
  expandedPlans: Set<string>
  isFirst: boolean
  isLast: boolean
  isMoving: boolean
}

const PlanItem = memo(function PlanItem({ 
  plan, 
  onToggleComplete, 
  onEdit,
  onAddChild,
  onMoveUp,
  onMoveDown,
  getPriorityColor,
  hasChildren,
  isExpanded,
  onToggleExpanded,
  childrenPlans = [],
  hasChildrenFn,
  getChildPlansFn,
  expandedPlans,
  isFirst,
  isLast,
  isMoving
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
                  className="text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-4" />}
              
              {/* 상하 이동 버튼 */}
              <div className="flex flex-col -space-y-1">
                <button
                  onClick={() => onMoveUp(plan.id, plan.parent_id)}
                  disabled={isFirst || isMoving}
                  className={`p-0.5 ${isFirst || isMoving ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                  title="위로 이동"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onMoveDown(plan.id, plan.parent_id)}
                  disabled={isLast || isMoving}
                  className={`p-0.5 ${isLast || isMoving ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                  title="아래로 이동"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              
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
                      ? 'text-gray-500 line-through'
                      : 'text-gray-900'
                  }`}>
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
          {childrenPlans.map((child, index) => {
            const childPlans = getChildPlansFn(child.id)
            return (
              <PlanItem
                key={child.id}
                plan={child}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                getPriorityColor={getPriorityColor}
                hasChildren={hasChildrenFn(child.id)}
                isExpanded={expandedPlans.has(child.id)}
                onToggleExpanded={onToggleExpanded}
                childrenPlans={childPlans}
                hasChildrenFn={hasChildrenFn}
                getChildPlansFn={getChildPlansFn}
                expandedPlans={expandedPlans}
                isFirst={index === 0}
                isLast={index === childrenPlans.length - 1}
                isMoving={isMoving}
              />
            )
          })}
        </div>
      )}
    </div>
  )
})

// 한국 시간 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getKoreanToday = () => {
  const now = new Date()
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return koreanTime.toISOString().split('T')[0]
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
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
  const [isMoving, setIsMoving] = useState(false) // 상하 이동 중 상태
  
  // 테마 시스템 사용
  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle, getFilterButtonStyle } = useTheme()

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('parent_id', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', error)
    } else {
      setPlans(data || [])
      // 모든 계획을 기본적으로 펼친 상태로 설정
      const allPlanIds = new Set(data?.map(p => p.id) || [])
      setExpandedPlans(allPlanIds)
    }
  }

  const handleMoveUp = async (planId: string, parentId: string | null) => {
    // 이미 이동 중이면 무시 (연속 클릭 방지)
    if (isMoving) return
    
    // filteredPlans에서 형제 노드 찾기 (필터링된 데이터 기준으로 이동)
    const siblings = filteredPlans.filter(p => p.parent_id === parentId)
    const currentIndex = siblings.findIndex(p => p.id === planId)
    
    if (currentIndex <= 0) return // 이미 맨 위
    
    const targetPlan = siblings[currentIndex]
    const swapPlan = siblings[currentIndex - 1]
    
    setIsMoving(true)
    
    // 낙관적 업데이트 - UI 즉시 반영
    setPlans(prevPlans => 
      prevPlans.map(p => {
        if (p.id === targetPlan.id) {
          return { ...p, order_index: swapPlan.order_index }
        }
        if (p.id === swapPlan.id) {
          return { ...p, order_index: targetPlan.order_index }
        }
        return p
      })
    )
    
    // 데이터베이스 업데이트 - 트랜잭션 함수 사용
    try {
      const { error } = await supabase.rpc('swap_plan_order', {
        plan_id_1: targetPlan.id,
        plan_id_2: swapPlan.id
      })
      
      if (error) throw error
      
      // 성공 후 데이터 재로드 (다른 변경사항 반영)
      await fetchPlans()
    } catch (error) {
      console.error('Error moving plan up:', error)
      alert('계획 이동 중 오류가 발생했습니다. 다시 시도해주세요.')
      // 에러 발생 시 데이터 재로드하여 롤백
      await fetchPlans()
    } finally {
      setIsMoving(false)
    }
  }

  const handleMoveDown = async (planId: string, parentId: string | null) => {
    // 이미 이동 중이면 무시 (연속 클릭 방지)
    if (isMoving) return
    
    // filteredPlans에서 형제 노드 찾기 (필터링된 데이터 기준으로 이동)
    const siblings = filteredPlans.filter(p => p.parent_id === parentId)
    const currentIndex = siblings.findIndex(p => p.id === planId)
    
    if (currentIndex === -1 || currentIndex >= siblings.length - 1) return // 이미 맨 아래
    
    const targetPlan = siblings[currentIndex]
    const swapPlan = siblings[currentIndex + 1]
    
    setIsMoving(true)
    
    // 낙관적 업데이트 - UI 즉시 반영
    setPlans(prevPlans => 
      prevPlans.map(p => {
        if (p.id === targetPlan.id) {
          return { ...p, order_index: swapPlan.order_index }
        }
        if (p.id === swapPlan.id) {
          return { ...p, order_index: targetPlan.order_index }
        }
        return p
      })
    )
    
    // 데이터베이스 업데이트 - 트랜잭션 함수 사용
    try {
      const { error } = await supabase.rpc('swap_plan_order', {
        plan_id_1: targetPlan.id,
        plan_id_2: swapPlan.id
      })
      
      if (error) throw error
      
      // 성공 후 데이터 재로드 (다른 변경사항 반영)
      await fetchPlans()
    } catch (error) {
      console.error('Error moving plan down:', error)
      alert('계획 이동 중 오류가 발생했습니다. 다시 시도해주세요.')
      // 에러 발생 시 데이터 재로드하여 롤백
      await fetchPlans()
    } finally {
      setIsMoving(false)
    }
  }

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
        
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id)

        if (error) throw error
        
        // 편집된 계획만 로컬 상태에서 직접 업데이트
        setPlans(prevPlans => 
          prevPlans.map(p => 
            p.id === editingPlan.id 
              ? { ...p, ...planData }
              : p
          )
        )
      } else {
        // 새 계획 추가 시 같은 부모의 자식들 중에서 order_index 계산
        const siblingPlans = plans.filter(p => 
          (p.parent_id === formData.parent_id) || 
          (p.parent_id === null && formData.parent_id === null)
        )
        
        // 부모의 depth를 기반으로 새 계획의 depth 계산
        let newDepth = 0
        if (formData.parent_id) {
          const parentPlan = plans.find(p => p.id === formData.parent_id)
          if (parentPlan) {
            newDepth = parentPlan.depth + 1
          }
        }
        
        let newOrderIndex = 0
        if (formData.priority === 'high') {
          // 높음: 같은 부모 하위에서 맨 앞에 배치
          newOrderIndex = 0
        } else if (formData.priority === 'medium') {
          // 보통: 높음 다음에 배치
          const highPrioritySiblings = siblingPlans.filter(p => p.priority === 'high')
          newOrderIndex = highPrioritySiblings.length
        } else {
          // 낮음: 같은 부모 하위에서 맨 뒤에 배치
          newOrderIndex = siblingPlans.length
        }
        
        // 새 계획의 order_index 이상인 기존 형제들의 order_index 증가 (Bulk UPDATE)
        const siblingsToUpdate = siblingPlans.filter(p => p.order_index >= newOrderIndex)
        if (siblingsToUpdate.length > 0) {
          const idsToUpdate = siblingsToUpdate.map(p => p.id)
          const { error: updateError } = await supabase.rpc('increment_plan_order_index', {
            plan_ids: idsToUpdate
          })
          
          if (updateError) {
            console.error('Bulk update error, falling back to individual updates:', updateError)
            for (const plan of siblingsToUpdate) {
              await supabase
                .from('plans')
                .update({ order_index: plan.order_index + 1 })
                .eq('id', plan.id)
            }
          }
        }
        
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
        
        const { data: newPlan, error } = await supabase
          .from('plans')
          .insert(planData as PlanInsert)
          .select()
          .single()

        if (error) throw error
        
        // 낙관적 업데이트: 로컬 상태에 즉시 반영
        const updatedSiblings = plans.map(p => 
          siblingsToUpdate.some(s => s.id === p.id)
            ? { ...p, order_index: p.order_index + 1 }
            : p
        )
        setPlans([...updatedSiblings, newPlan])
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
    const { error } = await supabase
      .from('plans')
      .update({ completed: !completed })
      .eq('id', id)

    if (error) {
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
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting plan:', error)
      } else {
        await fetchPlans()
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
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
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
      default: return 'text-gray-600 bg-gray-50'
    }
  }



  const completedCount = plans.filter(plan => plan.completed).length
  const totalCount = plans.length

  return (
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">계획</h1>
          <button
            onClick={() => openModal()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonStyle()}`}
          >
            <Plus className="h-4 w-4" />
            <span>새 계획</span>
          </button>
        </div>

        <div className={`${getCardStyle()} mb-4`}>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">날짜 선택</label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={getInputStyle()}
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="이전 날"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-center justify-center space-x-2">
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(selectedDate)}
              </div>
              {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                  title="오늘로 가기"
                >
                  오늘
                </button>
              )}
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="다음 날"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`${getCardStyle()} mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">전체 현황</span>
            <span className="text-sm text-gray-600">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

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
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>계획이 없습니다.</p>
              <p className="text-sm">새로운 계획을 추가해보세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topLevelPlans.map((plan, index) => (
                <PlanItem
                  key={plan.id}
                  plan={plan}
                  onToggleComplete={handleToggleComplete}
                  onEdit={openModal}
                  onAddChild={(parentId) => openModal(undefined, parentId)}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  getPriorityColor={getPriorityColor}
                  hasChildren={hasChildren(plan.id)}
                  isExpanded={expandedPlans.has(plan.id)}
                  onToggleExpanded={toggleExpanded}
                  childrenPlans={getChildPlans(plan.id)}
                  hasChildrenFn={hasChildren}
                  getChildPlansFn={getChildPlans}
                  expandedPlans={expandedPlans}
                  isFirst={index === 0}
                  isLast={index === topLevelPlans.length - 1}
                  isMoving={isMoving}
                />
              ))}
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {editingPlan ? '계획 편집' : '새 계획'}
                  </h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계획 제목 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={getInputStyle()}
                    placeholder="계획 제목을 입력하세요"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
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
                    rows={aiSuggestion ? 8 : 3}
                    placeholder="계획에 대한 상세 설명을 입력하세요 (선택사항)"
                  />
                  
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className={getInputStyle()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    우선순위
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className={getInputStyle()}
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex space-x-2">
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
        )}
      </div>
    </div>
  )
}
