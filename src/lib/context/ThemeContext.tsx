'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DesignTheme = 'classic' | 'neumorphism'

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
    if (savedTheme === 'classic' || savedTheme === 'neumorphism') {
      setTheme(savedTheme)
    }
  }, [])

  const handleThemeChange = (newTheme: DesignTheme) => {
    setTheme(newTheme)
    localStorage.setItem('designTheme', newTheme)
  }

  // 테마별 스타일 헬퍼 함수들
  const getCardStyle = () => {
    return theme === 'neumorphism' 
      ? 'neumorphism-card rounded-xl p-4' 
      : 'bg-white rounded-xl shadow-lg p-4'
  }

  const getCardStyleLarge = () => {
    return theme === 'neumorphism' 
      ? 'neumorphism-card rounded-xl p-6' 
      : 'bg-white rounded-xl shadow-lg p-6'
  }

  const getButtonStyle = () => {
    return theme === 'neumorphism' 
      ? 'neumorphism-button rounded-lg p-2' 
      : 'bg-white rounded-lg shadow-sm p-2'
  }

  const getBackgroundStyle = () => {
    return theme === 'neumorphism' 
      ? 'min-h-screen neumorphism-bg p-4 pb-24' 
      : 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-24'
  }

  const getProgressStyle = () => {
    return theme === 'neumorphism' 
      ? 'w-full neumorphism-progress rounded-full h-3' 
      : 'w-full bg-gray-200 rounded-full h-3'
  }

  const getProgressFillStyle = () => {
    return theme === 'neumorphism' 
      ? 'neumorphism-progress-fill h-3 rounded-full transition-all duration-1000' 
      : 'bg-amber-400 h-3 rounded-full transition-all duration-1000'
  }

  const getTabButtonStyle = (isActive: boolean) => {
    if (theme === 'neumorphism') {
      return isActive
        ? 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all neumorphism-card-inset text-blue-600'
        : 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all neumorphism-button text-gray-600 hover:text-blue-600'
    } else {
      return isActive
        ? 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all bg-blue-600 text-white shadow-md'
        : 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all text-gray-600 hover:bg-gray-100'
    }
  }

  const getInputStyle = () => {
    return theme === 'neumorphism'
      ? 'neumorphism-input w-full px-3 py-2 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
      : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  }

  const getTextColor = () => {
    return theme === 'neumorphism' ? 'text-gray-800' : 'text-gray-900'
  }

  const getSubtextColor = () => {
    return theme === 'neumorphism' ? 'text-gray-600' : 'text-gray-600'
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