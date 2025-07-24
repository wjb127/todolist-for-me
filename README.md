# Personal Todo App

나만을 위한 개인 Todo 관리 앱입니다. Next.js 15 + Supabase + Vercel 기반으로 제작된 PWA 앱입니다.

## 주요 기능

### 🗂️ 템플릿
- 반복되는 할 일을 템플릿으로 저장
- 템플릿 기반으로 빠른 Todo 생성
- 템플릿 생성, 편집, 삭제 기능

### ✅ TodoList
- 날짜별 할 일 관리
- 템플릿에서 할 일 추가
- 개별 할 일 직접 추가
- 완료 상태 토글
- 진행률 표시

### 🎯 계획
- 일회성 계획 관리
- 우선순위 설정 (높음/보통/낮음)
- 마감일 설정
- 계획 상태별 필터링

### 📊 대시보드
- 주간 Todo 완료율 분석
- 일별 성과 시각화
- 계획 달성률 표시
- 성취 배지 시스템

## 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **PWA**: next-pwa
- **Icons**: Lucide React
- **Date**: date-fns

## 설치 및 실행

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   `.env.local` 파일을 생성하고 Supabase 정보를 입력:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **데이터베이스 설정**
   Supabase에서 `supabase-schema.sql` 파일을 실행하여 테이블을 생성합니다.

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

## 데이터베이스 스키마

### templates
- 반복 사용할 할 일 템플릿 저장
- JSON 형태로 할 일 목록 저장

### todos
- 날짜별 할 일 저장
- 템플릿 연결 정보 포함
- 완료 상태 및 순서 관리

### plans
- 일회성 계획 저장
- 우선순위 및 마감일 관리

## PWA 기능

- 오프라인 지원
- 홈 화면 추가 가능
- 모바일 최적화된 UI
- 하단 네비게이션

## 배포

Vercel에 배포 시 환경 변수를 설정해야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 라이선스

MIT License