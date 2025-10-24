# 계획 탭 상하 이동 기능 문제 분석 및 해결방안

## 📋 문제 현황

계획 탭에서 상하 이동 버튼(위로/아래로)이 제대로 작동하지 않는 문제가 발생하고 있습니다.

## 🔍 문제 원인 분석

### 1. **필터링된 데이터와 전체 데이터 불일치**
- **현재 상황**: `handleMoveUp`/`handleMoveDown` 함수는 전체 plans 배열을 사용하여 형제 노드를 찾지만, 화면에는 날짜 필터가 적용된 `filteredPlans`가 표시됨
- **문제점**: 
  - 특정 날짜로 필터링된 상태에서 상하 이동 시, 필터링되지 않은 다른 날짜의 계획들과도 order_index를 교환하게 됨
  - `isFirst`와 `isLast` 플래그가 `topLevelPlans` 기준으로 전달되지만, 실제 이동 로직은 전체 plans를 대상으로 동작함
  
```typescript
// 현재 코드 (222-259줄)
const handleMoveUp = async (planId: string, parentId: string | null) => {
  const siblings = plans.filter(p => p.parent_id === parentId) // 전체 plans 사용
  // ...
}
```

### 2. **낙관적 업데이트와 DB 동기화 문제**
- **현재 상황**: UI는 즉시 업데이트되지만 DB 업데이트는 두 개의 독립적인 쿼리로 실행됨
- **문제점**:
  - 두 개의 UPDATE 쿼리 중 하나가 실패해도 다른 하나는 성공할 수 있음 (부분 실패)
  - 에러 발생 시 `fetchPlans()`로 롤백하지만, 낙관적 업데이트 상태와 실제 DB 상태 간 불일치 가능
  - 트랜잭션 처리 없음

### 3. **order_index 정합성 문제**
- **현재 상황**: 두 계획의 order_index를 단순히 교환하는 방식
- **문제점**:
  - 여러 사용자가 동시에 순서를 변경할 경우 경쟁 조건(race condition) 발생 가능
  - order_index가 중복되거나 건너뛰는 경우에 대한 복구 메커니즘 부재

### 4. **재정렬 후 UI 업데이트 누락**
- **현재 상황**: DB 업데이트 후 성공 시 별도 처리 없음
- **문제점**:
  - 낙관적 업데이트만으로는 다른 동시 변경사항을 반영하지 못함
  - 정렬 후 화면 새로고침이 없어 데이터 일관성 보장 어려움

---

## 💡 해결방안

### 방안 1: 필터링 로직 분리 및 개선 (⭐ **추천**)

**개요**: 현재 필터와 실제 데이터 소스를 분리하고, 이동 로직을 필터링된 데이터 기준으로 재작성

**장점**:
- ✅ 가장 직관적이고 이해하기 쉬운 해결책
- ✅ 기존 코드 구조를 크게 변경하지 않음
- ✅ 날짜 필터 적용 시에도 올바른 동작 보장
- ✅ 빠른 구현 가능 (1-2시간)

**단점**:
- ⚠️ 필터링된 계획만 이동 가능 (다른 날짜로의 이동은 불가)
- ⚠️ order_index 정합성 문제는 여전히 존재

**구현 방법**:
1. `handleMoveUp`/`handleMoveDown`에서 전체 `plans` 대신 `filteredPlans`를 기준으로 형제 노드 찾기
2. 이동 후 `fetchPlans()`를 호출하여 DB와 동기화
3. isFirst/isLast 계산 로직 수정

```typescript
const handleMoveUp = async (planId: string, parentId: string | null) => {
  // filteredPlans에서 형제 노드 찾기
  const siblings = filteredPlans.filter(p => p.parent_id === parentId)
  const currentIndex = siblings.findIndex(p => p.id === planId)
  
  if (currentIndex <= 0) return
  
  const targetPlan = siblings[currentIndex]
  const swapPlan = siblings[currentIndex - 1]
  
  // 낙관적 업데이트
  setPlans(prevPlans => 
    prevPlans.map(p => {
      if (p.id === targetPlan.id) return { ...p, order_index: swapPlan.order_index }
      if (p.id === swapPlan.id) return { ...p, order_index: targetPlan.order_index }
      return p
    })
  )
  
  // 트랜잭션 방식으로 DB 업데이트
  try {
    const { error } = await supabase.rpc('swap_plan_order', {
      plan_id_1: targetPlan.id,
      plan_id_2: swapPlan.id
    })
    
    if (error) throw error
    
    // 성공 후 데이터 재로드
    await fetchPlans()
  } catch (error) {
    console.error('Error moving plan:', error)
    await fetchPlans() // 실패 시에도 재로드
  }
}
```

**필요한 DB 함수**:
```sql
CREATE OR REPLACE FUNCTION swap_plan_order(plan_id_1 UUID, plan_id_2 UUID)
RETURNS void AS $$
DECLARE
  order_1 INTEGER;
  order_2 INTEGER;
BEGIN
  -- 두 계획의 order_index 가져오기
  SELECT order_index INTO order_1 FROM plans WHERE id = plan_id_1;
  SELECT order_index INTO order_2 FROM plans WHERE id = plan_id_2;
  
  -- order_index 교환
  UPDATE plans SET order_index = order_2 WHERE id = plan_id_1;
  UPDATE plans SET order_index = order_1 WHERE id = plan_id_2;
END;
$$ LANGUAGE plpgsql;
```

---

### 방안 2: DB 함수 활용한 서버 사이드 정렬

**개요**: 이동 로직을 완전히 DB 함수로 이관하고, 클라이언트는 단순히 호출만 하는 방식

**장점**:
- ✅ order_index 정합성을 DB 레벨에서 보장
- ✅ 트랜잭션으로 원자성 보장
- ✅ 동시성 문제 완벽 해결
- ✅ 클라이언트 코드 단순화

**단점**:
- ⚠️ DB 함수 작성 및 테스트 필요 (복잡도 높음)
- ⚠️ 낙관적 업데이트 불가능 (약간의 지연 느낌)
- ⚠️ 구현 시간 증가 (3-4시간)
- ⚠️ 디버깅 어려움

**구현 방법**:
1. `move_plan_up`/`move_plan_down` DB 함수 생성
2. 함수 내에서 형제 노드 찾기, order_index 조정, 업데이트 모두 처리
3. 클라이언트는 함수 호출 후 `fetchPlans()` 실행

```typescript
const handleMoveUp = async (planId: string, parentId: string | null) => {
  try {
    const { error } = await supabase.rpc('move_plan_up', {
      plan_id: planId,
      parent_id: parentId
    })
    
    if (error) throw error
    await fetchPlans()
  } catch (error) {
    console.error('Error moving plan up:', error)
  }
}
```

**필요한 DB 함수**:
```sql
CREATE OR REPLACE FUNCTION move_plan_up(plan_id UUID, parent_id UUID)
RETURNS void AS $$
DECLARE
  current_order INTEGER;
  target_order INTEGER;
  swap_plan_id UUID;
BEGIN
  -- 현재 계획의 order_index 가져오기
  SELECT order_index INTO current_order 
  FROM plans WHERE id = plan_id;
  
  -- 바로 위 형제 계획 찾기
  SELECT id, order_index INTO swap_plan_id, target_order
  FROM plans 
  WHERE parent_id IS NOT DISTINCT FROM parent_id
    AND order_index < current_order
  ORDER BY order_index DESC
  LIMIT 1;
  
  -- 찾지 못하면 종료
  IF swap_plan_id IS NULL THEN
    RETURN;
  END IF;
  
  -- order_index 교환
  UPDATE plans SET order_index = target_order WHERE id = plan_id;
  UPDATE plans SET order_index = current_order WHERE id = swap_plan_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 방안 3: order_index 재계산 및 정규화

**개요**: 이동 시마다 해당 계층의 모든 order_index를 0부터 재계산하여 정합성 보장

**장점**:
- ✅ order_index 중복/건너뛰기 문제 완전 해결
- ✅ 향후 순서 관련 버그 예방
- ✅ 디버깅 용이 (항상 0부터 연속된 숫자)
- ✅ 다중 이동 작업에도 안정적

**단점**:
- ⚠️ 형제 노드가 많을 경우 성능 저하 (n번의 UPDATE)
- ⚠️ DB 부하 증가
- ⚠️ 복잡한 로직으로 인한 버그 가능성
- ⚠️ 구현 및 테스트 시간 증가 (4-5시간)

**구현 방법**:
1. 이동 후 해당 부모의 모든 자식 order_index를 0부터 재정렬
2. Bulk Update 활용하여 성능 최적화

```typescript
const handleMoveUp = async (planId: string, parentId: string | null) => {
  const siblings = filteredPlans.filter(p => p.parent_id === parentId)
  const currentIndex = siblings.findIndex(p => p.id === planId)
  
  if (currentIndex <= 0) return
  
  // 배열에서 위치 변경
  const reorderedSiblings = [...siblings]
  const [movedPlan] = reorderedSiblings.splice(currentIndex, 1)
  reorderedSiblings.splice(currentIndex - 1, 0, movedPlan)
  
  // order_index 재할당 (0부터 시작)
  const updates = reorderedSiblings.map((plan, index) => ({
    id: plan.id,
    order_index: index
  }))
  
  // 낙관적 업데이트
  setPlans(prevPlans =>
    prevPlans.map(p => {
      const update = updates.find(u => u.id === p.id)
      return update ? { ...p, order_index: update.order_index } : p
    })
  )
  
  // Bulk Update
  try {
    for (const update of updates) {
      await supabase
        .from('plans')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
    }
    await fetchPlans()
  } catch (error) {
    console.error('Error reordering plans:', error)
    await fetchPlans()
  }
}
```

---

### 방안 4: Drag & Drop 라이브러리 도입

**개요**: `dnd-kit` 또는 `react-beautiful-dnd` 같은 검증된 라이브러리 사용

**장점**:
- ✅ UX 대폭 개선 (드래그 앤 드롭 인터페이스)
- ✅ 복잡한 순서 관리 로직을 라이브러리가 처리
- ✅ 검증된 솔루션으로 안정성 보장
- ✅ 계층 간 이동도 쉽게 구현 가능

**단점**:
- ⚠️ 의존성 추가 (번들 크기 증가)
- ⚠️ 학습 곡선 존재
- ⚠️ 기존 UI/UX 전면 개편 필요
- ⚠️ 구현 시간 증가 (6-8시간)
- ⚠️ 모바일 터치 지원 검증 필요

**구현 방법**:
1. `dnd-kit` 설치
2. 계획 목록을 `SortableContext`로 감싸기
3. 각 계획 항목을 `useSortable` 훅으로 드래그 가능하게 만들기
4. `onDragEnd` 이벤트에서 order_index 업데이트

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'

const handleDragEnd = async (event) => {
  const { active, over } = event
  if (active.id !== over.id) {
    const oldIndex = plans.findIndex(p => p.id === active.id)
    const newIndex = plans.findIndex(p => p.id === over.id)
    
    // order_index 재계산 및 업데이트
    // ...
  }
}
```

---

## 🎯 추천 방안: **방안 1 - 필터링 로직 분리 및 개선**

### 추천 이유:
1. **빠른 해결**: 가장 짧은 시간에 문제 해결 가능
2. **안정성**: 기존 코드 구조를 크게 변경하지 않아 사이드 이펙트 최소화
3. **실용성**: 현재 필요한 기능을 정확히 충족
4. **점진적 개선**: 추후 방안 2나 3으로 확장 가능

### 구현 우선순위:
1. ⭐⭐⭐ **1단계**: 필터링된 데이터 기준으로 이동 로직 수정
2. ⭐⭐ **2단계**: DB 트랜잭션 함수 추가 (swap_plan_order)
3. ⭐ **3단계**: 에러 처리 및 사용자 피드백 개선

### 예상 작업 시간:
- 1단계: 30분
- 2단계: 30분
- 3단계: 30분
- 테스트: 30분
- **총 2시간**

---

## 📝 구현 시 고려사항

### 공통 체크리스트:
- [ ] 날짜 필터 적용 상태에서 테스트
- [ ] 하위 계획(자식 노드) 이동 테스트
- [ ] 첫 번째/마지막 항목 이동 시도 테스트
- [ ] 빠른 연속 클릭 테스트 (디바운싱 필요성 확인)
- [ ] 모바일 환경 테스트
- [ ] 오프라인 → 온라인 전환 시나리오 테스트

### 성능 고려사항:
- 형제 노드가 50개 이상일 경우 대응 방안
- 네트워크 지연 시 사용자 피드백
- 낙관적 업데이트 실패 시 UI 롤백

---

## 🔗 관련 파일
- `/src/app/plans/page.tsx` (라인 222-298: handleMoveUp/Down)
- `/migration-add-plan-hierarchy.sql` (DB 스키마)

