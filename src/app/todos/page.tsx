'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, CheckSquare, Square, Clock, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Todo = Database['public']['Tables']['todos']['Row']
type Template = Database['public']['Tables']['templates']['Row']

export default function TodosPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [todos, setTodos] = useState<Todo[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [newTodoTitle, setNewTodoTitle] = useState('')

  useEffect(() => {
    fetchTodos()
    fetchTemplates()
    checkAndApplyActiveTemplate()
  }, [selectedDate])

  const fetchTodos = async () => {
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
  }

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
    } else {
      setTemplates(data || [])
    }
  }

  const checkAndApplyActiveTemplate = async () => {
    try {
      // 활성화된 템플릿 찾기
      const { data: activeTemplate, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error || !activeTemplate) return

      // 선택된 날짜가 템플릿 적용 날짜 이후인지 확인
      if (activeTemplate.applied_from_date && selectedDate >= activeTemplate.applied_from_date) {
        // 해당 날짜에 이미 해당 템플릿의 todos가 있는지 확인
        const { data: existingTodos } = await supabase
          .from('todos')
          .select('id')
          .eq('date', selectedDate)
          .eq('template_id', activeTemplate.id)

        // 이미 todos가 있으면 자동 생성하지 않음
        if (existingTodos && existingTodos.length > 0) return

        // 템플릿으로부터 todos 자동 생성
        const newTodos = activeTemplate.items.map((item, index) => ({
          template_id: activeTemplate.id,
          date: selectedDate,
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
          } else {
            // todos가 자동 생성되었으면 다시 fetch
            fetchTodos()
          }
        }
      }
    } catch (error) {
      console.error('Error checking active template:', error)
    }
  }

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

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Todo 리스트</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">날짜 선택</label>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {formatDate(selectedDate)}
            </div>
          </div>

          {totalCount > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
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
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  활성 템플릿: {templates.find(t => t.is_active)?.title}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                오늘부터 향후 날짜들에 자동으로 적용됩니다.
              </p>
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
              <div key={todo.id} className="bg-white rounded-lg shadow-sm p-4">
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
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
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
                    {todo.template_id && (
                      <div className="flex items-center space-x-1 mt-2">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-blue-600">템플릿</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
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
                      <h3 className="font-medium">{template.title}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600">{template.description}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {template.items.length}개 항목
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