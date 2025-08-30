import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BucketListPage from '../page'
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

describe('BucketList Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the bucketlist page with title', () => {
      render(<BucketListPage />)
      expect(screen.getByText('버킷리스트')).toBeInTheDocument()
    })

    it('should render the add new goal button', () => {
      render(<BucketListPage />)
      expect(screen.getByText('새 목표')).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<BucketListPage />)
      expect(screen.getByPlaceholderText('버킷리스트 검색...')).toBeInTheDocument()
    })

    it('should render show completed checkbox', () => {
      render(<BucketListPage />)
      expect(screen.getByLabelText('완료된 항목 표시')).toBeInTheDocument()
    })

    it('should show empty state when no items exist', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })

      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('버킷리스트가 없습니다')).toBeInTheDocument()
        expect(screen.getByText('새로운 목표를 추가해보세요')).toBeInTheDocument()
      })
    })
  })

  describe('Item Creation', () => {
    it('should create a new item when clicking add button', async () => {
      const user = userEvent.setup()
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        insert: mockInsert
      })
      
      render(<BucketListPage />)
      
      const addButton = screen.getByText('새 목표')
      await user.click(addButton)
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          title: '새로운 버킷리스트',
          description: '',
          parent_id: null,
          priority: 'medium',
          order_index: 0,
          progress: 0
        })
      })
    })
  })

  describe('Item Display', () => {
    const mockItems = [
      {
        id: '1',
        title: '세계 여행',
        description: '유럽 배낭여행',
        parent_id: null,
        priority: 'high',
        order_index: 0,
        progress: 30,
        completed: false,
        target_date: '2025-12-31',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        depth: 0,
        completed_at: null
      },
      {
        id: '2',
        title: '프랑스 파리',
        description: '에펠탑 방문',
        parent_id: '1',
        priority: 'medium',
        order_index: 0,
        progress: 0,
        completed: false,
        target_date: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        depth: 1,
        completed_at: null
      }
    ]

    it('should display all items in tree structure', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
        })
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('세계 여행')).toBeInTheDocument()
        expect(screen.getByText('프랑스 파리')).toBeInTheDocument()
      })
    })

    it('should display item descriptions', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
        })
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('유럽 배낭여행')).toBeInTheDocument()
        expect(screen.getByText('에펠탑 방문')).toBeInTheDocument()
      })
    })

    it('should display progress bar for items with progress', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItems[0]], error: null })
        })
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('진행률')).toBeInTheDocument()
        expect(screen.getByText('30%')).toBeInTheDocument()
      })
    })

    it('should display target date when present', async () => {
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItems[0]], error: null })
        })
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/2025\.12\.31/)).toBeInTheDocument()
      })
    })
  })

  describe('Item Editing', () => {
    const mockItem = {
      id: '1',
      title: 'Test Item',
      description: 'Test Description',
      parent_id: null,
      priority: 'medium',
      order_index: 0,
      progress: 50,
      completed: false,
      target_date: '2025-01-01',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      depth: 0,
      completed_at: null
    }

    it('should open edit modal when clicking edit button', async () => {
      const user = userEvent.setup()
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItem], error: null })
        })
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument()
      })
      
      const editButton = screen.getByLabelText('편집')
      await user.click(editButton)
      
      expect(screen.getByText('버킷리스트 편집')).toBeInTheDocument()
    })

    it('should save edited item', async () => {
      const user = userEvent.setup()
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItem], error: null })
        }),
        update: mockUpdate
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument()
      })
      
      const editButton = screen.getByLabelText('편집')
      await user.click(editButton)
      
      const titleInput = screen.getByDisplayValue('Test Item')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Item')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled()
      })
    })

    it('should delete item from modal', async () => {
      const user = userEvent.setup()
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      
      window.confirm = jest.fn().mockReturnValue(true)
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItem], error: null })
        }),
        delete: mockDelete
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument()
      })
      
      const editButton = screen.getByLabelText('편집')
      await user.click(editButton)
      
      const deleteButton = screen.getByText('삭제')
      await user.click(deleteButton)
      
      expect(window.confirm).toHaveBeenCalledWith('정말 삭제하시겠습니까? 하위 항목도 모두 삭제됩니다.')
      
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled()
      })
    })

    it('should add child item from modal', async () => {
      const user = userEvent.setup()
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItem], error: null })
        }),
        insert: mockInsert
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument()
      })
      
      const editButton = screen.getByLabelText('편집')
      await user.click(editButton)
      
      const addChildButton = screen.getByText('하위 항목 추가')
      await user.click(addChildButton)
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_id: '1'
          })
        )
      })
    })
  })

  describe('Item Completion', () => {
    const mockItem = {
      id: '1',
      title: 'Test Item',
      description: '',
      parent_id: null,
      priority: 'medium',
      order_index: 0,
      progress: 0,
      completed: false,
      target_date: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      depth: 0,
      completed_at: null
    }

    it('should toggle item completion', async () => {
      const user = userEvent.setup()
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockItem], error: null })
        }),
        update: mockUpdate
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument()
      })
      
      const checkButton = screen.getByLabelText('완료 표시')
      await user.click(checkButton)
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: true
          })
        )
      })
    })
  })

  describe('Search and Filter', () => {
    const mockItems = [
      {
        id: '1',
        title: '여행 계획',
        description: '세계 여행',
        parent_id: null,
        priority: 'high',
        order_index: 0,
        progress: 0,
        completed: false,
        target_date: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        depth: 0,
        completed_at: null
      },
      {
        id: '2',
        title: '운동 목표',
        description: '마라톤 완주',
        parent_id: null,
        priority: 'medium',
        order_index: 1,
        progress: 0,
        completed: true,
        target_date: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        depth: 0,
        completed_at: '2024-06-01'
      }
    ]

    it('should filter items by search query', async () => {
      const user = userEvent.setup()
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
        })
      })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('여행 계획')).toBeInTheDocument()
        expect(screen.getByText('운동 목표')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('버킷리스트 검색...')
      await user.type(searchInput, '여행')
      
      expect(screen.getByText('여행 계획')).toBeInTheDocument()
      expect(screen.queryByText('운동 목표')).not.toBeInTheDocument()
    })

    it('should toggle completed items visibility', async () => {
      const user = userEvent.setup()
      const mockSelectAll = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
      })
      
      const mockSelectPending = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ 
            data: [mockItems[0]], 
            error: null 
          })
        })
      })
      
      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelectPending
        })
        .mockReturnValueOnce({
          select: mockSelectAll
        })
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('여행 계획')).toBeInTheDocument()
        expect(screen.queryByText('운동 목표')).not.toBeInTheDocument()
      })
      
      const checkbox = screen.getByLabelText('완료된 항목 표시')
      await user.click(checkbox)
      
      await waitFor(() => {
        expect(mockSelectAll).toHaveBeenCalled()
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
      
      render(<BucketListPage />)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching bucketlist:',
          expect.any(Error)
        )
      })
      
      consoleErrorSpy.mockRestore()
    })
  })
})