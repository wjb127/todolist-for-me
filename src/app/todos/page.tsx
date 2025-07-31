'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, CheckSquare, Square, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTheme } from '@/lib/context/ThemeContext'

type Todo = Database['public']['Tables']['todos']['Row']
type Template = Database['public']['Tables']['templates']['Row']
type TemplateItem = {
  id: string
  title: string
  description?: string
  order_index: number
}

export default function TodosPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [todos, setTodos] = useState<Todo[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [newTodoTitle, setNewTodoTitle] = useState('')
  
  // 전역 테마 시스템 사용
  const { getCardStyle, getCardStyleLarge, getButtonStyle, getBackgroundStyle, getInputStyle, getModalStyle, getModalHeaderStyle, getModalButtonStyle, getModalBackdropStyle } = useTheme()

  const fetchTodos = useCallback(async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('date', selectedDate)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching todos:', error)
    } else {
      setTodos(data || [])
    }
  }, [selectedDate])

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
    } else {
      setTemplates(data || [])
    }
  }, [])

  const checkAndApplyActiveTemplate = useCallback(async () => {
    try {
      // 활성화된 템플릿 찾기
      const { data: activeTemplate, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error || !activeTemplate) return

      // 템플릿 적용 시작 날짜부터 미래 30일까지 확인하여 자동 생성
      const startDate = activeTemplate.applied_from_date || new Date().toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      const start = new Date(Math.max(new Date(startDate).getTime(), new Date(today).getTime()))
      
      // 오늘부터 앞으로 3개월간 확인
      for (let i = 0; i < 90; i++) {
        const currentDate = new Date(start)
        currentDate.setDate(start.getDate() + i)
        const dateString = currentDate.toISOString().split('T')[0]
        
        // 해당 날짜에 이미 해당 템플릿의 todos가 있는지 확인
        const { data: existingTodos } = await supabase
          .from('todos')
          .select('id')
          .eq('date', dateString)
          .eq('template_id', activeTemplate.id)

        // 이미 todos가 있으면 스킵
        if (existingTodos && existingTodos.length > 0) continue

        // 템플릿으로부터 todos 자동 생성
        const newTodos = activeTemplate.items.map((item: TemplateItem, index: number) => ({
          template_id: activeTemplate.id,
          date: dateString,
          title: item.title,
          description: item.description || null,
          completed: false,
          order_index: index
        }))

        if (newTodos.length > 0) {
          const { error: insertError } = await supabase
            .from('todos')
            .insert(newTodos)

          if (insertError) {
            console.error('Error auto-creating todos from template:', insertError)
          }
        }
      }
      
      // 현재 선택된 날짜에 대한 todos를 다시 fetch
      if (selectedDate >= startDate) {
        fetchTodos()
      }
    } catch (error) {
      console.error('Error checking active template:', error)
    }
  }, [selectedDate, fetchTodos])

  useEffect(() => {
    const loadData = async () => {
      await fetchTodos()
      await fetchTemplates()
      await checkAndApplyActiveTemplate()
    }
    loadData()
  }, [selectedDate, fetchTodos, fetchTemplates, checkAndApplyActiveTemplate])

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id)

    if (error) {
      console.error('Error updating todo:', error)
    } else {
      await fetchTodos()
    }
  }

  const handleAddFromTemplate = async () => {
    if (!selectedTemplate) return

    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    const newTodos = template.items.map((item, index) => ({
      template_id: template.id,
      date: selectedDate,
      title: item.title,
      description: item.description || null,
      completed: false,
      order_index: todos.length + index
    }))

    const { error } = await supabase
      .from('todos')
      .insert(newTodos)

    if (error) {
      console.error('Error adding todos from template:', error)
    } else {
      await fetchTodos()
      setIsModalOpen(false)
      setSelectedTemplate('')
    }
  }

  const handleActivateTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    if (confirm(`"${template.title}" 템플릿을 활성화하시겠습니까? 기존 활성 템플릿은 비활성화되고 오늘부터의 모든 할 일이 대체됩니다.`)) {
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
          .eq('id', templateId)

        if (error) throw error

        // 오늘부터 앞으로 3개월간의 todos를 생성
        const createTodos: Array<{
          template_id: string
          date: string
          title: string
          description: string | null
          completed: boolean
          order_index: number
        }> = []
        
        for (let i = 0; i < 90; i++) {
          const currentDate = new Date(today)
          currentDate.setDate(currentDate.getDate() + i)
          const dateString = currentDate.toISOString().split('T')[0]
          
          template.items.forEach((item, index) => {
            createTodos.push({
              template_id: template.id,
              date: dateString,
              title: item.title,
              description: item.description || null,
              completed: false,
              order_index: index
            })
          })
        }
        
        if (createTodos.length > 0) {
          await supabase
            .from('todos')
            .insert(createTodos)
        }
        
        await fetchTemplates()
        await fetchTodos()
        alert('템플릿이 성공적으로 활성화되었습니다!')
      } catch (error) {
        console.error('Error activating template:', error)
        alert('템플릿 활성화 중 오류가 발생했습니다.')
      }
    }
  }

  const handleAddSingleTodo = async () => {
    if (!newTodoTitle.trim()) return

    const { error } = await supabase
      .from('todos')
      .insert({
        date: selectedDate,
        title: newTodoTitle,
        completed: false,
        order_index: todos.length
      })

    if (error) {
      console.error('Error adding todo:', error)
    } else {
      await fetchTodos()
      setNewTodoTitle('')
    }
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

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Todo 리스트</h1>
          
          <div className={getCardStyle() + " mb-4"}>
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
              <div className="text-lg font-semibold text-gray-900 flex-1 text-center">
                {formatDate(selectedDate)}
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

          {totalCount > 0 && (
            <div className={getCardStyle() + " mb-4"}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">진행률</span>
                <span className="text-sm text-gray-600">{completedCount}/{totalCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="text-right text-sm text-gray-600 mt-1">
                {completionPercentage}%
              </div>
            </div>
          )}

          {templates.some(t => t.is_active) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 mb-1">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  활성 템플릿: {templates.find(t => t.is_active)?.title}
                </span>
              </div>
              {(() => {
                const activeTemplate = templates.find(t => t.is_active)
                const appliedDate = activeTemplate?.applied_from_date
                if (appliedDate) {
                  const formatDate = new Date(appliedDate).toLocaleDateString('ko-KR')
                  return (
                    <p className="text-xs text-green-600">
                      {formatDate}부터 적용 중 - 매일 자동으로 할 일이 추가됩니다 (3개월간)
                    </p>
                  )
                }
                return (
                  <p className="text-xs text-green-600">
                    오늘부터 향후 3개월간 자동으로 적용됩니다
                  </p>
                )
              })()}
            </div>
          )}

          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FileText className="h-4 w-4" />
              <span>템플릿에서</span>
            </button>
            <div className="flex-1 flex space-x-1">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="새 할 일 추가"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSingleTodo()}
              />
              <button
                onClick={handleAddSingleTodo}
                disabled={!newTodoTitle.trim()}
                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>선택한 날짜에 할 일이 없습니다.</p>
              <p className="text-sm">템플릿을 사용하거나 직접 추가해보세요.</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div key={todo.id} className={getCardStyle()}>
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleToggleComplete(todo.id, todo.completed)}
                    className={`p-1 rounded ${
                      todo.completed
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {todo.completed ? (
                      <CheckSquare className="h-6 w-6" />
                    ) : (
                      <Square className="h-6 w-6" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      todo.completed
                        ? 'text-gray-500 line-through'
                        : 'text-gray-900'
                    }`}>
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                    )}
                  </div>
                  {todo.template_id && (
                    <div className="flex items-center space-x-1 ml-2">
                      <FileText className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-blue-600">템플릿</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {isModalOpen && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className={getModalHeaderStyle()}>
                <h2 className="text-lg font-semibold">템플릿에서 추가</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        selectedTemplate === template.id
                          ? getButtonStyle() + ' border-blue-500 bg-blue-50'
                          : getButtonStyle() + ' hover:opacity-80'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{template.title}</h3>
                            {template.is_active && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                활성
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600">{template.description}</p>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {template.items.length}개 항목
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleActivateTemplate(template.id)
                          }}
                          disabled={template.is_active}
                          className={`ml-2 px-3 py-1 text-xs rounded-lg ${
                            template.is_active 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {template.is_active ? '활성화됨' : '활성화'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${getModalHeaderStyle()} border-t`}>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddFromTemplate}
                    disabled={!selectedTemplate}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setSelectedTemplate('')
                    }}
                    className={`${getModalButtonStyle()} px-4 py-2 border border-gray-300`}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}