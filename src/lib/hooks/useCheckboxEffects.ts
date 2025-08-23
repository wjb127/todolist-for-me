'use client'

import { useEffect, useRef, useState } from 'react'

interface CheckboxEffectsOptions {
  enableVibration?: boolean
  enableSound?: boolean
  enableAnimation?: boolean
}

export function useCheckboxEffects(options: CheckboxEffectsOptions = {}) {
  const {
    enableVibration = true,
    enableSound = true,
    enableAnimation = true
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Create audio element for sound effect
    if (enableSound && typeof window !== 'undefined') {
      const audio = new Audio()
      // Using a data URL for a simple click sound
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUazi5blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
      audioRef.current = audio
    }
  }, [enableSound])

  const triggerCheckboxEffect = (checked: boolean) => {
    // Vibration effect (works on mobile devices)
    if (enableVibration && 'vibrate' in navigator) {
      if (checked) {
        // Short vibration for check
        navigator.vibrate([10, 5, 10])
      } else {
        // Single short vibration for uncheck
        navigator.vibrate(5)
      }
    }

    // Sound effect
    if (enableSound && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.volume = 0.3
      audioRef.current.playbackRate = checked ? 1.2 : 0.8
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (e.g., autoplay policy)
      })
    }

    // Animation trigger
    if (enableAnimation) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 600)
    }
  }

  return {
    triggerCheckboxEffect,
    isAnimating
  }
}