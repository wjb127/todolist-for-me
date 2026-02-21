'use client'

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react'
import { Target, Plus, ChevronRight, ChevronLeft, ChevronDown, Trash2, Calendar, CheckCircle2, Circle, Star, Search, Edit2, X, Save } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { Database } from '@/lib/database.types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

type BucketListItem = Database['public']['Tables']['bucketlist']['Row']
type BucketListInsert = Database['public']['Tables']['bucketlist']['Insert']
type BucketListUpdate = Database['public']['Tables']['bucketlist']['Update']

interface BucketListWithChildren extends BucketListItem {
  children?: BucketListWithChildren[]
}

interface MonthGroup {
  month: number       // 1-12, 0=미정
  label: string
  items: BucketListWithChildren[]
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
  expandedItemIds: Set<string>
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
  expandedItemIds
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
          {/* 확장/축소 버튼 */}
          <div className="flex items-center">
            {hasChildren ? (
              <button
                onClick={() => onToggleExpand(item.id)}
                className="min-w-[28px] min-h-[28px] p-1 hover:bg-surface-hover rounded-lg transition-colors flex items-center justify-center"
                aria-label={isExpanded ? "축소" : "펼치기"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-ink-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                )}
              </button>
            ) : (
              <div className="w-[28px]" />
            )}
          </div>

          {/* 체크박스 */}
          <button
            onClick={() => onToggleComplete(item)}
            className={`min-w-[32px] min-h-[32px] mr-2 flex items-center justify-center transition-colors ${
              item.completed ? 'text-green-600' : 'text-ink-muted hover:text-ink-secondary'
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
                  className={`flex-1 px-2 py-1 text-base font-medium bg-transparent border border-outline-strong rounded focus:outline-none focus:ring-2 focus:ring-accent ${
                    item.completed ? 'line-through text-ink-muted' : ''
                  }`}
                  autoFocus
                />
              ) : (
                <h3
                  onClick={() => {
                    setIsEditingTitle(true)
                    setTimeout(() => titleRef.current?.focus(), 50)
                  }}
                  className={`flex-1 font-medium cursor-text hover:bg-surface-hover px-2 py-1 rounded transition-colors ${
                    item.completed ? 'text-ink-muted line-through' : 'text-ink'
                  }`}
                >
                  {item.title}
                </h3>
              )}
              {item.priority === 'high' && (
                <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>

            {/* 설명 */}
            {item.description && (
              <p className="text-sm text-ink-secondary mb-2 px-2">
                {item.description}
              </p>
            )}

            {/* 진행률 바 */}
            {!item.completed && item.progress > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-ink-secondary mb-1">
                  <span>진행률</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="w-full bg-track rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(item.progress)}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 메타 정보 */}
            {item.target_date && (
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(item.target_date), 'yyyy.MM.dd', { locale: ko })}</span>
              </div>
            )}
          </div>

          {/* 편집 버튼 */}
          <button
            onClick={() => onOpenEditModal(item)}
            className="min-w-[40px] min-h-[40px] p-2 rounded-lg transition-all text-ink-muted hover:text-accent hover:bg-accent-soft md:opacity-0 md:group-hover:opacity-100"
            aria-label="편집"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 하위 항목 */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {item.children!.map((child) => (
            <BucketItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onToggleComplete={onToggleComplete}
              isExpanded={expandedItemIds.has(child.id)}
              onToggleExpand={onToggleExpand}
              onOpenEditModal={onOpenEditModal}
              expandedItemIds={expandedItemIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BucketListPage() {
  const [items, setItems] = useState<BucketListItem[]>([])
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

  // 연도 탭 + 월별 아코디언 상태
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set())

  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle } = useTheme()

  // 데이터 불러오기
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/bucketlist?showCompleted=${showCompleted}`)
      if (!res.ok) throw new Error('Failed to fetch bucketlist')
      const data: BucketListItem[] = await res.json()
      setItems(data || [])

      // 모든 항목 기본 펼침
      const allIds = new Set<string>(data?.map((item: BucketListItem) => item.id) || [])
      setExpandedItemIds(allIds)

      // 연도 초기화 (첫 로드 시에만)

      // 현재 월 자동 펼침
      const currentMonth = String(new Date().getMonth() + 1)
      setExpandedMonths(prev => {
        if (prev.size === 0) return new Set([currentMonth])
        return prev
      })
    } catch (error) {
      console.error('Error fetching bucketlist:', error)
    }
  }, [showCompleted])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // 월별 그룹핑
  const getMonthGroups = (): MonthGroup[] => {
    let filtered = items

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchingIds = new Set<string>()
      filtered.forEach(item => {
        if (item.title.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)) {
          matchingIds.add(item.id)
          if (item.parent_id) matchingIds.add(item.parent_id)
        }
      })
      filtered = filtered.filter(item => matchingIds.has(item.id))
    }

    // 부모/자식 분리
    const parents = filtered.filter(i => !i.parent_id)
    const childrenMap = new Map<string, BucketListItem[]>()
    filtered.filter(i => i.parent_id).forEach(child => {
      const list = childrenMap.get(child.parent_id!) || []
      list.push(child)
      childrenMap.set(child.parent_id!, list)
    })

    // 부모에 자식 연결
    const buildWithChildren = (parent: BucketListItem): BucketListWithChildren => ({
      ...parent,
      children: (childrenMap.get(parent.id) || [])
        .sort((a, b) => {
          const dateA = a.target_date || '9999-12-31'
          const dateB = b.target_date || '9999-12-31'
          if (dateA !== dateB) return dateA.localeCompare(dateB)
          return a.created_at.localeCompare(b.created_at)
        })
        .map(child => ({ ...child, children: [] }))
    })

    // 월별 분류
    const monthMap = new Map<number, BucketListWithChildren[]>()

    parents.forEach(parent => {
      let monthKey: number
      if (parent.target_date) {
        const d = new Date(parent.target_date)
        if (d.getFullYear() !== selectedYear) return
        monthKey = d.getMonth() + 1
      } else {
        monthKey = 0 // 미정
      }

      const list = monthMap.get(monthKey) || []
      list.push(buildWithChildren(parent))
      monthMap.set(monthKey, list)
    })

    // 월 내 정렬: target_date ASC → created_at ASC
    monthMap.forEach((items) => {
      items.sort((a, b) => {
        const dateA = a.target_date || '9999-12-31'
        const dateB = b.target_date || '9999-12-31'
        if (dateA !== dateB) return dateA.localeCompare(dateB)
        return a.created_at.localeCompare(b.created_at)
      })
    })

    // 결과: 1~12월 + 미정
    const result: MonthGroup[] = []
    for (let m = 1; m <= 12; m++) {
      const monthItems = monthMap.get(m)
      if (monthItems && monthItems.length > 0) {
        result.push({ month: m, label: `${m}월`, items: monthItems })
      }
    }
    const undated = monthMap.get(0)
    if (undated && undated.length > 0) {
      result.push({ month: 0, label: '미정', items: undated })
    }

    return result
  }

  // 월 아코디언 토글
  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(monthKey)) {
        next.delete(monthKey)
      } else {
        next.add(monthKey)
      }
      return next
    })
  }

  // 항목 펼침 토글
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // 업데이트
  const handleUpdate = async (id: string, updates: BucketListUpdate) => {
    try {
      const res = await fetch(`/api/bucketlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
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

  // 새 항목 추가 (모달 열기)
  const handleAddItem = async (parentId: string | null = null) => {
    if (parentId) {
      // 하위 항목 추가는 기존처럼 바로 생성
      const newItem: BucketListInsert = {
        title: '새로운 버킷리스트',
        description: '',
        parent_id: parentId,
        priority: 'medium',
        order_index: items.filter(i => i.parent_id === parentId).length,
        progress: 0
      }
      try {
        const res = await fetch('/api/bucketlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        })
        if (res.ok) fetchItems()
      } catch (error) {
        console.error('Error adding item:', error)
      }
    } else {
      // 최상위 항목은 모달로 생성
      setEditingItem(null)
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      setModalFormData({
        title: '',
        description: '',
        priority: 'medium',
        target_date: `${selectedYear}-${month}-01`,
        progress: 0
      })
      setIsModalOpen(true)
    }
  }

  // 항목 삭제
  const handleDelete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/bucketlist/${itemId}`, { method: 'DELETE' })
      if (res.ok) fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
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

  // 편집 저장 (신규 생성 / 기존 수정)
  const handleSaveEdit = async () => {
    if (!modalFormData.title.trim()) return

    if (editingItem) {
      // 기존 항목 수정
      const updates: BucketListUpdate = {
        title: modalFormData.title.trim(),
        description: modalFormData.description.trim() || null,
        priority: modalFormData.priority,
        target_date: modalFormData.target_date || null,
        progress: modalFormData.progress
      }
      try {
        const res = await fetch(`/api/bucketlist/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        if (res.ok) {
          fetchItems()
          closeEditModal()
        }
      } catch (error) {
        console.error('Error saving edit:', error)
      }
    } else {
      // 신규 항목 생성
      const newItem: BucketListInsert = {
        title: modalFormData.title.trim(),
        description: modalFormData.description.trim() || '',
        parent_id: null,
        priority: modalFormData.priority,
        target_date: modalFormData.target_date || null,
        order_index: items.filter(i => !i.parent_id).length,
        progress: modalFormData.progress
      }
      try {
        const res = await fetch('/api/bucketlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        })
        if (res.ok) {
          fetchItems()
          closeEditModal()
        }
      } catch (error) {
        console.error('Error creating item:', error)
      }
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

  const monthGroups = getMonthGroups()

  // 연도별 통계
  const yearItems = items.filter(i => {
    if (!i.parent_id && i.target_date) {
      return new Date(i.target_date).getFullYear() === selectedYear
    }
    if (!i.parent_id && !i.target_date) return true
    return false
  })
  const yearCompletedCount = yearItems.filter(i => i.completed).length
  const yearTotalCount = yearItems.length

  return (
    <div className={`min-h-screen p-4 pb-24 ${getBackgroundStyle()}`}>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-2">
              <Target className="h-6 md:h-7 w-6 md:w-7 text-purple-600" />
              버킷리스트
            </h1>
            <p className="text-xs md:text-sm text-ink-secondary">
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
        <div className={`${getCardStyle()} rounded-lg p-4 mb-4`}>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                placeholder="버킷리스트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${getInputStyle()}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showCompleted"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showCompleted" className="text-sm text-ink-secondary">
                완료된 항목 표시
              </label>
            </div>
          </div>
        </div>

        {/* 연도 선택 */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-2 text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold text-ink min-w-[80px] text-center">{selectedYear}년</span>
          <button
            onClick={() => setSelectedYear(prev => prev + 1)}
            className="p-2 text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* 연도 요약 */}
        <div className={`${getCardStyle()} rounded-lg p-3 mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-secondary">{selectedYear}년 진행률</span>
            <span className="text-sm text-ink-secondary">{yearCompletedCount}/{yearTotalCount}</span>
          </div>
          <div className="w-full bg-track rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: yearTotalCount > 0 ? `${(yearCompletedCount / yearTotalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* 월별 아코디언 */}
        {monthGroups.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">버킷리스트가 없습니다</p>
            <p className="text-sm">새로운 목표를 추가해보세요</p>
          </div>
        ) : (
          monthGroups.map(group => {
            const completedInMonth = group.items.filter(i => i.completed).length
            const totalInMonth = group.items.length
            const isMonthExpanded = expandedMonths.has(String(group.month))

            return (
              <div key={group.month} className="mb-3">
                {/* 월 헤더 */}
                <button
                  onClick={() => toggleMonth(String(group.month))}
                  className={`w-full flex items-center justify-between ${getCardStyle()} rounded-lg p-3 mb-1`}
                >
                  <div className="flex items-center gap-2">
                    {isMonthExpanded ? (
                      <ChevronDown className="h-4 w-4 text-ink-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink-muted" />
                    )}
                    <span className="font-semibold text-ink">
                      {group.month === 0 ? '📅 ' : ''}{group.label}
                    </span>
                    <span className="text-sm text-ink-muted">
                      ({completedInMonth}/{totalInMonth})
                    </span>
                  </div>
                  <div className="w-16 bg-track rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: totalInMonth > 0 ? `${(completedInMonth / totalInMonth) * 100}%` : '0%' }}
                    />
                  </div>
                </button>

                {/* 월 내 항목들 */}
                {isMonthExpanded && (
                  <div className="ml-1">
                    {group.items.map(item => (
                      <BucketItem
                        key={item.id}
                        item={item}
                        depth={0}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onAddChild={handleAddItem}
                        onToggleComplete={toggleComplete}
                        isExpanded={expandedItemIds.has(item.id)}
                        onToggleExpand={toggleItemExpanded}
                        onOpenEditModal={openEditModal}
                        expandedItemIds={expandedItemIds}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* 편집/생성 모달 */}
        {isModalOpen && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-outline">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{editingItem ? '버킷리스트 편집' : '새 버킷리스트'}</h2>
                  <button onClick={closeEditModal} className="p-2 hover:bg-surface-hover rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={modalFormData.title}
                    onChange={(e) => setModalFormData({ ...modalFormData, title: e.target.value })}
                    className={getInputStyle()}
                    placeholder="버킷리스트 제목"
                    autoFocus={!editingItem}
                  />
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
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
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
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
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
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
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
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

                {/* 추가 액션 버튼들 (편집 모드에서만) */}
                {editingItem && (
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
                )}
              </div>

              <div className="p-4 border-t border-outline flex justify-end space-x-2">
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
                  {editingItem ? '저장' : '추가'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
