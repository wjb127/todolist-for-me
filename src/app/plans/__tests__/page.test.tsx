import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlansPage from '../page'

// Mock 설정
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

describe('Plans Page - Core CRUD & Hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the page', () => {
    render(<PlansPage />)
    expect(screen.getByText('계획')).toBeInTheDocument()
  })

  it('should open and close modal for creating plan', async () => {
    const user = userEvent.setup()
    render(<PlansPage />)
    
    // Create 버튼 클릭
    const addButton = screen.getByRole('button', { name: /새 계획/ })
    await user.click(addButton)
    
    // 모달 열림 확인
    expect(screen.getByPlaceholderText('계획 제목을 입력하세요')).toBeInTheDocument()
    
    // 취소 버튼 클릭
    const cancelButton = screen.getByText('취소')
    await user.click(cancelButton)
    
    // 모달 닫힘 확인
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('계획 제목을 입력하세요')).not.toBeInTheDocument()
    })
  })

  it('should handle plan hierarchy (parent-child relationship)', async () => {
    const user = userEvent.setup()
    render(<PlansPage />)
    
    // 부모 계획 생성을 위한 모달 열기
    const addButton = screen.getByRole('button', { name: /새 계획/ })
    await user.click(addButton)
    
    // 상위 계획 선택 드롭다운 확인
    const parentSelect = screen.getByLabelText('상위 계획')
    expect(parentSelect).toBeInTheDocument()
    
    // 최상위 계획 옵션 확인
    expect(screen.getByText('최상위 계획')).toBeInTheDocument()
  })

  it('should handle priority levels', async () => {
    const user = userEvent.setup()
    render(<PlansPage />)
    
    const addButton = screen.getByRole('button', { name: /새 계획/ })
    await user.click(addButton)
    
    const prioritySelect = screen.getByLabelText('우선순위')
    expect(prioritySelect).toBeInTheDocument()
    
    // 우선순위 옵션들 확인
    const options = ['낮음', '보통', '높음']
    options.forEach(option => {
      expect(screen.getByText(option)).toBeInTheDocument()
    })
  })
})