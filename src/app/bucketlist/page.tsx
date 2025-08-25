'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Plus, ChevronRight, ChevronDown, MoreHorizontal, Copy, Trash2, Calendar, Tag, TrendingUp, CheckCircle2, Circle, Star, Sparkles, Filter, Search } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

type BucketListItem = Database['public']['Tables']['bucketlist']['Row']
type BucketListInsert = Database['public']['Tables']['bucketlist']['Insert']
type BucketListUpdate = Database['public']['Tables']['bucketlist']['Update']

interface BucketListWithChildren extends BucketListItem {
  children?: BucketListWithChildren[]
}

// 카테고리 정의
const categories = [
  { value: 'general', label: '일반', icon: '📌', color: 'bg-gray-100 text-gray-700' },
  { value: 'travel', label: '여행', icon: '✈️', color: 'bg-blue-100 text-blue-700' },
  { value: 'career', label: '커리어', icon: '💼', color: 'bg-purple-100 text-purple-700' },
  { value: 'health', label: '건강', icon: '💪', color: 'bg-green-100 text-green-700' },
  { value: 'hobby', label: '취미', icon: '🎨', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'relationship', label: '관계', icon: '❤️', color: 'bg-pink-100 text-pink-700' },
  { value: 'financial', label: '재정', icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'learning', label: '학습', icon: '📚', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'experience', label: '경험', icon: '🌟', color: 'bg-orange-100 text-orange-700' },
]

export default function BucketListPage() {
  const [items, setItems] = useState<BucketListItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingItem, setEditingItem] = useState<BucketListItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle } = useTheme()

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
      setExpandedItems(allIds)
    }
  }, [showCompleted])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // 트리 구조로 변환
  const buildTree = (items: BucketListItem[]): BucketListWithChildren[] => {
    const map = new Map<string, BucketListWithChildren>()
    const roots: BucketListWithChildren[] = []

    // 모든 항목을 맵에 추가
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    // 트리 구조 구성
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

    // 각 레벨에서 order_index로 정렬
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

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    // 검색 필터
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
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // 완료 토글
  const toggleComplete = async (item: BucketListItem) => {
    const updates: BucketListUpdate = {
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null
    }

    const { error } = await supabase
      .from('bucketlist')
      .update(updates)
      .eq('id', item.id)

    if (!error) {
      fetchItems()
    }
  }

  // 새 항목 추가
  const handleAddItem = async (parentId: string | null = null) => {
    const newItem: BucketListInsert = {
      title: '새로운 버킷리스트',
      description: '',
      parent_id: parentId,
      category: 'general',
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
    if (confirm('이 항목과 하위 항목을 모두 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('bucketlist')
        .delete()
        .eq('id', itemId)

      if (!error) {
        fetchItems()
      }
    }
  }

  // 항목 복제
  const handleDuplicate = async (item: BucketListItem) => {
    const newItem: BucketListInsert = {
      ...item,
      id: undefined,
      title: `${item.title} (복사본)`,
      completed: false,
      completed_at: null,
      created_at: undefined,
      updated_at: undefined
    }

    const { error } = await supabase
      .from('bucketlist')
      .insert(newItem)

    if (!error) {
      fetchItems()
    }
  }

  // 편집 모달 열기
  const openEditModal = (item: BucketListItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!editingItem) return

    const { error } = await supabase
      .from('bucketlist')
      .update(editingItem)
      .eq('id', editingItem.id)

    if (!error) {
      fetchItems()
      setIsModalOpen(false)
      setEditingItem(null)
    }
  }

  // 진행률 색상
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 20) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  // 트리 아이템 렌더링
  const renderTreeItem = (item: BucketListWithChildren, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const category = categories.find(c => c.value === item.category)

    return (
      <div key={item.id} className={`${depth > 0 ? 'ml-8' : ''}`}>
        <div className={`group ${getCardStyle()} rounded-lg p-3 mb-2 hover:shadow-md transition-all`}>
          <div className="flex items-start">
            {/* 확장/축소 버튼 */}
            <button
              onClick={() => toggleExpanded(item.id)}
              className={`p-1 mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${!hasChildren ? 'invisible' : ''}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {/* 체크박스 */}
            <button
              onClick={() => toggleComplete(item)}
              className={`mr-3 mt-0.5 transition-colors ${
                item.completed ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                  {item.title}
                </h3>
                {category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${category.color}`}>
                    {category.icon} {category.label}
                  </span>
                )}
                {item.priority === 'high' && (
                  <Star className="h-4 w-4 text-yellow-500" />
                )}
              </div>

              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
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
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {item.target_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(item.target_date), 'yyyy.MM.dd', { locale: ko })}</span>
                  </div>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>{item.tags.join(', ')}</span>
                  </div>
                )}
                {hasChildren && (
                  <span>{item.children!.length}개 하위 항목</span>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleAddItem(item.id)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="하위 항목 추가"
              >
                <Plus className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => openEditModal(item)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="편집"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => handleDuplicate(item)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="복제"
              >
                <Copy className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                title="삭제"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>

        {/* 하위 항목 */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {item.children!.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const tree = getFilteredTree()

  return (
    <div className={`min-h-screen p-4 pb-24 ${getBackgroundStyle()}`}>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-7 w-7 text-purple-600" />
              버킷리스트
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              인생에서 이루고 싶은 목표들
            </p>
          </div>
          <button
            onClick={() => handleAddItem(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getButtonStyle()}`}
          >
            <Plus className="h-4 w-4" />
            <span>새 목표</span>
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

            {/* 카테고리 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                전체
              </button>
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-purple-600 text-white'
                      : cat.color
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
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
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">버킷리스트가 없습니다</p>
              <p className="text-sm">새로운 목표를 추가해보세요</p>
            </div>
          ) : (
            tree.map(item => renderTreeItem(item))
          )}
        </div>

        {/* 편집 모달 */}
        {isModalOpen && editingItem && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} rounded-xl w-full max-w-md`}>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">버킷리스트 편집</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">제목</label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className={getInputStyle()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">설명</label>
                    <textarea
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className={`${getInputStyle()} resize-none`}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">카테고리</label>
                      <select
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className={getInputStyle()}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">우선순위</label>
                      <select
                        value={editingItem.priority}
                        onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className={getInputStyle()}
                      >
                        <option value="low">낮음</option>
                        <option value="medium">보통</option>
                        <option value="high">높음</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">목표 날짜</label>
                    <input
                      type="date"
                      value={editingItem.target_date || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, target_date: e.target.value })}
                      className={getInputStyle()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">진행률 ({editingItem.progress}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editingItem.progress}
                      onChange={(e) => setEditingItem({ ...editingItem, progress: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleSaveEdit}
                    className={`flex-1 py-2 rounded-lg ${getButtonStyle()}`}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setEditingItem(null)
                    }}
                    className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
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