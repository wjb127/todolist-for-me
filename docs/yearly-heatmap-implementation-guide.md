# 연간 히트맵 (Yearly Contribution Graph) 구현 가이드

이 문서는 GitHub 스타일의 연간 활동 히트맵 컴포넌트의 구현 원리와 사용 방법을 설명합니다.
다른 프로젝트에서 이 컴포넌트를 재사용하거나 참고할 수 있도록 작성되었습니다.

## 📋 목차
1. [개요](#개요)
2. [핵심 원리](#핵심-원리)
3. [데이터 구조](#데이터-구조)
4. [레이아웃 알고리즘](#레이아웃-알고리즘)
5. [색상 시스템](#색상-시스템)
6. [통계 계산](#통계-계산)
7. [전체 코드](#전체-코드)
8. [사용 예시](#사용-예시)
9. [의존성](#의존성)
10. [커스터마이징 가이드](#커스터마이징-가이드)

---

## 개요

### 무엇인가요?
GitHub의 잔디밭(contribution graph)과 유사한 연간 활동 히트맵 컴포넌트입니다.
일별 활동 데이터를 시각화하여 사용자의 생산성과 활동 패턴을 한눈에 파악할 수 있습니다.

### 주요 기능
- ✅ 연간 365일 데이터 시각화 (12개월 × 각 월의 일수)
- ✅ 활동 강도에 따른 5단계 색상 구분
- ✅ 월별 + 주별 레이아웃 (2주씩 한 줄에 표시)
- ✅ 호버 시 상세 정보 표시
- ✅ 통계 자동 계산 (총 완료, 최장 연속, 현재 연속)
- ✅ 연도 선택 기능
- ✅ 타입별 필터링 (todos, plans, all)
- ✅ 다크모드 대응
- ✅ 모바일 친화적 디자인

### 실제 모습
```
1월  [일월화수목금토] [일월화수목금토]  <- 2주씩 한 줄
     🟩🟩⬜🟩🟩🟩🟩  ⬜🟩🟩🟩🟩🟩🟩
     🟩🟩🟩🟩🟩🟩🟩  🟩🟩🟩🟩🟩🟩🟩

2월  [일월화수목금토] [일월화수목금토]
     ...
```

---

## 핵심 원리

### 1. 데이터 수집 및 집계
```typescript
// 1) 선택된 연도의 시작일과 종료일 계산
const startDate = startOfYear(new Date(selectedYear, 0, 1))
const endDate = endOfYear(new Date(selectedYear, 0, 1))

// 2) 데이터베이스에서 완료된 항목 가져오기 (pagination 사용)
const { data } = await supabase
  .from('todos')
  .select('date, completed')
  .gte('date', format(startDate, 'yyyy-MM-dd'))
  .lte('date', format(endDate, 'yyyy-MM-dd'))
  .eq('completed', true)

// 3) 날짜별로 집계하여 Map에 저장
const contributionsMap = new Map<string, ContributionData>()
allTodos.forEach(todo => {
  const existing = contributionsMap.get(todo.date) || { date: todo.date, count: 0 }
  existing.count += 1
  contributionsMap.set(todo.date, existing)
})
```

### 2. 달력 그리드 생성
```typescript
// 각 월을 순회하며 주 단위로 그룹화
for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
  const monthStart = new Date(selectedYear, monthIndex, 1)
  const monthEnd = new Date(selectedYear, monthIndex + 1, 0)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // 첫 날의 요일에 맞춰 앞쪽 패딩 추가 (일요일=0부터 시작)
  const firstDayOfWeek = getDay(monthStart)
  const paddedDays = Array(firstDayOfWeek).fill(null).concat(monthDays)
  
  // 7일씩 끊어서 주 단위 배열로 변환
  const weeks = []
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7))
  }
}
```

### 3. 2주씩 한 줄에 렌더링
```typescript
// 각 월의 주를 2개씩 묶어서 한 줄에 표시
Array.from({ length: Math.ceil(weeks.length / 2) }).map((_, rowIndex) => {
  const firstWeek = weeks[rowIndex * 2]
  const secondWeek = weeks[rowIndex * 2 + 1]
  
  return (
    <div className="flex gap-3">
      {/* 첫 번째 주 */}
      <div className="flex gap-1">
        {firstWeek?.map(day => renderDayCell(day))}
      </div>
      
      {/* 두 번째 주 */}
      {secondWeek && (
        <div className="flex gap-1">
          {secondWeek.map(day => renderDayCell(day))}
        </div>
      )}
    </div>
  )
})
```

---

## 데이터 구조

### ContributionData 인터페이스
```typescript
interface ContributionData {
  date: string        // 'YYYY-MM-DD' 형식
  count: number       // 해당 날짜의 총 활동 수
  todos?: number      // todo 완료 수 (선택적)
  plans?: number      // plan 완료 수 (선택적)
}
```

### Props 인터페이스
```typescript
interface YearlyContributionGraphProps {
  type?: 'todos' | 'plans' | 'all'  // 표시할 데이터 타입
}
```

### State 관리
```typescript
const [contributions, setContributions] = useState<Map<string, ContributionData>>(new Map())
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
const [hoveredDate, setHoveredDate] = useState<string | null>(null)
const [totalContributions, setTotalContributions] = useState(0)
const [longestStreak, setLongestStreak] = useState(0)
const [currentStreak, setCurrentStreak] = useState(0)
```

---

## 레이아웃 알고리즘

### 월별 데이터 구조
```typescript
interface MonthData {
  month: number                    // 0-11 (1월-12월)
  weeks: (Date | null)[][]        // 주 배열의 배열
}

// 예시: 2025년 1월
// weeks[0] = [null, null, null, 2025-01-01, 2025-01-02, 2025-01-03, 2025-01-04]
//            (일)  (월)  (화)  (수)         (목)         (금)         (토)
// weeks[1] = [2025-01-05, 2025-01-06, ..., 2025-01-11]
```

### 요일 정렬 (일요일 시작)
```typescript
const weekDays = ['일', '월', '화', '수', '목', '금', '토']

// getDay() 함수 결과:
// 일요일 = 0, 월요일 = 1, ..., 토요일 = 6
```

### 패딩 로직
```typescript
// 1월 1일이 수요일(3)이면, 앞에 3칸 비우기
const firstDayOfWeek = getDay(monthStart)  // 3
const paddedDays = []

for (let i = 0; i < firstDayOfWeek; i++) {
  paddedDays.push(null)  // [null, null, null]
}

// 실제 날짜들 추가
monthDays.forEach(day => paddedDays.push(day))
// [null, null, null, 2025-01-01, 2025-01-02, ...]
```

---

## 색상 시스템

### 5단계 Intensity Level
```typescript
const getContributionLevel = (count: number): string => {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-800'  // 활동 없음
  if (count <= 2)  return 'bg-green-200'                  // 매우 약함
  if (count <= 4)  return 'bg-green-400'                  // 약함
  if (count <= 6)  return 'bg-green-500'                  // 보통
  return 'bg-green-600'                                   // 강함
}
```

### 색상 커스터마이징 예시
```typescript
// 파란색 테마로 변경
if (count === 0) return 'bg-gray-100'
if (count <= 2)  return 'bg-blue-200'
if (count <= 4)  return 'bg-blue-400'
if (count <= 6)  return 'bg-blue-500'
return 'bg-blue-600'

// 히트맵 스타일 (빨강-노랑)
if (count === 0) return 'bg-gray-100'
if (count <= 2)  return 'bg-yellow-200'
if (count <= 4)  return 'bg-orange-300'
if (count <= 6)  return 'bg-orange-500'
return 'bg-red-500'
```

### 셀 스타일
```typescript
<div
  className={`
    w-3 h-3                              // 크기: 12px × 12px
    rounded-sm                            // 둥근 모서리
    cursor-pointer                        // 커서 포인터
    transition-all                        // 부드러운 전환
    hover:ring-2                          // 호버 시 테두리
    hover:ring-offset-1 
    hover:ring-gray-400
    ${getContributionLevel(count)}        // 동적 배경색
  `}
  onMouseEnter={() => setHoveredDate(dateStr)}
  onMouseLeave={() => setHoveredDate(null)}
  title={`${format(day, 'yyyy년 M월 d일')}: ${count}개 완료`}
/>
```

---

## 통계 계산

### 1. 총 완료 수 (Total Contributions)
```typescript
let total = 0
contributionsMap.forEach(contribution => {
  total += contribution.count
})
setTotalContributions(total)
```

### 2. 최장 연속 기록 (Longest Streak)
```typescript
const calculateLongestStreak = (contributionsMap: Map<string, ContributionData>) => {
  const sortedDates = Array.from(contributionsMap.keys()).sort()
  
  let maxStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null
  
  sortedDates.forEach(dateStr => {
    const currentDate = new Date(dateStr)
    
    if (lastDate) {
      const diffDays = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (diffDays === 1) {
        currentStreak++  // 연속된 날짜
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1  // 새로운 연속 시작
      }
    } else {
      currentStreak = 1
    }
    
    lastDate = currentDate
  })
  
  maxStreak = Math.max(maxStreak, currentStreak)
  return maxStreak
}
```

### 3. 현재 연속 기록 (Current Streak)
```typescript
const calculateCurrentStreak = () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  
  // 오늘 또는 어제에 활동이 없으면 연속 기록 종료
  if (!contributionsMap.has(today) && !contributionsMap.has(yesterday)) {
    return 0
  }
  
  // ... 위의 최장 연속과 동일한 로직으로 현재 연속 계산
}
```

---

## 전체 코드

### YearlyContributionGraph.tsx
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subDays, startOfYear, endOfYear, eachDayOfInterval, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { supabase } from '@/lib/supabase/client'

interface ContributionData {
  date: string
  count: number
  todos?: number
  plans?: number
}

interface YearlyContributionGraphProps {
  type?: 'todos' | 'plans' | 'all'
}

export default function YearlyContributionGraph({ type = 'all' }: YearlyContributionGraphProps) {
  const [contributions, setContributions] = useState<Map<string, ContributionData>>(new Map())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [totalContributions, setTotalContributions] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // 데이터 가져오기 (Pagination 사용)
  const fetchYearlyData = useCallback(async () => {
    const startDate = startOfYear(new Date(selectedYear, 0, 1))
    const endDate = endOfYear(new Date(selectedYear, 0, 1))
    
    const contributionsMap = new Map<string, ContributionData>()
    
    if (type === 'todos' || type === 'all') {
      let allTodos: Array<{ date: string; completed: boolean }> = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: todosData } = await supabase
          .from('todos')
          .select('date, completed')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'))
          .eq('completed', true)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (todosData && todosData.length > 0) {
          allTodos = [...allTodos, ...todosData]
          hasMore = todosData.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      allTodos.forEach(todo => {
        const existing = contributionsMap.get(todo.date) || { 
          date: todo.date, count: 0, todos: 0, plans: 0 
        }
        existing.todos = (existing.todos || 0) + 1
        existing.count = existing.todos + (existing.plans || 0)
        contributionsMap.set(todo.date, existing)
      })
    }

    // plans도 동일한 방식으로 처리...

    setContributions(contributionsMap)
    calculateStatistics(contributionsMap)
  }, [selectedYear, type])

  useEffect(() => {
    fetchYearlyData()
  }, [fetchYearlyData])

  // 통계 계산
  const calculateStatistics = (contributionsMap: Map<string, ContributionData>) => {
    let total = 0
    let maxStreak = 0
    let currentStreak = 0
    let lastDate: Date | null = null
    
    const sortedDates = Array.from(contributionsMap.keys()).sort()
    
    sortedDates.forEach(dateStr => {
      const contribution = contributionsMap.get(dateStr)!
      total += contribution.count
      
      const currentDate = new Date(dateStr)
      
      if (lastDate) {
        const diffDays = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diffDays === 1) {
          currentStreak++
        } else {
          maxStreak = Math.max(maxStreak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      
      lastDate = currentDate
    })
    
    maxStreak = Math.max(maxStreak, currentStreak)
    
    // 현재 연속 확인
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    
    if (!contributionsMap.has(today) && !contributionsMap.has(yesterday)) {
      currentStreak = 0
    }
    
    setTotalContributions(total)
    setLongestStreak(maxStreak)
    setCurrentStreak(currentStreak)
  }

  // 색상 계산
  const getContributionLevel = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count <= 2) return 'bg-green-200'
    if (count <= 4) return 'bg-green-400'
    if (count <= 6) return 'bg-green-500'
    return 'bg-green-600'
  }

  // 연간 그리드 렌더링
  const renderYearGrid = () => {
    const monthsData: { month: number; weeks: (Date | null)[][] }[] = []
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthStart = new Date(selectedYear, monthIndex, 1)
      const monthEnd = new Date(selectedYear, monthIndex + 1, 0)
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      
      // 첫 날의 요일에 맞춰 패딩 추가
      const firstDayOfWeek = getDay(monthStart)
      const paddedDays: (Date | null)[] = []
      
      for (let i = 0; i < firstDayOfWeek; i++) {
        paddedDays.push(null)
      }
      
      monthDays.forEach(day => paddedDays.push(day))
      
      // 7일씩 끊어서 주 배열로
      const weeks: (Date | null)[][] = []
      for (let i = 0; i < paddedDays.length; i += 7) {
        weeks.push(paddedDays.slice(i, i + 7))
      }
      
      monthsData.push({ month: monthIndex, weeks })
    }
    
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    
    return (
      <div className="pb-4">
        <div className="w-full">
          {/* 요일 헤더 */}
          <div className="flex sticky top-0 bg-white z-10 pb-2 mb-2 border-b">
            <div className="w-12 flex-shrink-0"></div>
            <div className="flex gap-3">
              {/* 첫 번째 주 */}
              <div className="flex gap-1">
                {weekDays.map(day => (
                  <div key={`week1-${day}`} className="w-3 text-[10px] text-gray-600 text-center">
                    {day}
                  </div>
                ))}
              </div>
              {/* 두 번째 주 */}
              <div className="flex gap-1">
                {weekDays.map(day => (
                  <div key={`week2-${day}`} className="w-3 text-[10px] text-gray-600 text-center">
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 월별 그리드 */}
          <div className="space-y-3">
            {monthsData.map(({ month, weeks }) => (
              <div key={month} className="flex">
                {/* 월 라벨 */}
                <div className="w-12 flex-shrink-0 text-xs text-gray-600 pr-2">
                  {months[month]}
                </div>
                
                {/* 2주씩 한 줄에 */}
                <div className="flex-1">
                  <div className="space-y-1">
                    {Array.from({ length: Math.ceil(weeks.length / 2) }).map((_, rowIndex) => {
                      const firstWeek = weeks[rowIndex * 2]
                      const secondWeek = weeks[rowIndex * 2 + 1]
                      
                      return (
                        <div key={rowIndex} className="flex gap-3">
                          {/* 첫 번째 주 */}
                          <div className="flex gap-1">
                            {firstWeek?.map((day, dayIndex) => {
                              if (!day) {
                                return <div key={`empty-${month}-${rowIndex * 2}-${dayIndex}`} className="w-3 h-3" />
                              }
                              
                              const dateStr = format(day, 'yyyy-MM-dd')
                              const contribution = contributions.get(dateStr)
                              const count = contribution?.count || 0
                              
                              return (
                                <div
                                  key={dateStr}
                                  className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 ${getContributionLevel(count)}`}
                                  onMouseEnter={() => setHoveredDate(dateStr)}
                                  onMouseLeave={() => setHoveredDate(null)}
                                  title={`${format(day, 'yyyy년 M월 d일')}: ${count}개 완료`}
                                />
                              )
                            })}
                          </div>
                          
                          {/* 두 번째 주 */}
                          {secondWeek && (
                            <div className="flex gap-1">
                              {secondWeek.map((day, dayIndex) => {
                                if (!day) {
                                  return <div key={`empty-${month}-${rowIndex * 2 + 1}-${dayIndex}`} className="w-3 h-3" />
                                }
                                
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const contribution = contributions.get(dateStr)
                                const count = contribution?.count || 0
                                
                                return (
                                  <div
                                    key={dateStr}
                                    className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 ${getContributionLevel(count)}`}
                                    onMouseEnter={() => setHoveredDate(dateStr)}
                                    onMouseLeave={() => setHoveredDate(null)}
                                    title={`${format(day, 'yyyy년 M월 d일')}: ${count}개 완료`}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 범례 및 통계 */}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>적음</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
                <div className="w-3 h-3 rounded-sm bg-green-200"></div>
                <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <div className="w-3 h-3 rounded-sm bg-green-600"></div>
              </div>
              <span>많음</span>
            </div>
            
            {/* 통계 */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <div>
                <span className="font-medium">{totalContributions}</span> 총 완료
              </div>
              <div>
                <span className="font-medium">{longestStreak}</span>일 최장 연속
              </div>
              {currentStreak > 0 && (
                <div className="text-green-600">
                  <span className="font-medium">{currentStreak}</span>일 현재 연속
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900">
            {type === 'todos' ? '📝 Todo 달성 기록' : 
             type === 'plans' ? '🎯 계획 달성 기록' : 
             '🌱 연간 활동 기록'}
          </h2>
          <p className="text-sm text-gray-600">총 {totalContributions}개 달성</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-sm border rounded px-2 py-1"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}년</option>
          ))}
        </select>
      </div>
      
      {renderYearGrid()}
      
      {/* 호버 툴팁 */}
      {hoveredDate && contributions.get(hoveredDate) && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="text-sm font-medium">
            {format(new Date(hoveredDate), 'yyyy년 M월 d일 (E)', { locale: ko })}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {type === 'todos' && `${contributions.get(hoveredDate)!.todos || 0}개 할 일 완료`}
            {type === 'plans' && `${contributions.get(hoveredDate)!.plans || 0}개 계획 완료`}
            {type === 'all' && (
              <>
                {contributions.get(hoveredDate)!.todos || 0}개 할 일 완료
                {contributions.get(hoveredDate)!.plans ? 
                  `, ${contributions.get(hoveredDate)!.plans}개 계획 완료` : ''}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 사용 예시

### 기본 사용
```tsx
import YearlyContributionGraph from '@/components/dashboard/YearlyContributionGraph'

export default function DashboardPage() {
  return (
    <div>
      <h1>대시보드</h1>
      
      {/* Todo 활동 히트맵 */}
      <YearlyContributionGraph type="todos" />
      
      {/* 계획 활동 히트맵 */}
      <YearlyContributionGraph type="plans" />
      
      {/* 전체 활동 히트맵 */}
      <YearlyContributionGraph type="all" />
    </div>
  )
}
```

### 커스텀 데이터 소스
```typescript
// API에서 데이터 가져오기
const { data } = await fetch('/api/contributions?year=2025')

// Map으로 변환
const contributionsMap = new Map()
data.forEach(item => {
  contributionsMap.set(item.date, {
    date: item.date,
    count: item.count
  })
})
```

---

## 의존성

### 필수 패키지
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "date-fns": "^4.1.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

### 설치 명령
```bash
npm install date-fns
npm install @supabase/supabase-js
```

### date-fns 함수 사용
```typescript
import { 
  format,           // 날짜 포맷팅
  subDays,          // N일 전
  startOfYear,      // 연도 시작일
  endOfYear,        // 연도 종료일
  eachDayOfInterval,// 기간 내 모든 날짜
  getDay            // 요일 (0-6)
} from 'date-fns'

import { ko } from 'date-fns/locale'  // 한국어 로케일
```

---

## 커스터마이징 가이드

### 1. 셀 크기 변경
```typescript
// 작게 (10px × 10px)
className="w-2.5 h-2.5"

// 기본 (12px × 12px)
className="w-3 h-3"

// 크게 (16px × 16px)
className="w-4 h-4"
```

### 2. 색상 테마 변경
```typescript
// 파란색 테마
const getContributionLevel = (count: number): string => {
  if (count === 0) return 'bg-gray-100'
  if (count <= 2) return 'bg-blue-200'
  if (count <= 4) return 'bg-blue-400'
  if (count <= 6) return 'bg-blue-500'
  return 'bg-blue-600'
}

// 빨강-노랑 히트맵
const getContributionLevel = (count: number): string => {
  if (count === 0) return 'bg-gray-100'
  if (count <= 2) return 'bg-yellow-300'
  if (count <= 4) return 'bg-orange-400'
  if (count <= 6) return 'bg-red-400'
  return 'bg-red-600'
}
```

### 3. 레이아웃 변경

#### 1주씩 한 줄에 표시 (세로로 길게)
```typescript
// renderYearGrid() 내부 수정
{weeks.map((week, weekIndex) => (
  <div key={weekIndex} className="flex gap-1">
    {week.map((day, dayIndex) => (
      // 각 날짜 셀 렌더링
    ))}
  </div>
))}
```

#### 전체 연도를 한 줄로 (GitHub 스타일)
```typescript
// 전체 365일을 주 단위로 세로로 배치
const allDays = eachDayOfInterval({ 
  start: startOfYear(new Date(selectedYear, 0, 1)), 
  end: endOfYear(new Date(selectedYear, 0, 1)) 
})

// 7개씩 묶어서 세로 컬럼으로
const columns: Date[][] = Array.from({ length: 53 }, () => [])
allDays.forEach((day, index) => {
  const columnIndex = Math.floor(index / 7)
  columns[columnIndex].push(day)
})

return (
  <div className="flex gap-1">
    {columns.map((column, colIndex) => (
      <div key={colIndex} className="flex flex-col gap-1">
        {column.map(day => renderDayCell(day))}
      </div>
    ))}
  </div>
)
```

### 4. 애니메이션 추가
```typescript
// 셀에 페이드인 애니메이션
<div
  className={`
    w-3 h-3 rounded-sm
    ${getContributionLevel(count)}
    animate-fade-in
  `}
  style={{
    animationDelay: `${monthIndex * 50 + rowIndex * 20}ms`
  }}
/>

// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  }
}
```

### 5. 통계 커스터마이징
```typescript
// 평균 계산 추가
const avgDaily = totalContributions / 365

// 최고 기록일
const maxDay = Array.from(contributions.entries())
  .reduce((max, [date, data]) => 
    data.count > max.count ? data : max
  , { count: 0, date: '' })

// 주간 평균
const weeklyAvg = totalContributions / 52
```

### 6. 모바일 반응형
```typescript
<div className={`
  w-3 h-3          // 데스크탑: 12px
  sm:w-2 sm:h-2    // 모바일: 8px
`} />

// 또는 1주씩만 표시
<div className="hidden sm:flex gap-3">
  {/* 두 번째 주는 모바일에서 숨김 */}
  {secondWeek && <div>...</div>}
</div>
```

---

## 성능 최적화

### 1. Pagination으로 대량 데이터 처리
```typescript
// 1000개씩 끊어서 가져오기
const pageSize = 1000
let page = 0
let hasMore = true

while (hasMore) {
  const { data } = await supabase
    .from('todos')
    .select('date, completed')
    .range(page * pageSize, (page + 1) * pageSize - 1)
  
  if (data && data.length > 0) {
    allTodos = [...allTodos, ...data]
    hasMore = data.length === pageSize
    page++
  } else {
    hasMore = false
  }
}
```

### 2. 메모이제이션
```typescript
import { useMemo } from 'react'

const monthsData = useMemo(() => {
  // 월별 데이터 계산
  return calculateMonthsData(selectedYear)
}, [selectedYear])
```

### 3. Virtual Scrolling (옵션)
```typescript
// 대량 데이터의 경우 react-window 사용
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={12}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      {renderMonth(index)}
    </div>
  )}
</FixedSizeList>
```

---

## 디버깅 팁

### 1. 날짜 데이터 확인
```typescript
console.log('Contributions Map:', 
  Array.from(contributions.entries())
)
```

### 2. 패딩 확인
```typescript
console.log('First day of month:', getDay(monthStart))
console.log('Padded days:', paddedDays)
```

### 3. 주 배열 확인
```typescript
console.log('Weeks:', weeks.map(week => 
  week.map(day => day ? format(day, 'MM-dd') : 'null')
))
```

---

## FAQ

### Q1. 다른 주 시작일로 변경하려면?
```typescript
// 월요일 시작
const firstDayOfWeek = (getDay(monthStart) + 6) % 7

// 요일 배열도 수정
const weekDays = ['월', '화', '수', '목', '금', '토', '일']
```

### Q2. 다크모드 지원은?
```typescript
// Tailwind dark: 클래스 사용
if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
if (count <= 2) return 'bg-green-200 dark:bg-green-900'
// ...
```

### Q3. 데이터가 많아서 느려요
- Pagination 사용 (이미 적용됨)
- 불필요한 re-render 방지 (useMemo, useCallback)
- Virtual scrolling 고려

### Q4. 여러 데이터 소스를 합치려면?
```typescript
// 여러 테이블 데이터 병합
const mergedData = new Map()

todosData.forEach(todo => {
  const existing = mergedData.get(todo.date) || { count: 0 }
  existing.count += 1
  mergedData.set(todo.date, existing)
})

plansData.forEach(plan => {
  const existing = mergedData.get(plan.date) || { count: 0 }
  existing.count += 1
  mergedData.set(plan.date, existing)
})
```

---

## 라이선스 및 크레딧

이 구현은 GitHub의 Contribution Graph에서 영감을 받았습니다.
자유롭게 사용, 수정, 배포할 수 있습니다.

### 참고 자료
- [GitHub Contribution Graph](https://github.com/)
- [date-fns Documentation](https://date-fns.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 버전 히스토리

### v1.0.0 (2025-01-15)
- ✅ 초기 구현
- ✅ 월별 2주씩 레이아웃
- ✅ 5단계 색상 시스템
- ✅ 통계 계산 (총/최장/현재 연속)
- ✅ 호버 툴팁
- ✅ 연도 선택
- ✅ 타입별 필터링

---

**문서 작성일**: 2025-11-15  
**작성자**: Claude AI  
**프로젝트**: Todolist PWA Application
