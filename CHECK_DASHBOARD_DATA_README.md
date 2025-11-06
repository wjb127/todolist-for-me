# 대시보드 데이터 검증 가이드

## 🔍 문제 상황
대시보드에서 Todo 1000개, 계획 515개로 제한되어 보이는 문제 발생

## 📊 데이터 확인 방법

### 1. Supabase SQL Editor 접속
1. Supabase 대시보드 접속
2. 좌측 메뉴에서 "SQL Editor" 클릭

### 2. 쿼리 실행
`check-dashboard-data.sql` 파일의 쿼리들을 순서대로 실행하세요.

## 🎯 주요 확인 사항

### 기본 통계 확인 (쿼리 1-2)
```sql
-- 완료된 Todos 총 개수
SELECT COUNT(*) FROM todos WHERE completed = true;

-- 완료된 Plans 총 개수  
SELECT COUNT(*) FROM plans WHERE completed = true;
```

**예상 결과:**
- 실제 완료한 전체 개수가 표시되어야 함
- 만약 정확히 1000개, 515개가 나온다면 DB 단 제한 가능성 있음

### 연도별 통계 확인 (쿼리 3-4)
2025년, 2024년 등 연도별로 얼마나 완료했는지 확인

### Row Level Security 확인 (쿼리 17)
Supabase의 RLS 정책이 데이터 조회를 제한하는지 확인

## 🚨 가능한 문제 원인들

### 1. Supabase 기본 Limit
- Supabase는 기본적으로 1000개 제한이 있음
- 우리가 코드에서 `.limit()` 제거했지만 여전히 제한될 수 있음

### 2. Row Level Security (RLS) 정책
- RLS 정책이 잘못 설정되어 일부 데이터만 조회되는 경우

### 3. 인덱스 문제
- 날짜 컬럼에 인덱스가 없어서 성능 문제로 제한될 수 있음

### 4. Supabase 플랜 제한
- 무료 플랜의 경우 API 호출 제한이 있을 수 있음

## 💡 해결 방법

### 방법 1: Pagination 사용
```typescript
// 여러 번에 나눠서 데이터 가져오기
const PAGE_SIZE = 1000
let allData = []
let page = 0
let hasMore = true

while (hasMore) {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('completed', true)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  
  if (data && data.length > 0) {
    allData = [...allData, ...data]
    page++
    hasMore = data.length === PAGE_SIZE
  } else {
    hasMore = false
  }
}
```

### 방법 2: Supabase Count 사용
```typescript
// 개수만 필요한 경우
const { count } = await supabase
  .from('todos')
  .select('*', { count: 'exact', head: true })
  .eq('completed', true)
```

### 방법 3: Database Function 사용
```sql
-- Supabase에서 함수 생성
CREATE OR REPLACE FUNCTION get_completion_stats()
RETURNS TABLE (
  total_todos BIGINT,
  total_plans BIGINT,
  todos_by_year JSONB,
  plans_by_year JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM todos WHERE completed = true),
    (SELECT COUNT(*) FROM plans WHERE completed = true),
    (SELECT jsonb_agg(jsonb_build_object('year', year, 'count', count))
     FROM (
       SELECT EXTRACT(YEAR FROM date::date) as year, COUNT(*) as count
       FROM todos WHERE completed = true
       GROUP BY year
     ) t),
    (SELECT jsonb_agg(jsonb_build_object('year', year, 'count', count))
     FROM (
       SELECT EXTRACT(YEAR FROM due_date::date) as year, COUNT(*) as count
       FROM plans WHERE completed = true AND due_date IS NOT NULL
       GROUP BY year
     ) p);
END;
$$ LANGUAGE plpgsql;
```

## 📝 체크리스트

- [ ] 쿼리 1-2 실행하여 실제 총 개수 확인
- [ ] 쿼리 3-4 실행하여 연도별 개수 확인
- [ ] 쿼리 17 실행하여 RLS 정책 확인
- [ ] 개수가 예상과 다른 경우 위 해결 방법 적용
- [ ] 대시보드에서 새로고침하여 결과 확인

## 🔗 참고
- [Supabase Pagination](https://supabase.com/docs/guides/api/pagination)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgREST Limits](https://postgrest.org/en/stable/api.html#limits-and-pagination)
