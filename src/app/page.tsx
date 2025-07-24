'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, FileText, Target, BarChart3 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/todos')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Todo</h1>
          <p className="text-gray-600">나만을 위한 Todo 관리 앱</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">템플릿</h3>
            <p className="text-sm text-gray-600">반복되는 할 일 관리</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <CheckSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Todo</h3>
            <p className="text-sm text-gray-600">날짜별 할 일 목록</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">계획</h3>
            <p className="text-sm text-gray-600">일회성 계획 관리</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">대시보드</h3>
            <p className="text-sm text-gray-600">실행 성과 분석</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-500">Todo 페이지로 자동 이동합니다...</p>
      </div>
    </div>
  )
}