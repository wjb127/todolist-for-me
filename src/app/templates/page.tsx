'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, CheckCircle, Calendar, GripVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Template = Database['public']['Tables']['templates']['Row']
type TemplateInsert = Database['public']['Tables']['templates']['Insert']
type TemplateItem = {
  id: string
  title: string
  description?: string
  order_index: number
}

interface SortableItemProps {
  item: TemplateItem
  index: number
  updateItem: (index: number, field: keyof TemplateItem, value: string) => void
  removeItem: (index: number) => void
}

function SortableItem({ item, index, updateItem, removeItem }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-2 bg-white border rounded-lg p-2 ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
      <input
        type="text"
        value={item.title}
        onChange={(e) => updateItem(index, 'title', e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="할 일 제목"
      />
      <button
        onClick={() => removeItem(index)}
        className="p-1 text-red-500 hover:text-red-700"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    items: [] as TemplateItem[]
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
    } else {
      setTemplates(data || [])
    }
  }

  const handleApplyTemplate = async (template: Template) => {
    if (confirm(`"${template.title}" 템플릿을 오늘부터 적용하시겠습니까? 기존 활성 템플릿은 비활성화되고 오늘부터의 모든 할 일이 대체됩니다.`)) {
      setIsApplying(true)
      try {
        // 모든 템플릿을 비활성화
        await supabase
          .from('templates')
          .update({ is_active: false, applied_from_date: null })
          .neq('id', '')

        // 오늘부터 3개월 후까지의 모든 기존 todo들을 삭제
        const today = new Date().toISOString().split('T')[0]
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 3)
        const endDateString = endDate.toISOString().split('T')[0]
        
        await supabase
          .from('todos')
          .delete()
          .gte('date', today)
          .lte('date', endDateString)

        // 선택한 템플릿을 활성화
        const { error } = await supabase
          .from('templates')
          .update({ 
            is_active: true, 
            applied_from_date: today 
          })
          .eq('id', template.id)

        if (error) throw error

        // 오늘부터 앞으로 3개월간의 todos를 생성
        await createTodosFromTemplate(template, today, true)
        
        await fetchTemplates()
        
        // Todo 페이지로 리다이렉트
        router.push('/todos')
        alert('템플릿이 성공적으로 적용되었습니다!')
      } catch (error) {
        console.error('Error applying template:', error)
        alert('템플릿 적용 중 오류가 발생했습니다.')
      } finally {
        setIsApplying(false)
      }
    }
  }



  const createTodosFromTemplate = async (template: Template, startDate: string, replaceAll: boolean = false) => {
    const todos: Array<{
      template_id: string
      date: string
      title: string
      description: string | null
      completed: boolean
      order_index: number
    }> = []
    const start = new Date(startDate)
    
    // 일괄 적용인 경우 3개월(90일), 개별 적용인 경우 30일
    const dayCount = replaceAll ? 90 : 30
    
    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)
      const dateString = currentDate.toISOString().split('T')[0]
      
      // 일괄 적용이 아닌 경우에만 기존 todos 확인
      if (!replaceAll) {
        // 해당 날짜에 이미 todos가 있는지 확인
        const { data: existingTodos } = await supabase
          .from('todos')
          .select('id')
          .eq('date', dateString)
          .eq('template_id', template.id)
        
        // 이미 해당 템플릿의 todos가 있으면 스킵
        if (existingTodos && existingTodos.length > 0) continue
      }
      
      template.items
        .sort((a, b) => a.order_index - b.order_index)
        .forEach((item) => {
          todos.push({
            template_id: template.id,
            date: dateString,
            title: item.title,
            description: item.description || null,
            completed: false,
            order_index: item.order_index
          })
        })
    }
    
    if (todos.length > 0) {
      const { error } = await supabase
        .from('todos')
        .insert(todos)
      
      if (error) {
        console.error('Error creating todos from template:', error)
      }
    }
  }

  const handleDeactivateTemplate = async (template: Template) => {
    if (confirm(`"${template.title}" 템플릿 적용을 중단하시겠습니까?`)) {
      try {
        const { error } = await supabase
          .from('templates')
          .update({ 
            is_active: false, 
            applied_from_date: null 
          })
          .eq('id', template.id)

        if (error) throw error
        
        await fetchTemplates()
        alert('템플릿 적용이 중단되었습니다.')
      } catch (error) {
        console.error('Error deactivating template:', error)
        alert('템플릿 비활성화 중 오류가 발생했습니다.')
      }
    }
  }

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update({
            title: formData.title,
            description: formData.description,
            items: formData.items
          })
          .eq('id', editingTemplate.id)

        if (error) throw error

        // 만약 수정된 템플릿이 활성 상태라면, 오늘부터의 todos를 다시 생성
        if (editingTemplate.is_active && editingTemplate.applied_from_date) {
          const today = new Date().toISOString().split('T')[0]
          const endDate = new Date()
          endDate.setMonth(endDate.getMonth() + 3)
          const endDateString = endDate.toISOString().split('T')[0]
          
          // 오늘부터 미래의 todos 삭제
          await supabase
            .from('todos')
            .delete()
            .eq('template_id', editingTemplate.id)
            .gte('date', today)
            .lte('date', endDateString)
          
          // 업데이트된 템플릿으로 다시 생성
          const updatedTemplate = {
            ...editingTemplate,
            title: formData.title,
            description: formData.description,
            items: formData.items
          }
          await createTodosFromTemplate(updatedTemplate, today, true)
        }
      } else {
        const { error } = await supabase
          .from('templates')
          .insert({
            title: formData.title,
            description: formData.description,
            items: formData.items
          } as TemplateInsert)

        if (error) throw error
      }

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('템플릿을 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting template:', error)
      } else {
        await fetchTemplates()
      }
    }
  }

  const openModal = (template?: Template) => {
    setEditingTemplate(template || null)
    setFormData({
      title: template?.title || '',
      description: template?.description || '',
      items: template?.items || []
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTemplate(null)
    setFormData({ title: '', description: '', items: [] })
  }

  const addItem = () => {
    const newItem: TemplateItem = {
      id: Date.now().toString(),
      title: '',
      description: '',
      order_index: formData.items.length
    }
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    })
  }

  const updateItem = (index: number, field: keyof TemplateItem, value: string) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setFormData({ ...formData, items: updatedItems })
  }

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    // order_index 재조정
    const reorderedItems = updatedItems.map((item, i) => ({
      ...item,
      order_index: i
    }))
    setFormData({ ...formData, items: reorderedItems })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = formData.items.findIndex((item) => item.id === active.id)
    const newIndex = formData.items.findIndex((item) => item.id === over.id)

    const newItems = arrayMove(formData.items, oldIndex, newIndex)
    
    // order_index 재조정
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order_index: index
    }))

    setFormData({
      ...formData,
      items: reorderedItems
    })
  }



  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">템플릿</h1>
          <button
            onClick={() => openModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>새 템플릿</span>
          </button>
        </div>

        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className={`rounded-lg shadow-sm p-4 ${template.is_active ? 'bg-green-50 border-2 border-green-200' : 'bg-white'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                    {template.is_active && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        활성
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                  {template.is_active && template.applied_from_date && (
                    <div className="mt-2 p-2 bg-green-100 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">
                        📅 {new Date(template.applied_from_date).toLocaleDateString('ko-KR')}부터 적용 중
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        매일 자동으로 할 일이 생성됩니다 (향후 3개월간)
                      </p>
                    </div>
                  )}
                  {template.is_active && !template.applied_from_date && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded-lg">
                      <p className="text-sm text-yellow-700 font-medium">
                        ⚠️ 활성화되었지만 적용 날짜가 설정되지 않음
                      </p>
                    </div>
                  )}
                  <div className="mt-3 space-y-1">
                    {template.items
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((item, index) => (
                        <div key={item.id} className="text-sm text-gray-700">
                          {index + 1}. {item.title}
                        </div>
                      ))}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openModal(template)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {template.is_active && (
                    <button
                      onClick={() => handleDeactivateTemplate(template)}
                      className="p-2 text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={isApplying}
                    className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {editingTemplate ? '템플릿 편집' : '새 템플릿'}
                  </h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    템플릿 이름
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="템플릿 이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="템플릿 설명을 입력하세요"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      할 일 목록
                    </label>
                    <button
                      onClick={addItem}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + 추가
                    </button>
                  </div>
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={formData.items.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {formData.items
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((item, index) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              index={index}
                              updateItem={updateItem}
                              removeItem={removeItem}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex space-x-2">
                <button
                  onClick={handleSaveTemplate}
                  disabled={!formData.title}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>저장</span>
                </button>
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