import '@testing-library/jest-dom'

// Mock Supabase client with proper chaining
jest.mock('@/lib/supabase/client', () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((callback) => callback({ data: [], error: null }))
  }

  return {
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => mockQuery),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          then: jest.fn(() => Promise.resolve({ error: null }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }
  }
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}))

// Mock DnD Kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => children,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn((array, from, to) => {
    const newArray = [...array]
    const [item] = newArray.splice(from, 1)
    newArray.splice(to, 0, item)
    return newArray
  }),
  SortableContext: ({ children }) => children,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}))