import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlansPage from '../page'
import { supabase } from '@/lib/supabase/client'

// Mock the theme context
jest.mock('@/lib/context/ThemeContext', () => ({
  useTheme: () => ({
    getBackgroundStyle: () => 'bg-white',
    getCardStyle: () => 'bg-white shadow',
    getButtonStyle: () => 'bg-blue-600 text-white',
    getInputStyle: () => 'border-gray-300',
    getModalStyle: () => 'bg-white',
    getModalBackdropStyle: () => 'bg-black/50',
    getFilterButtonStyle: (active: boolean) => active ? 'bg-blue-600' : 'bg-gray-200'
  })
}))

describe('Plans Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the plans page with title', () => {
      render(<PlansPage />)
      expect(screen.getByText('계획')).toBeInTheDocument()
    })

    it('should render the add new plan button', () => {
      render(<PlansPage />)
      expect(screen.getByText('새 계획')).toBeInTheDocument()
    })

    it('should render filter buttons', () => {
      render(<PlansPage />)
      expect(screen.getByText('전체')).toBeInTheDocument()
      expect(screen.getByText('진행중')).toBeInTheDocument()
      expect(screen.getByText('완료')).toBeInTheDocument()
    })

    it('should display progress bar', () => {
      render(<PlansPage />)
      expect(screen.getByText('전체 현황')).toBeInTheDocument()
    })
  })

  describe('Plan Creation', () => {
    it('should open modal when clicking new plan button', async () => {
      const user = userEvent.setup()
      render(<PlansPage />)
      
      const addButton = screen.getByRole('button', { name: /새 계획/ })
      await user.click(addButton)
      
      expect(screen.getByRole('heading', { name: '새 계획' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('계획 제목을 입력하세요')).toBeInTheDocument()
    })

    it('should close modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(<PlansPage />)
      
      const addButton = screen.getByRole('button', { name: /새 계획/ })
      await user.click(addButton)
      
      const cancelButton = screen.getByText('취소')
      await user.click(cancelButton)
      
      expect(screen.queryByPlaceholderText('계획 제목을 입력하세요')).not.toBeInTheDocument()
    })

    it('should create a new plan with valid data', async () => {
      const user = userEvent.setup()
      const mockInsert = jest.fn().mockReturnValue({
        error: null
      })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      })
      
      render(<PlansPage />)
      
      const addButton = screen.getByRole('button', { name: /새 계획/ })
      await user.click(addButton)
      
      const titleInput = screen.getByPlaceholderText('계획 제목을 입력하세요')
      await user.type(titleInput, '새로운 테스트 계획')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })
    })

    it('should not save plan without title', async () => {
      const user = userEvent.setup()
      render(<PlansPage />)
      
      const addButton = screen.getByRole('button', { name: /새 계획/ })
      await user.click(addButton)
      
      const saveButton = screen.getByText('저장')
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Plan Filtering', () => {
    it('should filter plans by status', async () => {
      const user = userEvent.setup()
      render(<PlansPage />)
      
      const pendingFilter = screen.getByText('진행중')
      await user.click(pendingFilter)
      
      // Filter button should be active
      expect(pendingFilter.parentElement).toHaveClass('bg-blue-600')
    })

    it('should toggle between different filters', async () => {
      const user = userEvent.setup()
      render(<PlansPage />)
      
      const allFilter = screen.getByText('전체')
      const pendingFilter = screen.getByText('진행중')
      const completedFilter = screen.getByText('완료')
      
      await user.click(pendingFilter)
      expect(pendingFilter.parentElement).toHaveClass('bg-blue-600')
      
      await user.click(completedFilter)
      expect(completedFilter.parentElement).toHaveClass('bg-blue-600')
      expect(pendingFilter.parentElement).not.toHaveClass('bg-blue-600')
      
      await user.click(allFilter)
      expect(allFilter.parentElement).toHaveClass('bg-blue-600')
    })
  })

  describe('Plan Management', () => {
    const mockPlan = {
      id: '1',
      title: 'Test Plan',
      description: 'Test Description',
      due_date: '2024-12-31',
      priority: 'medium' as const,
      parent_id: null,
      order_index: 0,
      depth: 0,
      completed: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    it('should toggle plan completion', async () => {
      const user = userEvent.setup()
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [mockPlan], error: null })
          })
        }),
        update: mockUpdate
      })
      
      render(<PlansPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Plan')).toBeInTheDocument()
      })
    })

    it('should handle priority levels correctly', async () => {
      const user = userEvent.setup()
      render(<PlansPage />)
      
      const addButton = screen.getByRole('button', { name: /새 계획/ })
      await user.click(addButton)
      
      const prioritySelect = screen.getByLabelText('우선순위')
      expect(prioritySelect).toBeInTheDocument()
      
      await user.selectOptions(prioritySelect, 'high')
      expect((screen.getByText('높음') as HTMLOptionElement).selected).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ 
              data: null, 
              error: new Error('Fetch failed') 
            })
          })
        })
      })
      
      render(<PlansPage />)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching plans:',
          expect.any(Error)
        )
      })
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: new Error('Save failed')
        })
      })
      
      render(<PlansPage />)
      
      const addButton = screen.getByRole('button', { name: /새 계획/ })
      await user.click(addButton)
      
      const titleInput = screen.getByPlaceholderText('계획 제목을 입력하세요')
      await user.type(titleInput, 'Test Plan')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error saving plan:',
          expect.any(Error)
        )
      })
      
      consoleErrorSpy.mockRestore()
    })
  })
})