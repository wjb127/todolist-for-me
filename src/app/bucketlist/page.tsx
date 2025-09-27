'use client'

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react'
import { Target, Plus, ChevronRight, ChevronDown, Trash2, Calendar, CheckCircle2, Circle, Star, Search, ChevronUp, ChevronDown as ArrowDown, Edit2, X, Save } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
// DnD imports removed - using arrow buttons instead

type BucketListItem = Database['public']['Tables']['bucketlist']['Row']
type BucketListInsert = Database['public']['Tables']['bucketlist']['Insert']
type BucketListUpdate = Database['public']['Tables']['bucketlist']['Update']

interface BucketListWithChildren extends BucketListItem {
  children?: BucketListWithChildren[]
}

interface BucketItemProps {
  item: BucketListWithChildren
  depth: number
  onUpdate: (id: string, updates: BucketListUpdate) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  onToggleComplete: (item: BucketListItem) => void
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  onOpenEditModal: (item: BucketListItem) => void
  onMoveUp: (item: BucketListItem) => void
  onMoveDown: (item: BucketListItem) => void
  isFirst: boolean
  isLast: boolean
}

function BucketItem({
  item,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
  onToggleComplete,
  isExpanded,
  onToggleExpand,
  onOpenEditModal,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: BucketItemProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const titleRef = useRef<HTMLInputElement>(null)
  const { getCardStyle } = useTheme()

  const hasChildren = item.children && item.children.length > 0

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitleEdit()
    } else if (e.key === 'Escape') {
      setEditTitle(item.title)
      setIsEditingTitle(false)
    }
  }

  const saveTitleEdit = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      onUpdate(item.id, { title: editTitle.trim() })
    } else {
      setEditTitle(item.title)
    }
    setIsEditingTitle(false)
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 20) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  return (
    <div className={`${depth > 0 ? 'ml-4' : ''}`}>
      <div className={`group ${getCardStyle()} rounded-lg p-3 mb-2 hover:shadow-md transition-all`}>
        <div className="flex items-start">
          {/* 확장/축소 & 순서 변경 버튼 - 모바일 최적화 */}
          <div className="flex items-center">
            {hasChildren && (
              <button
                onClick={() => onToggleExpand(item.id)}
                className="min-w-[28px] min-h-[28px] p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center"
                aria-label={isExpanded ? "축소" : "펼치기"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-[28px]" />}
            
            {/* 순서 변경 버튼 */}
            <div className="flex flex-col ml-1">
              <button
                onClick={() => onMoveUp(item)}
                disabled={isFirst}
                className="min-w-[24px] min-h-[20px] p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="위로 이동"
              >
                <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
              </button>
              <button
                onClick={() => onMoveDown(item)}
                disabled={isLast}
                className="min-w-[24px] min-h-[20px] p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="아래로 이동"
              >
                <ArrowDown className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* 체크박스 - 모바일 최적화 */}
          <button
            onClick={() => onToggleComplete(item)}
            className={`min-w-[32px] min-h-[32px] mr-2 flex items-center justify-center transition-colors ${
              item.completed ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label={item.completed ? "완료 취소" : "완료 표시"}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            {/* 제목 */}
            <div className="flex items-center gap-2 mb-1">
              {isEditingTitle ? (
                <input
                  ref={titleRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTitleEdit}
                  onKeyDown={handleTitleKeyDown}
                  className={`flex-1 px-2 py-1 text-base font-medium bg-transparent border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    item.completed ? 'line-through text-gray-500' : ''
                  }`}
                  autoFocus
                />
              ) : (
                <h3
                  onClick={() => {
                    setIsEditingTitle(true)
                    setTimeout(() => titleRef.current?.focus(), 50)
                  }}
                  className={`flex-1 font-medium cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors ${
                    item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.title}
                </h3>
              )}
              {item.priority === 'high' && (
                <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>

            {/* 설명 - 편집 모달에서만 표시, 여기서는 읽기 전용으로만 표시 */}
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 px-2">
                {item.description}
              </p>
            )}

            {/* 진행률 바 */}
            {!item.completed && item.progress > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>진행률</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(item.progress)}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 메타 정보 */}
            {item.target_date && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(item.target_date), 'yyyy.MM.dd', { locale: ko })}</span>
              </div>
            )}
          </div>

          {/* 편집 버튼 - 모바일 최적화 */}
          <button
            onClick={() => onOpenEditModal(item)}
            className="min-w-[40px] min-h-[40px] p-2 rounded-lg transition-all text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 md:opacity-0 md:group-hover:opacity-100"
            aria-label="편집"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 하위 항목 */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {item.children!.map((child, index) => (
            <BucketItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onToggleComplete={onToggleComplete}
              isExpanded={expandedItems.has(child.id)}
              onToggleExpand={onToggleExpand}
              onOpenEditModal={onOpenEditModal}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              isFirst={index === 0}
              isLast={index === item.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 컴포넌트 외부에 expandedItems 상태 선언
let expandedItems = new Set<string>()

export default function BucketListPage() {
  const [items, setItems] = useState<BucketListItem[]>([])
  const [localExpandedItems, setLocalExpandedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BucketListItem | null>(null)
  const [modalFormData, setModalFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    target_date: '',
    progress: 0
  })
  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle } = useTheme()

  // 전역 expandedItems를 로컬 상태와 동기화
  useEffect(() => {
    expandedItems = localExpandedItems
  }, [localExpandedItems])

  // 데이터 불러오기
  const fetchItems = useCallback(async () => {
    const query = supabase
      .from('bucketlist')
      .select('*')
      .order('order_index', { ascending: true })

    if (!showCompleted) {
      query.eq('completed', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching bucketlist:', error)
    } else {
      setItems(data || [])
      // 기본적으로 모든 항목 펼치기
      const allIds = new Set(data?.map(item => item.id) || [])
      setLocalExpandedItems(allIds)
    }
  }, [showCompleted])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // 트리 구조로 변환
  const buildTree = (items: BucketListItem[]): BucketListWithChildren[] => {
    const map = new Map<string, BucketListWithChildren>()
    const roots: BucketListWithChildren[] = []

    items.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    items.forEach(item => {
      const node = map.get(item.id)!
      if (item.parent_id) {
        const parent = map.get(item.parent_id)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    const sortTree = (nodes: BucketListWithChildren[]) => {
      nodes.sort((a, b) => a.order_index - b.order_index)
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortTree(node.children)
        }
      })
    }

    sortTree(roots)
    return roots
  }

  // 필터링된 트리 가져오기
  const getFilteredTree = (): BucketListWithChildren[] => {
    let filtered = items

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return buildTree(filtered)
  }

  // 토글 확장/축소
  const toggleExpanded = (itemId: string) => {
    setLocalExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // 업데이트
  const handleUpdate = async (id: string, updates: BucketListUpdate) => {
    const { error } = await supabase
      .from('bucketlist')
      .update(updates)
      .eq('id', id)

    if (!error) {
      fetchItems()
    }
  }

  // 완료 토글
  const toggleComplete = async (item: BucketListItem) => {
    const updates: BucketListUpdate = {
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null
    }

    await handleUpdate(item.id, updates)
  }

  // 새 항목 추가
  const handleAddItem = async (parentId: string | null = null) => {
    const newItem: BucketListInsert = {
      title: '새로운 버킷리스트',
      description: '',
      parent_id: parentId,
      priority: 'medium',
      order_index: items.filter(i => i.parent_id === parentId).length,
      progress: 0
    }

    const { error } = await supabase
      .from('bucketlist')
      .insert(newItem)

    if (!error) {
      fetchItems()
    }
  }

  // 항목 삭제
  const handleDelete = async (itemId: string) => {
    const { error } = await supabase
      .from('bucketlist')
      .delete()
      .eq('id', itemId)

    if (!error) {
      fetchItems()
    }
  }

  // 편집 모달 열기
  const openEditModal = (item: BucketListItem) => {
    setEditingItem(item)
    setModalFormData({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      target_date: item.target_date || '',
      progress: item.progress || 0
    })
    setIsModalOpen(true)
  }

  // 편집 모달 닫기
  const closeEditModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setModalFormData({
      title: '',
      description: '',
      priority: 'medium',
      target_date: '',
      progress: 0
    })
  }

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!editingItem || !modalFormData.title.trim()) return

    const updates: BucketListUpdate = {
      title: modalFormData.title.trim(),
      description: modalFormData.description.trim() || null,
      priority: modalFormData.priority,
      target_date: modalFormData.target_date || null,
      progress: modalFormData.progress
    }

    const { error } = await supabase
      .from('bucketlist')
      .update(updates)
      .eq('id', editingItem.id)

    if (!error) {
      fetchItems()
      closeEditModal()
    }
  }

  // 모달에서 삭제
  const handleModalDelete = async () => {
    if (!editingItem) return
    
    if (confirm('정말 삭제하시겠습니까? 하위 항목도 모두 삭제됩니다.')) {
      await handleDelete(editingItem.id)
      closeEditModal()
    }
  }

  // 모달에서 하위 항목 추가
  const handleModalAddChild = async () => {
    if (!editingItem) return
    
    await handleAddItem(editingItem.id)
    closeEditModal()
  }


  // 순서 변경 함수들
  const handleMoveUp = async (item: BucketListItem) => {
    const siblings = items.filter(i => i.parent_id === item.parent_id)
      .sort((a, b) => a.order_index - b.order_index)
    
    const currentIndex = siblings.findIndex(i => i.id === item.id)
    if (currentIndex <= 0) return
    
    const prevItem = siblings[currentIndex - 1]
    
    // order_index 교환
    await supabase
      .from('bucketlist')
      .update({ order_index: prevItem.order_index })
      .eq('id', item.id)
    
    await supabase
      .from('bucketlist')
      .update({ order_index: item.order_index })
      .eq('id', prevItem.id)
    
    fetchItems()
  }

  const handleMoveDown = async (item: BucketListItem) => {
    const siblings = items.filter(i => i.parent_id === item.parent_id)
      .sort((a, b) => a.order_index - b.order_index)
    
    const currentIndex = siblings.findIndex(i => i.id === item.id)
    if (currentIndex < 0 || currentIndex >= siblings.length - 1) return
    
    const nextItem = siblings[currentIndex + 1]
    
    // order_index 교환
    await supabase
      .from('bucketlist')
      .update({ order_index: nextItem.order_index })
      .eq('id', item.id)
    
    await supabase
      .from('bucketlist')
      .update({ order_index: item.order_index })
      .eq('id', nextItem.id)
    
    fetchItems()
  }

  const tree = getFilteredTree()

  return (
    <div className={`min-h-screen p-4 pb-24 ${getBackgroundStyle()}`}>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 - 모바일 최적화 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-6 md:h-7 w-6 md:w-7 text-purple-600" />
              버킷리스트
            </h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              인생에서 이루고 싶은 목표들
            </p>
          </div>
          <button
            onClick={() => handleAddItem(null)}
            className={`min-w-[44px] min-h-[44px] flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg ${getButtonStyle()}`}
          >
            <Plus className="h-5 md:h-4 w-5 md:w-4" />
            <span className="hidden md:inline">새 목표</span>
          </button>
        </div>

        {/* 필터 바 */}
        <div className={`${getCardStyle()} rounded-lg p-4 mb-6`}>
          <div className="flex flex-col gap-4">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="버킷리스트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${getInputStyle()}`}
              />
            </div>

            {/* 완료 항목 표시 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showCompleted"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showCompleted" className="text-sm text-gray-700 dark:text-gray-300">
                완료된 항목 표시
              </label>
            </div>
          </div>
        </div>

        {/* 버킷리스트 트리 */}
        <div>
          {tree.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">버킷리스트가 없습니다</p>
              <p className="text-sm">새로운 목표를 추가해보세요</p>
            </div>
          ) : (
            tree.map((item, index) => (
              <BucketItem
                key={item.id}
                item={item}
                depth={0}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddChild={handleAddItem}
                onToggleComplete={toggleComplete}
                isExpanded={localExpandedItems.has(item.id)}
                onToggleExpand={toggleExpanded}
                onOpenEditModal={openEditModal}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={index === 0}
                isLast={index === tree.length - 1}
              />
            ))
          )}
        </div>

        {/* 편집 모달 */}
        {isModalOpen && editingItem && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">버킷리스트 편집</h2>
                  <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={modalFormData.title}
                    onChange={(e) => setModalFormData({ ...modalFormData, title: e.target.value })}
                    className={getInputStyle()}
                    placeholder="버킷리스트 제목"
                  />
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    설명
                  </label>
                  <textarea
                    value={modalFormData.description}
                    onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                    className={getInputStyle()}
                    rows={3}
                    placeholder="상세 설명 (선택사항)"
                  />
                </div>

                {/* 우선순위 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    우선순위
                  </label>
                  <select
                    value={modalFormData.priority}
                    onChange={(e) => setModalFormData({ ...modalFormData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className={getInputStyle()}
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음 ⭐</option>
                  </select>
                </div>

                {/* 목표 날짜 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    목표 날짜
                  </label>
                  <input
                    type="date"
                    value={modalFormData.target_date}
                    onChange={(e) => setModalFormData({ ...modalFormData, target_date: e.target.value })}
                    className={getInputStyle()}
                  />
                </div>

                {/* 진행률 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    진행률: {modalFormData.progress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={modalFormData.progress}
                    onChange={(e) => setModalFormData({ ...modalFormData, progress: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* 추가 액션 버튼들 */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleModalAddChild}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    하위 항목 추가
                  </button>
                  <button
                    onClick={handleModalDelete}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                <button
                  onClick={closeEditModal}
                  className={`px-4 py-2 rounded-lg ${getCardStyle()} hover:opacity-80`}
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!modalFormData.title.trim()}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${getButtonStyle()}`}
                >
                  <Save className="h-4 w-4" />
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}