'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Plus, Clock, FileText, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react'
import AnimatedCheckbox from '@/components/ui/AnimatedCheckbox'
import { useTheme } from '@/lib/context/ThemeContext'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Database } from '@/lib/database.types'

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
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [weekTodos, setWeekTodos] = useState<Record<string, Todo[]>>({})
  
  // 테마 시스템 사용
  const { getBackgroundStyle, getCardStyle, getInputStyle, getModalStyle, getModalBackdropStyle } = useTheme()

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch(`/api/todos?date=${selectedDate}`)
      if (!res.ok) throw new Error('Failed to fetch todos')
      const data = await res.json()
      setTodos(data || [])
    } catch (error) {
      console.error('Error fetching todos:', error)
    }
  }, [selectedDate])

  const fetchWeekTodos = useCallback(async () => {
    const weekStart = getWeekStart(selectedDate)
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      return format(date, 'yyyy-MM-dd')
    })

    try {
      const res = await fetch(`/api/todos?dates=${dates.join(',')}`)
      if (!res.ok) throw new Error('Failed to fetch week todos')
      const data = await res.json()
      const grouped = dates.reduce((acc, date) => {
        acc[date] = data?.filter((todo: Todo) => todo.date === date) || []
        return acc
      }, {} as Record<string, Todo[]>)
      setWeekTodos(grouped)
    } catch (error) {
      console.error('Error fetching week todos:', error)
    }
  }, [selectedDate])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }, [])

  const checkAndApplyActiveTemplate = useCallback(async () => {
    try {
      const res = await fetch('/api/templates/check-active', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to check active template')
      const result = await res.json()

      if (result.applied) {
        fetchTodos()
      }
    } catch (error) {
      console.error('Error checking active template:', error)
    }
  }, [fetchTodos])

  useEffect(() => {
    const loadData = async () => {
      if (viewMode === 'day') {
        await fetchTodos()
      } else {
        await fetchWeekTodos()
      }
      await fetchTemplates()
      await checkAndApplyActiveTemplate()
    }
    loadData()
  }, [viewMode, selectedDate, fetchTodos, fetchWeekTodos, fetchTemplates, checkAndApplyActiveTemplate])

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })
      if (!res.ok) throw new Error('Failed to update todo')
      await fetchTodos()
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const handleAddFromTemplate = async () => {
    if (!selectedTemplate) return

    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    const newTodos = template.items.map((item: TemplateItem, index: number) => ({
      template_id: template.id,
      date: selectedDate,
      title: item.title,
      description: item.description || null,
      completed: false,
      order_index: todos.length + index
    }))

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodos)
      })
      if (!res.ok) throw new Error('Failed to add todos from template')
      await fetchTodos()
      setIsModalOpen(false)
      setSelectedTemplate('')
    } catch (error) {
      console.error('Error adding todos from template:', error)
    }
  }

  const handleActivateTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    if (confirm(`"${template.title}" 템플릿을 활성화하시겠습니까? 기존 활성 템플릿은 비활성화되고 오늘부터의 모든 할 일이 대체됩니다.`)) {
      try {
        const res = await fetch(`/api/templates/${templateId}/activate`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to activate template')

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

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          title: newTodoTitle,
          completed: false,
          order_index: todos.length
        })
      })
      if (!res.ok) throw new Error('Failed to add todo')
      await fetchTodos()
      setNewTodoTitle('')
    } catch (error) {
      console.error('Error adding todo:', error)
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

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  const getWeekStart = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(date)
    monday.setDate(date.getDate() + diff)
    return format(monday, 'yyyy-MM-dd')
  }

  const goToPreviousWeek = () => {
    const weekStart = new Date(getWeekStart(selectedDate))
    weekStart.setDate(weekStart.getDate() - 7)
    setSelectedDate(format(weekStart, 'yyyy-MM-dd'))
  }

  const goToNextWeek = () => {
    const weekStart = new Date(getWeekStart(selectedDate))
    weekStart.setDate(weekStart.getDate() + 7)
    setSelectedDate(format(weekStart, 'yyyy-MM-dd'))
  }

  const weekDates = useMemo(() => {
    const weekStart = getWeekStart(selectedDate)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      return {
        dateString: format(date, 'yyyy-MM-dd'),
        displayDate: format(date, 'd일'),
        dayOfWeek: format(date, 'E', { locale: ko }),
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      }
    })
  }, [selectedDate])

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Todo 리스트</h1>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="일간 보기"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="주간 보기"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className={`${getCardStyle()} mb-4`}>
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">
                {viewMode === 'day' ? '날짜 선택' : '주간 선택'}
              </label>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={getInputStyle()}
            />
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={viewMode === 'day' ? goToPreviousDay : goToPreviousWeek}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={viewMode === 'day' ? '이전 날' : '이전 주'}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 flex items-center justify-center space-x-2">
                <div className="text-lg font-semibold text-gray-900">
                  {viewMode === 'day' 
                    ? formatDate(selectedDate)
                    : `${format(new Date(weekDates[0].dateString), 'M/d', { locale: ko })} - ${format(new Date(weekDates[6].dateString), 'M/d', { locale: ko })}`
                  }
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
                onClick={viewMode === 'day' ? goToNextDay : goToNextWeek}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={viewMode === 'day' ? '다음 날' : '다음 주'}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {viewMode === 'day' && totalCount > 0 && (
            <div className={`${getCardStyle()} mb-4`}>
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
                <AnimatedCheckbox checked={true} onChange={() => {}} size="sm" className="pointer-events-none" />
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

        {viewMode === 'day' ? (
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
                    <AnimatedCheckbox
                      checked={todo.completed}
                      onChange={() => handleToggleComplete(todo.id, todo.completed)}
                      size="md"
                    />
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
        ) : (
          <div className="space-y-3">
            {weekDates.map((day) => {
              const dayTodos = weekTodos[day.dateString] || []
              const dayCompletedCount = dayTodos.filter(t => t.completed).length
              const dayTotalCount = dayTodos.length
              const dayCompletionPercentage = dayTotalCount > 0 ? Math.round((dayCompletedCount / dayTotalCount) * 100) : 0

              return (
                <div 
                  key={day.dateString} 
                  className={`${getCardStyle()} ${day.isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`text-sm font-semibold ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day.dayOfWeek}
                      </div>
                      <div className={`text-lg font-bold ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day.displayDate}
                      </div>
                      {day.isToday && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          오늘
                        </span>
                      )}
                    </div>
                    {dayTotalCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">{dayCompletedCount}/{dayTotalCount}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${dayCompletionPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {dayTodos.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">할 일 없음</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayTodos.map((todo) => (
                        <div key={todo.id} className="flex items-center space-x-2 py-1">
                          <AnimatedCheckbox
                            checked={todo.completed}
                            onChange={() => {
                              handleToggleComplete(todo.id, todo.completed)
                              setTimeout(() => fetchWeekTodos(), 100)
                            }}
                            size="sm"
                          />
                          <span className={`text-sm flex-1 ${
                            todo.completed
                              ? 'text-gray-400 line-through'
                              : 'text-gray-700'
                          }`}>
                            {todo.title}
                          </span>
                          {todo.template_id && (
                            <FileText className="h-3 w-3 text-blue-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {isModalOpen && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">템플릿에서 추가</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
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
              <div className="p-4 border-t border-gray-200 flex space-x-2">
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