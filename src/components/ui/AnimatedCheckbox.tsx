'use client'

import { Check, Star, Sparkles } from 'lucide-react'
import { useCheckboxEffects } from '@/lib/hooks/useCheckboxEffects'
import { useState } from 'react'

interface AnimatedCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function AnimatedCheckbox({ 
  checked, 
  onChange, 
  size = 'md',
  className = '' 
}: AnimatedCheckboxProps) {
  const { triggerCheckboxEffect, isAnimating } = useCheckboxEffects()
  const [showCelebration, setShowCelebration] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleChange = () => {
    const newChecked = !checked
    onChange(newChecked)
    triggerCheckboxEffect(newChecked)
    
    if (newChecked) {
      // Show celebration effect
      setShowCelebration(true)
      
      // Generate particles for celebration
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 40 - 20,
        y: Math.random() * 40 - 20
      }))
      setParticles(newParticles)
      
      setTimeout(() => {
        setShowCelebration(false)
        setParticles([])
      }, 1000)
    }
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <button
        type="button"
        onClick={handleChange}
        className={`
          relative flex items-center justify-center rounded-md border-2 transition-all duration-200
          ${sizeClasses[size]}
          ${checked 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600 shadow-sm' 
            : 'bg-white border-gray-300 hover:border-gray-400'
          }
          ${isAnimating ? 'scale-110 rotate-12' : 'scale-100 rotate-0'}
          active:scale-95
        `}
      >
        {checked && (
          <Check 
            className={`
              text-white absolute
              ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
              ${isAnimating ? 'animate-bounce' : ''}
            `}
            strokeWidth={3}
          />
        )}
      </button>

      {/* Celebration particles */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute left-1/2 top-1/2 animate-ping"
              style={{
                transform: `translate(${particle.x}px, ${particle.y}px)`,
                animation: 'particle-float 1s ease-out forwards'
              }}
            >
              <Sparkles className="w-3 h-3 text-yellow-400" />
            </div>
          ))}
          <div className="absolute -top-1 -right-1 animate-pulse">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes particle-float {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0);
          }
          50% {
            opacity: 1;
            transform: translate(var(--x), var(--y)) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(calc(var(--x) * 2), calc(var(--y) * 2 - 20px)) scale(0.5);
          }
        }
      `}</style>
    </div>
  )
}