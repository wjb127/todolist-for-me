'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, CheckCircle, Calendar, Eye, Search, Filter, Clock, BarChart3, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/context/ThemeContext'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import NotionStyleEditor, { TemplateItem } from '@/components/templates/NotionStyleEditor'

type Template = Database['public']['Tables']['templates']['Row']
type TemplateInsert = Database['public']['Tables']['templates']['Insert']


export default function TemplatesPage() {
  const router = useRouter()
  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle } = useTheme()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'usage'>('created')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    items: [] as TemplateItem[]
  })


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

  // 템플릿 필터링 및 정렬
  const filteredAndSortedTemplates = templates
    .filter(template => 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'usage':
          return (b.items?.length || 0) - (a.items?.length || 0)
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const handlePreviewTemplate = (template: Template) => {
    setPreviewTemplate(template)
  }

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const duplicatedTemplate = {
        title: `${template.title} (복사본)`,
        description: template.description,
        items: template.items
      }

      const { error } = await supabase
        .from('templates')
        .insert(duplicatedTemplate as TemplateInsert)

      if (error) throw error
      
      await fetchTemplates()
      alert('템플릿이 복사되었습니다!')
    } catch (error) {
      console.error('Error duplicating template:', error)
      alert('템플릿 복사 중 오류가 발생했습니다.')
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

  const handleItemsChange = (items: TemplateItem[]) => {
    // Ensure order_index is set correctly for all items
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order_index: index
    }))
    
    setFormData({
      ...formData,
      items: reorderedItems
    })
  }



  return (
    <div className={`min-h-screen p-4 pb-24 ${getBackgroundStyle()}`}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">템플릿</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{filteredAndSortedTemplates.length}개의 템플릿</p>
          </div>
          <button
            onClick={() => openModal()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyle()} hover:shadow-lg`}
          >
            <Plus className="h-4 w-4" />
            <span>새 템플릿</span>
          </button>
        </div>

        {/* 검색 및 필터 바 */}
        <div className={`${getCardStyle()} mb-6 space-y-4`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${getInputStyle()} transition-colors`}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'name' | 'usage')}
                className={`text-sm rounded px-3 py-2 ${getInputStyle()} transition-colors`}
              >
                <option value="created">최근 생성순</option>
                <option value="name">이름순</option>
                <option value="usage">항목 수순</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAndSortedTemplates.length === 0 ? (
            <div className={`${getCardStyle()} text-center py-12`}>
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400 dark:text-gray-500" />
              <p className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">템플릿이 없습니다</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? '검색 결과가 없습니다' : '새로운 템플릿을 만들어보세요'}
              </p>
            </div>
          ) : (
            filteredAndSortedTemplates.map((template) => (
              <div key={template.id} className={`transition-all hover:shadow-lg hover:scale-[1.02] ${
                template.is_active 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-4' 
                  : `${getCardStyle()} hover:border-blue-200 dark:hover:border-blue-700`
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{template.title}</h3>
                      {template.is_active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          활성중
                        </span>
                      )}
                    </div>

                    {/* 템플릿 통계 정보 */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                        <BarChart3 className="h-3 w-3" />
                        <span>{template.items?.length || 0}개 항목</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(template.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{template.description}</p>
                    )}

                    {template.is_active && template.applied_from_date && (
                      <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(template.applied_from_date).toLocaleDateString('ko-KR')}부터 적용 중
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          매일 자동으로 할 일이 생성됩니다 (향후 3개월간)
                        </p>
                      </div>
                    )}

                    {template.is_active && !template.applied_from_date && (
                      <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                          ⚠️ 활성화되었지만 적용 날짜가 설정되지 않음
                        </p>
                      </div>
                    )}

                    {/* 템플릿 항목 미리보기 (최대 3개) */}
                    <div className="space-y-1">
                      {template.items
                        .sort((a, b) => a.order_index - b.order_index)
                        .slice(0, 3)
                        .map((item, index) => (
                          <div key={item.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                            <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-medium mr-2">
                              {index + 1}
                            </span>
                            {item.title}
                          </div>
                        ))}
                      {template.items.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                          +{template.items.length - 3}개 더...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex flex-col space-y-1 ml-4">
                    <button
                      onClick={() => handlePreviewTemplate(template)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="미리보기"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal(template)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="편집"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      title="복사"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {template.is_active ? (
                      <button
                        onClick={() => handleDeactivateTemplate(template)}
                        className="p-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="비활성화"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        disabled={isApplying}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="활성화"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {isModalOpen && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md shadow-2xl`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      {editingTemplate ? (
                        <>
                          <Edit className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                          템플릿 편집
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                          새 템플릿 만들기
                        </>
                      )}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {editingTemplate ? '기존 템플릿을 수정합니다' : '새로운 할 일 템플릿을 만들어보세요'}
                    </p>
                  </div>
                  <button 
                    onClick={closeModal} 
                    className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      템플릿 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`${getInputStyle()} transition-colors`}
                      placeholder="예: 일일 루틴, 주간 계획..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      설명 (선택사항)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`${getInputStyle()} resize-none transition-colors`}
                      rows={3}
                      placeholder="템플릿에 대한 간단한 설명을 입력하세요"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      할 일 목록 *
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      {formData.items.length}개의 할 일이 있습니다
                    </p>
                  </div>
                  
                  <NotionStyleEditor
                    items={formData.items}
                    onChange={handleItemsChange}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex space-x-3">
                <button
                  onClick={handleSaveTemplate}
                  disabled={!formData.title || formData.items.length === 0}
                  className={`flex-1 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium transition-colors ${getButtonStyle()} shadow-sm hover:shadow-md`}
                >
                  <Save className="h-4 w-4" />
                  <span>{editingTemplate ? '수정 완료' : '템플릿 생성'}</span>
                </button>
                <button
                  onClick={closeModal}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${getCardStyle()} hover:opacity-80 shadow-sm`}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 템플릿 미리보기 모달 */}
        {previewTemplate && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md shadow-2xl`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                      템플릿 미리보기
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{previewTemplate.title}</p>
                  </div>
                  <button 
                    onClick={() => setPreviewTemplate(null)} 
                    className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 템플릿 정보 */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{previewTemplate.title}</h3>
                  {previewTemplate.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{previewTemplate.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {previewTemplate.items?.length || 0}개 항목
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(previewTemplate.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    {previewTemplate.is_active && (
                      <span className="flex items-center text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        활성중
                      </span>
                    )}
                  </div>
                </div>

                {/* 할 일 목록 */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full mr-2"></span>
                    할 일 목록 ({previewTemplate.items?.length || 0}개)
                  </h4>
                  <div className="space-y-2">
                    {previewTemplate.items
                      ?.sort((a, b) => a.order_index - b.order_index)
                      .map((item, index) => (
                        <div key={item.id} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center text-sm font-medium flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 적용 정보 */}
                {previewTemplate.is_active && previewTemplate.applied_from_date && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      적용 정보
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {new Date(previewTemplate.applied_from_date).toLocaleDateString('ko-KR')}부터 매일 자동 적용
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      향후 3개월간 자동으로 할 일이 생성됩니다
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex space-x-2">
                {!previewTemplate.is_active && (
                  <button
                    onClick={() => {
                      setPreviewTemplate(null)
                      handleApplyTemplate(previewTemplate)
                    }}
                    disabled={isApplying}
                    className={`flex-1 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2 font-medium transition-colors ${getButtonStyle()} shadow-sm hover:shadow-md`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>템플릿 적용</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setPreviewTemplate(null)
                    openModal(previewTemplate)
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium shadow-sm hover:shadow-md"
                >
                  <Edit className="h-4 w-4" />
                  <span>편집</span>
                </button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium shadow-sm ${getCardStyle()} hover:opacity-80`}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}