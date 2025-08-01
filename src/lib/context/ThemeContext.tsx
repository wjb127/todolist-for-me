'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DesignTheme = 'classic' | 'neumorphism' | 'glassmorphism' | 'minimalism'

interface ThemeContextType {
  theme: DesignTheme
  setTheme: (theme: DesignTheme) => void
  getCardStyle: () => string
  getCardStyleLarge: () => string
  getButtonStyle: () => string
  getBackgroundStyle: () => string
  getProgressStyle: () => string
  getProgressFillStyle: () => string
  getTabButtonStyle: (isActive: boolean) => string
  getInputStyle: () => string
  getTextColor: () => string
  getSubtextColor: () => string
  getModalStyle: () => string
  getModalHeaderStyle: () => string
  getModalButtonStyle: () => string
  getModalBackdropStyle: () => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<DesignTheme>('classic')

  useEffect(() => {
    // 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('designTheme') as DesignTheme
    if (savedTheme === 'classic' || savedTheme === 'neumorphism' || savedTheme === 'glassmorphism' || savedTheme === 'minimalism') {
      setTheme(savedTheme)
    }
  }, [])

  const handleThemeChange = (newTheme: DesignTheme) => {
    setTheme(newTheme)
    localStorage.setItem('designTheme', newTheme)
  }

  // 테마별 스타일 헬퍼 함수들
  const getCardStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-card rounded-xl p-4'
      case 'glassmorphism':
        return 'glassmorphism-card rounded-xl p-4'
      case 'minimalism':
        return 'minimalism-card rounded-xl p-4'
      default:
        return 'bg-white rounded-xl shadow-lg p-4'
    }
  }

  const getCardStyleLarge = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-card rounded-xl p-6'
      case 'glassmorphism':
        return 'glassmorphism-card rounded-xl p-6'
      case 'minimalism':
        return 'minimalism-card rounded-xl p-6'
      default:
        return 'bg-white rounded-xl shadow-lg p-6'
    }
  }

  const getButtonStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-button rounded-lg p-2'
      case 'glassmorphism':
        return 'glassmorphism-button rounded-lg p-2'
      case 'minimalism':
        return 'minimalism-button rounded-lg p-2'
      default:
        return 'bg-white rounded-lg shadow-sm p-2'
    }
  }

  const getBackgroundStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'min-h-screen neumorphism-bg p-4 pb-24'
      case 'glassmorphism':
        return 'min-h-screen glassmorphism-bg p-4 pb-24'
      case 'minimalism':
        return 'min-h-screen minimalism-bg p-4 pb-24'
      default:
        return 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-24'
    }
  }

  const getProgressStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'w-full neumorphism-progress rounded-full h-3'
      case 'glassmorphism':
        return 'w-full glassmorphism-progress rounded-full h-3'
      case 'minimalism':
        return 'w-full minimalism-progress rounded-full h-3'
      default:
        return 'w-full bg-gray-200 rounded-full h-3'
    }
  }

  const getProgressFillStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-progress-fill h-3 rounded-full transition-all duration-1000'
      case 'glassmorphism':
        return 'glassmorphism-progress-fill h-3 rounded-full transition-all duration-1000'
      case 'minimalism':
        return 'minimalism-progress-fill h-3 rounded-full transition-all duration-1000'
      default:
        return 'bg-amber-400 h-3 rounded-full transition-all duration-1000'
    }
  }

  const getTabButtonStyle = (isActive: boolean) => {
    switch (theme) {
      case 'neumorphism':
        return isActive
          ? 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all neumorphism-card-inset text-blue-600'
          : 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all neumorphism-button text-gray-600 hover:text-blue-600'
      case 'glassmorphism':
        return isActive
          ? 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all glassmorphism-card-inset text-blue-600'
          : 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all glassmorphism-button text-gray-600 hover:text-blue-600'
      case 'minimalism':
        return isActive
          ? 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all minimalism-card-inset text-blue-600 border'
          : 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all minimalism-button text-gray-600 hover:text-blue-600'
      default:
        return isActive
          ? 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all bg-blue-600 text-white shadow-md'
          : 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all text-gray-600 hover:bg-gray-100'
    }
  }

  const getInputStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-input w-full px-3 py-2 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
      case 'glassmorphism':
        return 'glassmorphism-input w-full px-3 py-2 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
      case 'minimalism':
        return 'minimalism-input w-full px-3 py-2 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
      default:
        return 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    }
  }

  const getTextColor = () => {
    switch (theme) {
      case 'neumorphism':
        return 'text-slate-600'
      case 'glassmorphism':
        return 'text-gray-800'
      case 'minimalism':
        return 'text-gray-900'
      default:
        return 'text-gray-900'
    }
  }

  const getSubtextColor = () => {
    switch (theme) {
      case 'neumorphism':
        return 'text-slate-500'
      case 'glassmorphism':
        return 'text-gray-700'
      case 'minimalism':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getModalStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-modal rounded-lg'
      case 'glassmorphism':
        return 'glassmorphism-modal rounded-lg'
      case 'minimalism':
        return 'minimalism-modal rounded-lg'
      default:
        return 'bg-white rounded-lg'
    }
  }

  const getModalHeaderStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-modal-header p-4'
      case 'glassmorphism':
        return 'glassmorphism-modal-header p-4'
      case 'minimalism':
        return 'minimalism-modal-header p-4'
      default:
        return 'p-4 border-b border-gray-200'
    }
  }

  const getModalButtonStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-modal-button p-2 rounded'
      case 'glassmorphism':
        return 'glassmorphism-modal-button p-2 rounded'
      case 'minimalism':
        return 'minimalism-modal-button p-2 rounded'
      default:
        return 'p-2 hover:bg-gray-100 rounded'
    }
  }

  const getModalBackdropStyle = () => {
    switch (theme) {
      case 'glassmorphism':
        return 'fixed inset-0 bg-purple-200 bg-opacity-30 z-50 flex items-center justify-center p-4'
      default:
        return 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
    }
  }

  const value: ThemeContextType = {
    theme,
    setTheme: handleThemeChange,
    getCardStyle,
    getCardStyleLarge,
    getButtonStyle,
    getBackgroundStyle,
    getProgressStyle,
    getProgressFillStyle,
    getTabButtonStyle,
    getInputStyle,
    getTextColor,
    getSubtextColor,
    getModalStyle,
    getModalHeaderStyle,
    getModalButtonStyle,
    getModalBackdropStyle,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}