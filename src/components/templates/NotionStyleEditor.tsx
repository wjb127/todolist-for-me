'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Plus, GripVertical, X, ChevronDown, ChevronRight, MoreHorizontal, Copy, Trash2 } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
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
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface TemplateItem {
  id: string
  title: string
  description?: string
  order_index: number
  subItems?: TemplateItem[]
  isExpanded?: boolean
}

interface NotionStyleItemProps {
  item: TemplateItem
  index: number
  depth: number
  onUpdate: (id: string, field: 'title' | 'description', value: string) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleExpand?: (id: string) => void
  onIndent: (id: string, direction: 'left' | 'right') => void
}

function NotionStyleItem({
  item,
  index,
  depth = 0,
  onUpdate,
  onDelete,
  onAddBelow,
  onDuplicate,
  onToggleExpand,
  onIndent
}: NotionStyleItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const { getCardStyle, getInputStyle } = useTheme()

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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, field: 'title' | 'description') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'title') {
        setIsEditingTitle(false)
        // Focus on description or create new item
        if (!item.description) {
          setIsEditingDesc(true)
          setTimeout(() => descRef.current?.focus(), 50)
        } else {
          onAddBelow(item.id)
        }
      } else {
        setIsEditingDesc(false)
        onAddBelow(item.id)
      }
    } else if (e.key === 'Escape') {
      if (field === 'title') setIsEditingTitle(false)
      else setIsEditingDesc(false)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onIndent(item.id, e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      e.preventDefault()
      onDelete(item.id)
    }
  }

  const hasSubItems = item.subItems && item.subItems.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${depth > 0 ? 'ml-8' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowMenu(false)
      }}
    >
      <div className={`flex items-start py-1 pr-2 rounded-lg transition-colors ${
        isHovered ? 'bg-gray-50 dark:bg-gray-800' : ''
      }`}>
        {/* Drag Handle & Expand/Collapse */}
        <div className="flex items-center mr-2">
          {hasSubItems && (
            <button
              onClick={() => onToggleExpand?.(item.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {item.isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}
          <div
            {...attributes}
            {...listeners}
            className={`p-1 cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all ${
              (isHovered || isDragging) ? 'opacity-100' : 'opacity-0'
            } ${!hasSubItems ? 'ml-6' : ''}`}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Bullet Point */}
        <div className="flex items-center justify-center w-6 h-6 mt-0.5 mr-2">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="relative">
            {isEditingTitle ? (
              <input
                ref={titleRef}
                type="text"
                value={item.title}
                onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => handleKeyDown(e, 'title')}
                placeholder="제목을 입력하세요..."
                className="w-full px-2 py-1 text-base font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded"
                autoFocus
              />
            ) : (
              <div
                onClick={() => {
                  setIsEditingTitle(true)
                  setTimeout(() => titleRef.current?.focus(), 50)
                }}
                className="px-2 py-1 text-base font-medium cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {item.title || <span className="text-gray-400">제목 입력...</span>}
              </div>
            )}
          </div>

          {/* Description */}
          {(item.description || isEditingDesc) && (
            <div className="relative mt-1">
              {isEditingDesc ? (
                <input
                  ref={descRef}
                  type="text"
                  value={item.description || ''}
                  onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
                  onBlur={() => setIsEditingDesc(false)}
                  onKeyDown={(e) => handleKeyDown(e, 'description')}
                  placeholder="설명 추가..."
                  className="w-full px-2 py-0.5 text-sm text-gray-600 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => {
                    setIsEditingDesc(true)
                    setTimeout(() => descRef.current?.focus(), 50)
                  }}
                  className="px-2 py-0.5 text-sm text-gray-600 cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {item.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center space-x-1 ml-2 transition-opacity ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={() => onAddBelow(item.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="아래에 추가"
          >
            <Plus className="h-4 w-4 text-gray-400" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <button
                  onClick={() => {
                    onDuplicate(item.id)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  복제
                </button>
                <button
                  onClick={() => {
                    onDelete(item.id)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub Items */}
      {hasSubItems && item.isExpanded && (
        <div className="ml-6">
          {item.subItems!.map((subItem, subIndex) => (
            <NotionStyleItem
              key={subItem.id}
              item={subItem}
              index={subIndex}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddBelow={onAddBelow}
              onDuplicate={onDuplicate}
              onToggleExpand={onToggleExpand}
              onIndent={onIndent}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NotionStyleEditorProps {
  items: TemplateItem[]
  onChange: (items: TemplateItem[]) => void
}

export default function NotionStyleEditor({ items, onChange }: NotionStyleEditorProps) {
  const [localItems, setLocalItems] = useState<TemplateItem[]>(items)
  const { getCardStyle } = useTheme()
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const handleUpdate = (id: string, field: 'title' | 'description', value: string) => {
    const updateItem = (items: TemplateItem[]): TemplateItem[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value }
        }
        if (item.subItems) {
          return { ...item, subItems: updateItem(item.subItems) }
        }
        return item
      })
    }
    
    const updated = updateItem(localItems)
    setLocalItems(updated)
    onChange(updated)
  }

  const handleDelete = (id: string) => {
    const deleteItem = (items: TemplateItem[]): TemplateItem[] => {
      return items.filter(item => {
        if (item.id === id) return false
        if (item.subItems) {
          item.subItems = deleteItem(item.subItems)
        }
        return true
      })
    }
    
    const updated = deleteItem(localItems)
    setLocalItems(updated)
    onChange(updated)
  }

  const handleAddBelow = (id: string) => {
    const newItem: TemplateItem = {
      id: Date.now().toString(),
      title: '',
      description: '',
      order_index: 0,
    }

    const addItem = (items: TemplateItem[]): TemplateItem[] => {
      const result: TemplateItem[] = []
      items.forEach((item, index) => {
        result.push(item)
        if (item.id === id) {
          result.push({ ...newItem, order_index: index + 1 })
        }
        if (item.subItems) {
          item.subItems = addItem(item.subItems)
        }
      })
      return result
    }

    const updated = addItem(localItems)
    setLocalItems(updated)
    onChange(updated)
  }

  const handleAddFirst = () => {
    const newItem: TemplateItem = {
      id: Date.now().toString(),
      title: '',
      description: '',
      order_index: 0,
    }
    
    const updated = [newItem, ...localItems]
    setLocalItems(updated)
    onChange(updated)
  }

  const handleDuplicate = (id: string) => {
    const duplicateItem = (items: TemplateItem[]): TemplateItem[] => {
      const result: TemplateItem[] = []
      items.forEach(item => {
        result.push(item)
        if (item.id === id) {
          result.push({
            ...item,
            id: Date.now().toString(),
            title: `${item.title} (복사본)`,
          })
        }
        if (item.subItems) {
          item.subItems = duplicateItem(item.subItems)
        }
      })
      return result
    }

    const updated = duplicateItem(localItems)
    setLocalItems(updated)
    onChange(updated)
  }

  const handleToggleExpand = (id: string) => {
    const toggleItem = (items: TemplateItem[]): TemplateItem[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, isExpanded: !item.isExpanded }
        }
        if (item.subItems) {
          return { ...item, subItems: toggleItem(item.subItems) }
        }
        return item
      })
    }

    const updated = toggleItem(localItems)
    setLocalItems(updated)
    onChange(updated)
  }

  const handleIndent = (id: string, direction: 'left' | 'right') => {
    // TODO: Implement indentation logic
    console.log('Indent', id, direction)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = localItems.findIndex((item) => item.id === active.id)
    const newIndex = localItems.findIndex((item) => item.id === over.id)

    const newItems = arrayMove(localItems, oldIndex, newIndex)
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order_index: index
    }))

    setLocalItems(reorderedItems)
    onChange(reorderedItems)
  }

  return (
    <div className={`${getCardStyle()} rounded-lg p-4`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {localItems.length === 0 ? (
            <button
              onClick={handleAddFirst}
              className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-blue-500"
            >
              <Plus className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">첫 번째 항목 추가</span>
              <span className="text-xs mt-1">클릭하거나 Enter 키를 누르세요</span>
            </button>
          ) : (
            <div className="space-y-0.5">
              {localItems.map((item, index) => (
                <NotionStyleItem
                  key={item.id}
                  item={item}
                  index={index}
                  depth={0}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onAddBelow={handleAddBelow}
                  onDuplicate={handleDuplicate}
                  onToggleExpand={handleToggleExpand}
                  onIndent={handleIndent}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>

      {/* Floating Add Button */}
      {localItems.length > 0 && (
        <button
          onClick={() => {
            const lastItem = localItems[localItems.length - 1]
            handleAddBelow(lastItem.id)
          }}
          className="mt-2 w-full py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center group"
        >
          <Plus className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm">새 항목 추가</span>
        </button>
      )}
    </div>
  )
}