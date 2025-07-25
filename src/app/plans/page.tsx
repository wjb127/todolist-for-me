'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle2, Clock, GripVertical } from 'lucide-react'
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

type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']

interface SortableItemProps {
  plan: Plan
  onToggleComplete: (id: string, completed: boolean) => void
  onEdit: (plan: Plan) => void
  getPriorityColor: (priority: string) => string
  getPriorityIcon: (priority: string) => React.ReactNode
}

function SortableItem({ 
  plan, 
  onToggleComplete, 
  onEdit, 
  getPriorityColor, 
  getPriorityIcon
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white rounded-lg shadow-sm p-4 ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start space-x-3">
            <div 
              {...attributes} 
              {...listeners}
              className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <button
              onClick={() => onToggleComplete(plan.id, plan.completed)}
              className={`p-1 rounded mt-1 ${
                plan.completed
                  ? 'text-green-600 hover:text-green-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <CheckCircle2 className={`h-6 w-6 ${plan.completed ? 'fill-current' : ''}`} />
            </button>
            <div className="flex-1">
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
        <div className="flex items-center space-x-2 ml-4">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(plan.priority)}`}>
            {getPriorityIcon(plan.priority)}
            <span>
              {plan.priority === 'high' && '높음'}
              {plan.priority === 'medium' && '보통'}
              {plan.priority === 'low' && '낮음'}
            </span>
          </div>
          <button
            onClick={() => onEdit(plan)}
            className="p-2 text-gray-400 hover:text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </button>
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
    description: '',
    due_date: new Date().toISOString().split('T')[0], // 오늘 날짜로 기본 설정
    priority: 'medium' as 'low' | 'medium' | 'high'
  })

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
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', error)
    } else {
      setPlans(data || [])
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
    try {
      const planData = {
        title: formData.description, // 설명을 제목으로 저장
        description: formData.description || null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        order_index: editingPlan ? editingPlan.order_index : plans.length
      }

      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('plans')
          .insert(planData as PlanInsert)

        if (error) throw error
      }

      await fetchPlans()
      closeModal()
    } catch (error) {
      console.error('Error saving plan:', error)
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

  const openModal = (plan?: Plan) => {
    setEditingPlan(plan || null)
    setFormData({
      description: plan?.description || '',
      due_date: plan?.due_date || new Date().toISOString().split('T')[0],
      priority: plan?.priority || 'medium'
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPlan(null)
    setFormData({ description: '', due_date: new Date().toISOString().split('T')[0], priority: 'medium' })
  }

  const filteredPlans = plans.filter(plan => {
    if (filter === 'pending') return !plan.completed
    if (filter === 'completed') return plan.completed
    return true
  })

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
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">계획</h1>
          <button
            onClick={() => openModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>새 계획</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
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
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
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
            {filteredPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>계획이 없습니다.</p>
                <p className="text-sm">새로운 계획을 추가해보세요.</p>
              </div>
            ) : (
              <SortableContext items={filteredPlans.map(plan => plan.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {filteredPlans.map((plan) => (
                    <SortableItem
                      key={plan.id}
                      plan={plan}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openModal}
                      getPriorityColor={getPriorityColor}
                      getPriorityIcon={getPriorityIcon}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </DndContext>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
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
                    계획 내용
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="계획 내용을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    우선순위
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  disabled={!formData.description}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>저장</span>
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
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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