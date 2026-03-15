'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// body에 직접 렌더링하여 stacking context 탈출
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
