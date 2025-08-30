import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotesPage from '../page'
import { supabase } from '@/lib/supabase/client'

// Mock the theme context
jest.mock('@/lib/context/ThemeContext', () => ({
  useTheme: () => ({
    getBackgroundStyle: () => 'bg-white',
    getCardStyle: () => 'bg-white shadow',
    getButtonStyle: () => 'bg-blue-600 text-white',
    getInputStyle: () => 'border-gray-300',
    getModalStyle: () => 'bg-white',
    getModalBackdropStyle: () => 'bg-black/50'
  })
}))

describe('Notes Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the notes page with title', () => {
      render(<NotesPage />)
      expect(screen.getByText('메모')).toBeInTheDocument()
    })

    it('should render the new note input field', () => {
      render(<NotesPage />)
      expect(screen.getByPlaceholderText('새 메모를 입력하세요...')).toBeInTheDocument()
    })

    it('should show empty state when no notes exist', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })

      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('아직 메모가 없습니다')).toBeInTheDocument()
        expect(screen.getByText('위에서 첫 메모를 작성해보세요')).toBeInTheDocument()
      })
    })

    it('should display note count', () => {
      render(<NotesPage />)
      expect(screen.getByText(/0개/)).toBeInTheDocument()
    })
  })

  describe('Note Creation', () => {
    it('should create a new note when pressing Enter', async () => {
      const user = userEvent.setup()
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: '1',
              content: 'New test note',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            error: null
          })
        })
      })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: mockInsert
      })
      
      render(<NotesPage />)
      
      const input = screen.getByPlaceholderText('새 메모를 입력하세요...')
      await user.type(input, 'New test note')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          content: 'New test note'
        })
      })
    })

    it('should not create empty note', async () => {
      const user = userEvent.setup()
      const mockInsert = jest.fn()
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: mockInsert
      })
      
      render(<NotesPage />)
      
      const input = screen.getByPlaceholderText('새 메모를 입력하세요...')
      await user.keyboard('{Enter}')
      
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should clear input after creating note', async () => {
      const user = userEvent.setup()
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: '1',
                content: 'Test note',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
              },
              error: null
            })
          })
        })
      })
      
      render(<NotesPage />)
      
      const input = screen.getByPlaceholderText('새 메모를 입력하세요...')
      await user.type(input, 'Test note')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })
  })

  describe('Note Display', () => {
    const mockNotes = [
      {
        id: '1',
        content: 'First note',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        content: 'Second note',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ]

    it('should display all notes', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockNotes, error: null })
        })
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
        expect(screen.getByText('Second note')).toBeInTheDocument()
      })
    })

    it('should display note count correctly', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockNotes, error: null })
        })
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/2개/)).toBeInTheDocument()
      })
    })
  })

  describe('Note Editing', () => {
    const mockNote = {
      id: '1',
      content: 'Original content',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should open edit modal when clicking on note', async () => {
      const user = userEvent.setup()
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockNote], error: null })
        })
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Original content')).toBeInTheDocument()
      })
      
      const note = screen.getByText('Original content')
      await user.click(note)
      
      expect(screen.getByText('메모 편집')).toBeInTheDocument()
    })

    it('should save edited note', async () => {
      const user = userEvent.setup()
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockNote], error: null })
        }),
        update: mockUpdate
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Original content')).toBeInTheDocument()
      })
      
      const note = screen.getByText('Original content')
      await user.click(note)
      
      const textarea = screen.getByDisplayValue('Original content')
      await user.clear(textarea)
      await user.type(textarea, 'Updated content')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          content: 'Updated content'
        })
      })
    })

    it('should delete note when clicking delete button', async () => {
      const user = userEvent.setup()
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      
      window.confirm = jest.fn().mockReturnValue(true)
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockNote], error: null })
        }),
        delete: mockDelete
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Original content')).toBeInTheDocument()
      })
      
      const note = screen.getByText('Original content')
      await user.click(note)
      
      const deleteButton = screen.getByText('삭제')
      await user.click(deleteButton)
      
      expect(window.confirm).toHaveBeenCalledWith('이 메모를 삭제하시겠습니까?')
      
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled()
      })
    })
  })

  describe('Time Display', () => {
    it('should format recent time as "방금 전"', async () => {
      const recentNote = {
        id: '1',
        content: 'Recent note',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [recentNote], error: null })
        })
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('방금 전')).toBeInTheDocument()
      })
    })

    it('should show "(수정됨)" for edited notes', async () => {
      const editedNote = {
        id: '1',
        content: 'Edited note',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [editedNote], error: null })
        })
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/\(수정됨\)/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ 
            data: null, 
            error: new Error('Fetch failed') 
          })
        })
      })
      
      render(<NotesPage />)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching notes:',
          expect.any(Error)
        )
      })
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle save error gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Save failed')
            })
          })
        })
      })
      
      render(<NotesPage />)
      
      const input = screen.getByPlaceholderText('새 메모를 입력하세요...')
      await user.type(input, 'Test note')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error adding note:',
          expect.any(Error)
        )
      })
      
      consoleErrorSpy.mockRestore()
    })
  })
})