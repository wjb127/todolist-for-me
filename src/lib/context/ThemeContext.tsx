'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DesignTheme = 'classic' | 'neumorphism' | 'glassmorphism' | 'minimalism'
export type ColorMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: DesignTheme
  setTheme: (theme: DesignTheme) => void
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void
  resolvedMode: 'light' | 'dark'
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
  const [colorMode, setColorMode] = useState<ColorMode>('system')
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light')

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('designTheme') as DesignTheme
    if (savedTheme && ['classic', 'neumorphism', 'glassmorphism', 'minimalism'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
    const savedMode = localStorage.getItem('colorMode') as ColorMode
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setColorMode(savedMode)
    }
  }, [])

  // System preference detection + resolved mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateResolved = () => {
      if (colorMode === 'system') {
        setResolvedMode(mediaQuery.matches ? 'dark' : 'light')
      } else {
        setResolvedMode(colorMode)
      }
    }

    updateResolved()
    mediaQuery.addEventListener('change', updateResolved)
    return () => mediaQuery.removeEventListener('change', updateResolved)
  }, [colorMode])

  // Set data attributes on <html>
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)
    html.setAttribute('data-mode', resolvedMode)
  }, [theme, resolvedMode])

  const handleThemeChange = (newTheme: DesignTheme) => {
    setTheme(newTheme)
    localStorage.setItem('designTheme', newTheme)
  }

  const handleColorModeChange = (mode: ColorMode) => {
    setColorMode(mode)
    localStorage.setItem('colorMode', mode)
  }

  const getBackgroundStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'min-h-screen neumorphism-bg px-6 pt-4 pb-24'
      case 'glassmorphism':
        return 'min-h-screen glassmorphism-bg px-6 pt-4 pb-24'
      default:
        return 'min-h-screen bg-surface px-6 pt-4 pb-24'
    }
  }

  const getCardStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-card rounded-xl p-4 overflow-hidden'
      case 'glassmorphism':
        return 'glassmorphism-card rounded-xl p-4 overflow-hidden'
      case 'minimalism':
        return 'bg-surface-card border border-outline rounded-xl p-4 overflow-hidden'
      default:
        return 'bg-surface-card rounded-xl shadow-lg p-4 overflow-hidden'
    }
  }

  const getButtonStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-button rounded-lg p-2'
      case 'glassmorphism':
        return 'glassmorphism-button rounded-lg p-2'
      case 'minimalism':
        return 'bg-surface-card border border-outline-strong rounded-lg p-2 hover:bg-surface-hover'
      default:
        return 'bg-surface-card border border-outline rounded-lg shadow-sm p-2 hover:shadow-md'
    }
  }

  const getInputStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-input w-full max-w-full box-border px-3 py-2 rounded-lg text-ink'
      case 'glassmorphism':
        return 'glassmorphism-input w-full max-w-full box-border px-3 py-2 rounded-lg text-ink'
      default:
        return 'w-full max-w-full box-border px-3 py-2 border border-outline-strong rounded-lg bg-surface-card text-ink focus:outline-none focus:ring-2 focus:ring-accent'
    }
  }

  const getModalStyle = () => {
    switch (theme) {
      case 'neumorphism':
        return 'neumorphism-modal rounded-lg max-h-[90vh] overflow-y-auto'
      case 'glassmorphism':
        return 'glassmorphism-modal rounded-lg'
      case 'minimalism':
        return 'bg-surface-elevated border border-outline-strong rounded-lg max-h-[90vh] overflow-y-auto'
      default:
        return 'bg-surface-elevated rounded-lg shadow-xl max-h-[90vh] overflow-y-auto'
    }
  }

  const getModalBackdropStyle = () => {
    switch (theme) {
      case 'glassmorphism':
        return 'fixed inset-0 bg-purple-900/20 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8'
      case 'neumorphism':
        return 'fixed inset-0 bg-gray-500/20 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8'
      default:
        return 'fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8'
    }
  }

  const getFilterButtonStyle = (isSelected: boolean) => {
    const baseStyle = 'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200'

    switch (theme) {
      case 'neumorphism':
        return isSelected
          ? `${baseStyle} neumorphism-button-active text-accent shadow-inner`
          : `${baseStyle} neumorphism-button text-ink-muted hover:text-ink-secondary`
      case 'glassmorphism':
        return isSelected
          ? `${baseStyle} glassmorphism-button-active text-accent backdrop-blur-md`
          : `${baseStyle} glassmorphism-button text-ink-muted hover:text-ink-secondary`
      case 'minimalism':
        return isSelected
          ? `${baseStyle} bg-accent text-white border border-accent`
          : `${baseStyle} bg-surface-card text-ink-muted border border-outline hover:bg-surface-hover`
      default:
        return isSelected
          ? `${baseStyle} bg-accent text-white shadow-md`
          : `${baseStyle} bg-surface-card text-ink-muted shadow-sm hover:shadow-md hover:bg-surface-hover`
    }
  }

  const value: ThemeContextType = {
    theme,
    setTheme: handleThemeChange,
    colorMode,
    setColorMode: handleColorModeChange,
    resolvedMode,
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
