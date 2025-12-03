# 계획 상하 이동 기능 문제 분석 및 해결 계획

## 1. 현재 구현 원리

### 1.1 관련 함수들

#### `handleMoveUp` / `handleMoveDown` (244-339번 줄)
```typescript
const handleMoveUp = async (planId: string, parentId: string | null) => {
  if (isMoving) return  // 연속 클릭 방지

  // 형제 노드 찾기
  const siblings = filteredPlans.filter(p => p.parent_id === parentId)
  const currentIndex = siblings.findIndex(p => p.id === planId)

  if (currentIndex <= 0) return  // 이미 맨 위

  const targetPlan = siblings[currentIndex]
  const swapPlan = siblings[currentIndex - 1]

  // 낙관적 업데이트 (UI 즉시 반영)
  setPlans(prevPlans => prevPlans.map(p => {
    if (p.id === targetPlan.id) return { ...p, order_index: swapPlan.order_index }
    if (p.id === swapPlan.id) return { ...p, order_index: targetPlan.order_index }
    return p
  }))

  // DB 업데이트
  await supabase.rpc('swap_plan_order', { plan_id_1: targetPlan.id, plan_id_2: swapPlan.id })
  await fetchPlans()
}
```

#### `filteredPlans` (637-648번 줄)
```typescript
const filteredPlans = useMemo(() => {
  return plans.filter(plan => {
    if (filter === 'pending' && plan.completed) return false
    if (filter === 'completed' && !plan.completed) return false
    if (plan.due_date && plan.due_date !== selectedDate) return false
    return true
  })
}, [plans, filter, selectedDate])
```

#### `topLevelPlans` (650-655번 줄)
```typescript
const topLevelPlans = useMemo(() => {
  return filteredPlans
    .filter(plan => !plan.parent_id)
    .sort((a, b) => a.order_index - b.order_index)  // ⭐ 정렬됨!
}, [filteredPlans])
```

#### `getChildPlans` (614-618번 줄)
```typescript
const getChildPlans = (planId: string): Plan[] => {
  return filteredPlans
    .filter(plan => plan.parent_id === planId)
    .sort((a, b) => a.order_index - b.order_index)  // ⭐ 정렬됨!
}
```

#### `isFirst` / `isLast` 전달 (760-779번 줄)
```typescript
{topLevelPlans.map((plan, index) => (
  <PlanItem
    ...
    isFirst={index === 0}
    isLast={index === topLevelPlans.length - 1}
  />
))}
```

---

## 2. 발견된 문제점

### 🔴 문제 1: 형제 노드 탐색 시 정렬 누락

**핵심 문제**: `handleMoveUp/Down`에서 형제 노드를 찾을 때 **정렬하지 않음**

```typescript
// handleMoveUp 내부 - 정렬 없음! ❌
const siblings = filteredPlans.filter(p => p.parent_id === parentId)

// 반면 topLevelPlans - 정렬됨 ✓
const topLevelPlans = filteredPlans.filter(...).sort((a, b) => a.order_index - b.order_index)
```

#### 예시 시나리오:

1. DB에서 가져온 `plans` 배열: `[{id: 'B', order_index: 2}, {id: 'A', order_index: 1}, {id: 'C', order_index: 3}]`
2. `filteredPlans`도 동일한 순서 (필터링만 함, 정렬 안 함)
3. `topLevelPlans`는 정렬됨: `[A, B, C]` (order_index 기준)
4. UI에서는 **[A, B, C]** 순서로 표시

**B를 위로 이동하려고 할 때:**
- UI에서 B는 2번째 → `isFirst = false` (버튼 활성화됨)
- 사용자가 위로 이동 버튼 클릭
- `handleMoveUp` 실행:
  - `siblings = filteredPlans.filter(...)` = `[B, A, C]` (정렬 안 됨!)
  - `currentIndex = 0` (B가 첫 번째)
  - `currentIndex <= 0` → **return!** (아무 동작 안 함)

**결과**: 버튼은 활성화되어 있지만 클릭해도 동작하지 않음!

---

### 🟡 문제 2: isFirst/isLast와 실제 이동 로직 불일치

| 구분 | 사용하는 배열 | 정렬 여부 |
|------|--------------|----------|
| `isFirst/isLast` 계산 | `topLevelPlans` | ✅ 정렬됨 |
| `handleMoveUp/Down` | `filteredPlans.filter()` | ❌ 정렬 안 됨 |

두 로직이 다른 순서의 배열을 사용하므로 불일치 발생.

---

### 🟡 문제 3: 하위 계획 이동 시에도 동일 문제

하위 계획 렌더링:
```typescript
// childrenPlans는 정렬됨
childrenPlans={getChildPlans(plan.id)}  // sort 적용됨 ✓
isFirst={index === 0}  // childrenPlans 기준
isLast={index === childrenPlans.length - 1}
```

하지만 `handleMoveUp`에서:
```typescript
const siblings = filteredPlans.filter(p => p.parent_id === parentId)  // 정렬 안 됨 ❌
```

---

## 3. 해결책

### 해결책 A: handleMoveUp/Down에서 형제 노드 정렬 추가

가장 간단하고 직접적인 해결책.

```typescript
const handleMoveUp = async (planId: string, parentId: string | null) => {
  if (isMoving) return

  // 형제 노드 찾기 + 정렬 추가 ✅
  const siblings = filteredPlans
    .filter(p => p.parent_id === parentId)
    .sort((a, b) => a.order_index - b.order_index)  // 추가!

  const currentIndex = siblings.findIndex(p => p.id === planId)

  if (currentIndex <= 0) return

  // ... 나머지 로직 동일
}
```

**장점:**
- 최소한의 변경
- 기존 로직 구조 유지
- `topLevelPlans`, `getChildPlans`와 동일한 정렬 로직

**단점:**
- 코드 중복 (정렬 로직이 3곳에 존재)

---

### 해결책 B: 공통 유틸리티 함수 생성

정렬된 형제 노드를 반환하는 함수를 만들어 재사용.

```typescript
// 정렬된 형제 노드 반환 (공통 함수)
const getSortedSiblings = (parentId: string | null): Plan[] => {
  return filteredPlans
    .filter(p => p.parent_id === parentId)
    .sort((a, b) => a.order_index - b.order_index)
}

// topLevelPlans 대체
const topLevelPlans = useMemo(() => getSortedSiblings(null), [filteredPlans])

// getChildPlans 대체
const getChildPlans = (planId: string) => getSortedSiblings(planId)

// handleMoveUp/Down에서 사용
const siblings = getSortedSiblings(parentId)
```

**장점:**
- 코드 중복 제거
- 유지보수 용이
- 일관성 보장

**단점:**
- 리팩토링 범위가 더 큼

---

## 4. 구현 계획

### 선택: 해결책 A (최소 변경)

즉각적인 문제 해결을 위해 해결책 A 선택. 향후 리팩토링 시 해결책 B로 개선 가능.

### 수정 내용

#### 파일: `src/app/plans/page.tsx`

#### 수정 1: `handleMoveUp` (248-249번 줄)
```typescript
// Before
const siblings = filteredPlans.filter(p => p.parent_id === parentId)

// After
const siblings = filteredPlans
  .filter(p => p.parent_id === parentId)
  .sort((a, b) => a.order_index - b.order_index)
```

#### 수정 2: `handleMoveDown` (297-298번 줄)
```typescript
// Before
const siblings = filteredPlans.filter(p => p.parent_id === parentId)

// After
const siblings = filteredPlans
  .filter(p => p.parent_id === parentId)
  .sort((a, b) => a.order_index - b.order_index)
```

---

## 5. 테스트 계획

### 테스트 케이스

1. **최상위 계획 이동**
   - [ ] 첫 번째 계획 위로 이동 → 비활성화 상태 확인
   - [ ] 중간 계획 위로/아래로 이동 → 정상 동작
   - [ ] 마지막 계획 아래로 이동 → 비활성화 상태 확인

2. **하위 계획 이동**
   - [ ] 하위 계획 중 첫 번째 위로 이동 → 비활성화
   - [ ] 하위 계획 중간 위로/아래로 이동 → 정상 동작

3. **필터 적용 상태에서 이동**
   - [ ] '진행중' 필터 적용 후 이동 → 정상 동작
   - [ ] 특정 날짜 선택 후 이동 → 정상 동작

4. **연속 이동**
   - [ ] 빠르게 여러 번 클릭 → isMoving으로 중복 방지 확인

---

## 6. 예상 작업 시간

- 코드 수정: 2줄 변경
- 테스트: 로컬에서 동작 확인
- 총 예상 시간: 5분

---

## 7. 향후 개선 사항

1. **해결책 B 적용**: `getSortedSiblings` 공통 함수로 리팩토링
2. **order_index 정규화**: 이동 후 order_index를 연속적인 숫자로 재정렬
3. **드래그 앤 드롭**: 꺽쇠 버튼 외에 드래그로도 이동 가능하게
