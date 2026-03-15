'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// body에 직접 렌더링 + body 스크롤 잠금
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 모달 열릴 때 body 스크롤 잠금
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'

    return () => {
      // 모달 닫힐 때 스크롤 복원
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
