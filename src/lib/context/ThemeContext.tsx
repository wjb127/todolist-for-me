'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DesignTheme = 'classic' | 'neumorphism' | 'glassmorphism' | 'minimalism'

interface ThemeContextType {
  theme: DesignTheme
  setTheme: (theme: DesignTheme) => void
  getBackgroundStyle: () => string
  getCardStyle: () => string
  getButtonStyle: () => string
  getInputStyle: () => string
  getModalStyle: () => string
  getModalBackdropStyle: () => string
  getFilterButtonStyle: (isSelected: boolean) => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<DesignTheme>('classic')

  useEffect(() => {
    const savedTheme = localStorage.getItem('designTheme') as DesignTheme
    if (savedTheme && ['classic', 'neumorphism', 'glassmorphism', 'minimalism'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
  }, [])

  const handleThemeChange = (newTheme: DesignTheme) => {
    setTheme(newTheme)
    localStorage.setItem('designTheme', newTheme)
  }

  const getBackgroundStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'min-h-screen neumorphism-bg p-4 pb-24'
      case 'glassmorphism':
        return 'min-h-screen glassmorphism-bg p-4 pb-24'
      case 'minimalism':
        return 'min-h-screen bg-white p-4 pb-24'
      default:
        return 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-24'
    }
  }

  const getCardStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-card rounded-xl p-4'
      case 'glassmorphism':
        return 'glassmorphism-card rounded-xl p-4'
      case 'minimalism':
        return 'bg-white border border-gray-200 rounded-xl p-4'
      default:
        return 'bg-white rounded-xl shadow-lg p-4'
    }
  }

  const getButtonStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-button rounded-lg p-2'
      case 'glassmorphism':
        return 'glassmorphism-button rounded-lg p-2'
      case 'minimalism':
        return 'bg-white border border-gray-300 rounded-lg p-2 hover:bg-gray-50'
      default:
        return 'bg-white rounded-lg shadow-sm p-2 hover:shadow-md'
    }
  }

  const getInputStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-input w-full px-3 py-2 rounded-lg'
      case 'glassmorphism':
        return 'glassmorphism-input w-full px-3 py-2 rounded-lg'
      case 'minimalism':
        return 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
      default:
        return 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
    }
  }

  const getModalStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-modal rounded-lg max-h-[90vh] overflow-y-auto'
      case 'glassmorphism':
        return 'glassmorphism-modal rounded-lg'
      case 'minimalism':
        return 'bg-white border border-gray-300 rounded-lg max-h-[90vh] overflow-y-auto'
      default:
        return 'bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto'
    }
  }

  const getModalBackdropStyle = () => {
    switch (theme) {
      case 'glassmorphism':
        return 'fixed inset-0 bg-purple-200 bg-opacity-30 z-50 flex items-start justify-center p-4 pt-8'
      default:
        return 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-8'
    }
  }

  const getFilterButtonStyle = (isSelected: boolean) => {
    const baseStyle = 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200'
    
    switch (theme) {
      case 'neumorphism':
        return isSelected 
          ? `${baseStyle} neumorphism-button-active text-blue-700 shadow-inner`
          : `${baseStyle} neumorphism-button text-gray-600 hover:text-gray-800`
      case 'glassmorphism':
        return isSelected
          ? `${baseStyle} glassmorphism-button-active text-purple-800 backdrop-blur-md`
          : `${baseStyle} glassmorphism-button text-gray-600 hover:text-gray-800`
      case 'minimalism':
        return isSelected
          ? `${baseStyle} bg-gray-900 text-white border border-gray-900`
          : `${baseStyle} bg-white text-gray-600 border border-gray-300 hover:bg-gray-50`
      default:
        return isSelected
          ? `${baseStyle} bg-blue-600 text-white shadow-md`
          : `${baseStyle} bg-white text-gray-600 shadow-sm hover:shadow-md hover:bg-gray-50`
    }
  }

  const value: ThemeContextType = {
    theme,
    setTheme: handleThemeChange,
    getBackgroundStyle,
    getCardStyle,
    getButtonStyle,
    getInputStyle,
    getModalStyle,
    getModalBackdropStyle,
    getFilterButtonStyle,
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