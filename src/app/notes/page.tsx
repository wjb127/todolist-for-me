'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Save, Trash2, X, StickyNote } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTheme } from '@/lib/context/ThemeContext'

type Note = Database['public']['Tables']['notes']['Row']
type NoteInsert = Database['public']['Tables']['notes']['Insert']

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { getBackgroundStyle, getCardStyle, getButtonStyle, getInputStyle, getModalStyle, getModalBackdropStyle } = useTheme()

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
    } else {
      setNotes(data || [])
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    setIsLoading(true)
    const noteData: NoteInsert = {
      content: newNote.trim()
    }

    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select()
      .single()

    if (error) {
      console.error('Error adding note:', error)
    } else if (data) {
      setNotes([data, ...notes])
      setNewNote('')
    }
    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  const openEditModal = (note: Note) => {
    setEditingNote(note)
    setModalContent(note.content)
    setIsModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingNote || !modalContent.trim()) return

    setIsLoading(true)
    const { error } = await supabase
      .from('notes')
      .update({ content: modalContent.trim() })
      .eq('id', editingNote.id)

    if (error) {
      console.error('Error updating note:', error)
    } else {
      setNotes(notes.map(n => 
        n.id === editingNote.id 
          ? { ...n, content: modalContent.trim(), updated_at: new Date().toISOString() }
          : n
      ))
      closeModal()
    }
    setIsLoading(false)
  }

  const handleDeleteNote = async () => {
    if (!editingNote) return
    
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      setIsLoading(true)
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', editingNote.id)

      if (error) {
        console.error('Error deleting note:', error)
      } else {
        setNotes(notes.filter(n => n.id !== editingNote.id))
        closeModal()
      }
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingNote(null)
    setModalContent('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return '방금 전'
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`
    if (diffInHours < 24) return `${diffInHours}시간 전`
    if (diffInDays < 7) return `${diffInDays}일 전`
    
    return date.toLocaleDateString('ko-KR', { 
      month: 'numeric', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={getBackgroundStyle()}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">메모</h1>
          <div className="flex items-center text-sm text-gray-600">
            <StickyNote className="h-4 w-4 mr-1" />
            <span>{notes.length}개</span>
          </div>
        </div>

        {/* 새 메모 입력 영역 */}
        <div className={`${getCardStyle()} mb-4`}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="새 메모를 입력하세요..."
              className={`flex-1 ${getInputStyle()}`}
              disabled={isLoading}
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isLoading}
              className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyle()}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 메모 목록 */}
        <div className="space-y-2">
          {notes.length === 0 ? (
            <div className={`${getCardStyle()} text-center py-12`}>
              <StickyNote className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">아직 메모가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">위에서 첫 메모를 작성해보세요</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`${getCardStyle()} group hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => openEditModal(note)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <p className="text-gray-900 break-words">
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(note.created_at)}
                      {note.updated_at !== note.created_at && ' (수정됨)'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(note)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 편집 모달 */}
        {isModalOpen && editingNote && (
          <div className={getModalBackdropStyle()}>
            <div className={`${getModalStyle()} w-full max-w-md`}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">메모 편집</h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className={`w-full ${getInputStyle()} min-h-[120px] resize-none`}
                  placeholder="메모 내용을 입력하세요..."
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  작성: {formatDate(editingNote.created_at)}
                  {editingNote.updated_at !== editingNote.created_at && 
                    ` | 수정: ${formatDate(editingNote.updated_at)}`
                  }
                </p>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={handleDeleteNote}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>삭제</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={closeModal}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg ${getCardStyle()} hover:opacity-80 disabled:opacity-50`}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!modalContent.trim() || isLoading}
                    className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${getButtonStyle()}`}
                  >
                    <Save className="h-4 w-4" />
                    <span>저장</span>
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