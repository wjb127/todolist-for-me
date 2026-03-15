'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Plus, Clock, FileText, ChevronLeft, ChevronRight, List, LayoutGrid, Pencil, X } from 'lucide-react'
import AnimatedCheckbox from '@/components/ui/AnimatedCheckbox'
import NotionStyleEditor from '@/components/templates/NotionStyleEditor'
import { TemplateItem } from '@/components/templates/NotionStyleEditor'
import Portal from '@/components/ui/Portal'
import { useTheme } from '@/lib/context/ThemeContext'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Database } from '@/lib/database.types'

type Todo = Database['public']['Tables']['todos']['Row']
type Template = Database['public']['Tables']['templates']['Row']

export default function TodosPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [weekTodos, setWeekTodos] = useState<Record<string, Todo[]>>({})

  // 루틴 관련 state
  const [routineItems, setRoutineItems] = useState<TemplateItem[]>([])
  const [editingRoutineItems, setEditingRoutineItems] = useState<TemplateItem[]>([])
  const [isRoutineEditorOpen, setIsRoutineEditorOpen] = useState(false)
  const [isSavingRoutine, setIsSavingRoutine] = useState(false)

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

  const fetchRoutineItems = useCallback(async () => {
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      const active = data?.find((t: Template) => t.is_active)
      setRoutineItems(active?.items || [])
    } catch (error) {
      console.error('Error fetching routine items:', error)
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
      await fetchRoutineItems()
      await checkAndApplyActiveTemplate()
    }
    loadData()
  }, [viewMode, selectedDate, fetchTodos, fetchWeekTodos, fetchRoutineItems, checkAndApplyActiveTemplate])

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

  const handleSaveRoutine = async (items: TemplateItem[]) => {
    setIsSavingRoutine(true)
    try {
      await fetch('/api/todos/apply-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })
      setRoutineItems(items)
      setIsRoutineEditorOpen(false)
      await fetchTodos()
    } finally {
      setIsSavingRoutine(false)
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

  const openRoutineEditor = () => {
    setEditingRoutineItems([...routineItems])
    setIsRoutineEditorOpen(true)
  }

  return (
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-ink">Todo 리스트</h1>
            <div className="flex space-x-1 bg-surface-hover rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-surface-card text-ink shadow-sm'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="일간 보기"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-surface-card text-ink shadow-sm'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="주간 보기"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={`${getCardStyle()} mb-4`}>
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-ink-muted" />
              <label className="text-sm font-medium text-ink-secondary">
                {viewMode === 'day' ? '날짜 선택' : '주간 선택'}
              </label>
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
                onClick={viewMode === 'day' ? goToPreviousDay : goToPreviousWeek}
                className="p-2 text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-lg transition-colors"
                title={viewMode === 'day' ? '이전 날' : '이전 주'}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 flex items-center justify-center space-x-2">
                <div className="text-lg font-semibold text-ink">
                  {viewMode === 'day'
                    ? formatDate(selectedDate)
                    : `${format(new Date(weekDates[0].dateString), 'M/d', { locale: ko })} - ${format(new Date(weekDates[6].dateString), 'M/d', { locale: ko })}`
                  }
                </div>
                {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-xs font-medium text-accent hover:text-accent-hover hover:bg-accent-soft rounded-full transition-colors"
                    title="오늘로 가기"
                  >
                    오늘
                  </button>
                )}
              </div>
              <button
                onClick={viewMode === 'day' ? goToNextDay : goToNextWeek}
                className="p-2 text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-lg transition-colors"
                title={viewMode === 'day' ? '다음 날' : '다음 주'}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {viewMode === 'day' && totalCount > 0 && (
            <div className={`${getCardStyle()} mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink-secondary">진행률</span>
                <span className="text-sm text-ink-secondary">{completedCount}/{totalCount}</span>
              </div>
              <div className="w-full bg-track rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="text-right text-sm text-ink-secondary mt-1">
                {completionPercentage}%
              </div>
            </div>
          )}

          <div className="flex space-x-2 mb-4">
            <button
              onClick={openRoutineEditor}
              className="flex items-center justify-center space-x-1.5 border border-outline-strong text-ink-secondary px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <Pencil className="h-4 w-4" />
              <span className="text-sm">{routineItems.length > 0 ? '루틴 편집' : '루틴 설정'}</span>
            </button>
            <div className="flex-1 flex space-x-1">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="새 할 일 추가"
                className="flex-1 border border-outline-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
              <div className="text-center py-8 text-ink-muted">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>선택한 날짜에 할 일이 없습니다.</p>
                <p className="text-sm">루틴을 설정하거나 직접 추가해보세요.</p>
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
                          ? 'text-ink-muted line-through'
                          : 'text-ink'
                      }`}>
                        {todo.title}
                      </h3>
                    {todo.description && (
                      <p className="text-sm text-ink-secondary mt-1">{todo.description}</p>
                    )}
                  </div>
                  {todo.template_id && (
                    <div className="flex items-center space-x-1 ml-2">
                      <FileText className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-blue-600">루틴</span>
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
                  className={`${getCardStyle()} ${day.isToday ? 'ring-2 ring-accent' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`text-sm font-semibold ${day.isToday ? 'text-accent' : 'text-ink'}`}>
                        {day.dayOfWeek}
                      </div>
                      <div className={`text-lg font-bold ${day.isToday ? 'text-accent' : 'text-ink'}`}>
                        {day.displayDate}
                      </div>
                      {day.isToday && (
                        <span className="px-2 py-0.5 bg-accent-soft text-accent text-xs rounded-full">
                          오늘
                        </span>
                      )}
                    </div>
                    {dayTotalCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-ink-secondary">{dayCompletedCount}/{dayTotalCount}</span>
                        <div className="w-16 bg-track rounded-full h-1.5">
                          <div
                            className="bg-accent h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${dayCompletionPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {dayTodos.length === 0 ? (
                    <p className="text-sm text-ink-muted text-center py-2">할 일 없음</p>
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
                              ? 'text-ink-muted line-through'
                              : 'text-ink-secondary'
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

        {isRoutineEditorOpen && (
          <Portal>
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-outline">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">매일 루틴 편집</h2>
                  <button onClick={() => setIsRoutineEditorOpen(false)}>
                    <X className="h-5 w-5 text-ink-muted" />
                  </button>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  저장하면 오늘부터 매일 자동으로 추가됩니다
                </p>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <NotionStyleEditor
                  items={editingRoutineItems}
                  onChange={setEditingRoutineItems}
                />
              </div>
              <div className="p-4 border-t border-outline flex space-x-2">
                <button
                  onClick={() => handleSaveRoutine(editingRoutineItems)}
                  disabled={isSavingRoutine}
                  className="flex-1 bg-accent text-white py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50"
                >
                  {isSavingRoutine ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setIsRoutineEditorOpen(false)}
                  className="px-4 py-2 border border-outline-strong rounded-lg hover:bg-surface-hover"
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
  )
}
