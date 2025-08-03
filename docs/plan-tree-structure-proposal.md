# 계획 트리 구조 구현 제안서

## 개요
현재 단일 레벨의 계획 관리 시스템을 계층적 트리 구조로 확장하여, 상위 계획과 하위 계획을 체계적으로 관리할 수 있도록 개선합니다.

## 현재 구조의 한계점
- 모든 계획이 동일한 레벨에 존재
- 복잡한 프로젝트의 세부 작업 관리 어려움
- 계획 간 관계성 표현 불가

## 제안하는 트리 구조

### 1. 데이터베이스 구조 변경

#### 현재 plans 테이블
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 제안하는 새로운 구조
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES plans(id) ON DELETE CASCADE,  -- 새로운 컬럼
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  depth INTEGER DEFAULT 0,  -- 트리 깊이 (0=최상위)
  path TEXT[],  -- 경로 배열 (예: [parent_id, grandparent_id])
  is_expanded BOOLEAN DEFAULT true,  -- UI 접기/펼치기 상태
  children_count INTEGER DEFAULT 0,  -- 하위 계획 개수 캐시
  completed_children_count INTEGER DEFAULT 0,  -- 완료된 하위 계획 개수
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 인덱스 추가
CREATE INDEX idx_plans_parent_id ON plans(parent_id);
CREATE INDEX idx_plans_path ON plans USING GIN(path);
```

### 2. 기능 구현 방안

#### A. 계층 구조 관리
- **최대 깊이 제한**: 3-4단계로 제한 (UX 복잡도 관리)
- **순환 참조 방지**: parent_id 설정 시 검증
- **경로 자동 업데이트**: 트리거로 path 배열 자동 관리

#### B. UI/UX 개선사항
1. **시각적 표현**
   - 들여쓰기로 계층 표시
   - 접기/펼치기 토글 버튼
   - 하위 계획 개수 배지
   - 트리 라인 연결선

2. **드래그 앤 드롭 확장**
   - 계획을 다른 계획 안으로 드래그하여 하위로 이동
   - 계층 간 순서 변경
   - 시각적 드롭 존 표시

3. **진행률 계산**
   - 하위 계획 완료율이 상위 계획에 반영
   - 가중치 기반 진행률 계산 옵션

#### C. 새로운 기능
1. **일괄 작업**
   - 상위 계획 완료 시 하위 계획 자동 완료 옵션
   - 하위 계획 일괄 생성 템플릿

2. **필터링 확장**
   - 특정 깊이의 계획만 보기
   - 완료된 하위 계획 숨기기
   - 마감일 임박한 하위 계획 강조

### 3. 구현 단계별 Todo

#### Phase 1: 데이터베이스 마이그레이션
- [ ] 새로운 컬럼 추가 마이그레이션 작성
- [ ] 기존 데이터 보존 전략 수립
- [ ] 인덱스 및 제약조건 추가
- [ ] 트리거 함수 작성 (path 업데이트, children_count 관리)

#### Phase 2: 백엔드 로직
- [ ] 계층 구조 CRUD API 확장
- [ ] 순환 참조 검증 로직
- [ ] 재귀 쿼리로 트리 전체 조회
- [ ] 진행률 계산 로직 구현

#### Phase 3: 프론트엔드 기본 기능
- [ ] 트리 컴포넌트 구현 (접기/펼치기)
- [ ] 들여쓰기 및 연결선 UI
- [ ] 계층 구조 표시 아이콘
- [ ] 기본 CRUD 연결

#### Phase 4: 고급 기능
- [ ] 드래그 앤 드롭으로 계층 이동
- [ ] 일괄 작업 UI/기능
- [ ] 진행률 시각화
- [ ] 필터 옵션 확장

#### Phase 5: 최적화 및 개선
- [ ] 대용량 트리 성능 최적화
- [ ] 가상 스크롤링 적용
- [ ] 트리 상태 로컬 저장
- [ ] 단축키 지원

### 4. 기술적 고려사항

#### 성능 최적화
- **지연 로딩**: 하위 계획은 펼칠 때만 로드
- **캐싱**: 자주 접근하는 트리 경로 캐시
- **배치 업데이트**: 여러 계획 동시 업데이트 시 최적화

#### 데이터 일관성
- **트랜잭션 처리**: 계층 이동 시 원자성 보장
- **Optimistic UI**: 빠른 반응성을 위한 낙관적 업데이트
- **충돌 해결**: 동시 편집 시 충돌 처리 전략

### 5. 예상 UI 목업

```
📋 프로젝트 A (2/4 완료)
  ├─ ✓ 기획 단계
  ├─ ✓ 디자인 작업
  ├─ 📋 개발 단계 (0/3 완료)
  │   ├─ □ 프론트엔드 구현
  │   ├─ □ 백엔드 API
  │   └─ □ 데이터베이스 설계
  └─ □ 테스트 및 배포
```

### 6. 대안 및 추가 고려사항

#### A. 태그 기반 그룹핑
- 트리 대신 태그로 계획 그룹화
- 더 유연하지만 계층 관계 표현 제한

#### B. 프로젝트 개념 도입
- plans 위에 projects 테이블 추가
- 프로젝트별 계획 관리

#### C. 마일스톤 시스템
- 주요 이정표 설정
- 하위 계획들이 마일스톤에 연결

### 7. 리스크 및 대응 방안

1. **복잡도 증가**
   - 해결: 단계적 출시, 사용자 피드백 반영

2. **기존 데이터 마이그레이션**
   - 해결: 모든 기존 계획을 최상위로 설정

3. **성능 저하**
   - 해결: 인덱스 최적화, 페이지네이션

### 8. 결론

트리 구조 도입은 계획 관리의 체계성을 크게 향상시킬 수 있습니다. 단계적 구현을 통해 리스크를 최소화하면서 사용자 가치를 극대화할 수 있을 것으로 예상됩니다.