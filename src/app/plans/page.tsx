'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle2, Clock, GripVertical, Sparkles, ChevronRight, ChevronDown } from 'lucide-react'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { 
  useSortable 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTheme } from '@/lib/context/ThemeContext'

type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']

interface SortableItemProps {
  plan: Plan
  onToggleComplete: (id: string, completed: boolean) => void
  onEdit: (plan: Plan) => void
  onAddChild: (parentId: string) => void
  getPriorityColor: (priority: string) => string
  getPriorityIcon: (priority: string) => React.ReactNode
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpanded: (planId: string) => void
}

function SortableItem({ 
  plan, 
  onToggleComplete, 
  onEdit,
  onAddChild,
  getPriorityColor, 
  getPriorityIcon,
  hasChildren,
  isExpanded,
  onToggleExpanded
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id })
  
  const { getCardStyle } = useTheme()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${getCardStyle()} ${isDragging ? 'z-50' : ''}`}
      data-plan-id={plan.id}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start space-x-2">
            {/* 들여쓰기 */}
            <div style={{ width: `${plan.depth * 24}px` }} />
            
            {/* 펼치기/접기 버튼 */}
            {hasChildren && (
              <button
                onClick={() => onToggleExpanded(plan.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <ChevronDown className="h-6 w-6" />
                ) : (
                  <ChevronRight className="h-6 w-6" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div 
              {...attributes} 
              {...listeners}
              className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex items-center"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <button
              onClick={() => onToggleComplete(plan.id, plan.completed)}
              className={`p-1 rounded flex items-center ${
                plan.completed
                  ? 'text-green-600 hover:text-green-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <CheckCircle2 className={`h-6 w-6 ${plan.completed ? 'fill-current' : ''}`} />
            </button>
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
                {plan.due_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    마감일: {new Date(plan.due_date).toLocaleDateString('ko-KR')}
                  </p>
                )}
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
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(plan.priority)}`}>
            <span>
              {plan.priority === 'high' && '높음'}
              {plan.priority === 'medium' && '보통'}
              {plan.priority === 'low' && '낮음'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0], // 오늘 날짜로 기본 설정
    priority: 'medium' as 'low' | 'medium' | 'high',
    parent_id: null as string | null
  })
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  
  // 테마 시스템 사용
  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle, getFilterButtonStyle } = useTheme()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = plans.findIndex((plan) => plan.id === active.id)
    const newIndex = plans.findIndex((plan) => plan.id === over.id)

    const newPlans = arrayMove(plans, oldIndex, newIndex)
    setPlans(newPlans)

    // Update order_index in database
    try {
      const updates = newPlans.map((plan, index) => ({
        id: plan.id,
        order_index: index
      }))

      for (const update of updates) {
        await supabase
          .from('plans')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('Error updating plan order:', error)
      // Revert on error
      fetchPlans()
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
      } else {
        // 새 계획 추가 시 같은 부모의 자식들 중에서 order_index 계산
        const siblingPlans = plans.filter(p => 
          (p.parent_id === formData.parent_id) || 
          (p.parent_id === null && formData.parent_id === null)
        )
        
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
        
        // 새 계획의 order_index 이상인 기존 형제들의 order_index 증가
        const siblingsToUpdate = siblingPlans.filter(p => p.order_index >= newOrderIndex)
        for (const plan of siblingsToUpdate) {
          await supabase
            .from('plans')
            .update({ order_index: plan.order_index + 1 })
            .eq('id', plan.id)
        }
        
        const planData = {
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          parent_id: formData.parent_id,
          order_index: newOrderIndex
        }
        
        const { error } = await supabase
          .from('plans')
          .insert(planData as PlanInsert)

        if (error) throw error
      }

      await fetchPlans()
      closeModal()
    } catch (error) {
      console.error('Error saving plan:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('plans')
      .update({ completed: !completed })
      .eq('id', id)

    if (error) {
      console.error('Error updating plan:', error)
    } else {
      await fetchPlans()
    }
  }

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
      due_date: plan?.due_date || new Date().toISOString().split('T')[0],
      priority: plan?.priority || 'medium',
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
    setFormData({ title: '', description: '', due_date: new Date().toISOString().split('T')[0], priority: 'medium', parent_id: null })
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

  // 계층 구조로 계획 정리
  const buildPlanTree = (plans: Plan[]): Plan[] => {
    const planMap = new Map<string, Plan & { children?: Plan[] }>()
    const rootPlans: (Plan & { children?: Plan[] })[] = []

    // 모든 계획을 맵에 저장
    plans.forEach(plan => {
      planMap.set(plan.id, { ...plan, children: [] })
    })

    // 부모-자식 관계 설정
    plans.forEach(plan => {
      const planWithChildren = planMap.get(plan.id)!
      if (plan.parent_id && planMap.has(plan.parent_id)) {
        const parent = planMap.get(plan.parent_id)!
        parent.children = parent.children || []
        parent.children.push(planWithChildren)
      } else if (!plan.parent_id) {
        rootPlans.push(planWithChildren)
      }
    })

    // 각 레벨에서 order_index로 정렬
    const sortPlans = (plans: (Plan & { children?: Plan[] })[]) => {
      plans.sort((a, b) => a.order_index - b.order_index)
      plans.forEach(plan => {
        if (plan.children && plan.children.length > 0) {
          sortPlans(plan.children)
        }
      })
    }

    sortPlans(rootPlans)
    return rootPlans
  }

  // 트리를 평탄화하여 표시할 계획 목록 생성
  const flattenPlanTree = (
    plans: (Plan & { children?: Plan[] })[],
    expandedIds: Set<string>,
    parentVisible: boolean = true
  ): Plan[] => {
    const result: Plan[] = []

    plans.forEach(plan => {
      if (parentVisible) {
        result.push(plan)
        
        if (plan.children && plan.children.length > 0 && expandedIds.has(plan.id)) {
          const childPlans = flattenPlanTree(plan.children, expandedIds, true)
          result.push(...childPlans)
        }
      }
    })

    return result
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
    return plans.some(plan => plan.parent_id === planId)
  }

  const filteredPlans = plans.filter(plan => {
    if (filter === 'pending') return !plan.completed
    if (filter === 'completed') return plan.completed
    return true
  })

  const planTree = buildPlanTree(filteredPlans)
  const visiblePlans = flattenPlanTree(planTree, expandedPlans)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <CheckCircle2 className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            {visiblePlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>계획이 없습니다.</p>
                <p className="text-sm">새로운 계획을 추가해보세요.</p>
              </div>
            ) : (
              <SortableContext items={visiblePlans.map(plan => plan.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {visiblePlans.map((plan) => (
                    <SortableItem
                      key={plan.id}
                      plan={plan}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openModal}
                      onAddChild={(parentId) => openModal(undefined, parentId)}
                      getPriorityColor={getPriorityColor}
                      getPriorityIcon={getPriorityIcon}
                      hasChildren={hasChildren(plan.id)}
                      isExpanded={expandedPlans.has(plan.id)}
                      onToggleExpanded={toggleExpanded}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </DndContext>

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