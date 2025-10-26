# 📱 모바일 앱 - Vercel URL 연결 가이드

## ✅ 훨씬 간단한 방법!

ngrok 필요 없이 **이미 배포된 Vercel URL**을 직접 사용하면 됩니다!

---

## 🚀 설정 방법 (2분)

### 1️⃣ Vercel URL 확인

프로젝트가 이미 Vercel에 배포되어 있을 것입니다. URL을 확인하세요:

- **프로덕션**: `https://your-project-name.vercel.app`
- **프리뷰**: `https://your-project-name-git-main-username.vercel.app`

Vercel 대시보드에서 확인하거나:
```bash
vercel ls
```

### 2️⃣ WebView URL 설정

**방법 A: 직접 코드 수정 (간단)**

`mobile/components/WebViewScreen.tsx` 파일:

```typescript
const VERCEL_URL = 'https://your-actual-vercel-url.vercel.app'; // 👈 여기만 수정!
```

**방법 B: 환경 변수 사용 (권장)**

1. `.env` 파일 생성:
```bash
cd mobile
cp .env.example .env
```

2. `.env` 파일 수정:
```bash
EXPO_PUBLIC_WEB_APP_URL=https://your-actual-vercel-url.vercel.app
EXPO_PUBLIC_USE_LOCALHOST=false
```

3. `WebViewScreen.tsx`에서 환경 변수 사용하도록 수정 (선택):
```typescript
import Constants from 'expo-constants';

const VERCEL_URL = Constants.expoConfig?.extra?.webAppUrl || 'https://fallback-url.vercel.app';
```

### 3️⃣ 모바일 앱 실행

```bash
cd mobile
npm install  # 처음 한 번만
npm start
```

이제 Vercel에 배포된 웹 앱이 모바일 앱에서 바로 실행됩니다! 🎉

---

## 💡 장점

### ✅ Vercel URL 사용 시
- **간단함**: ngrok 불필요
- **안정적**: 항상 같은 URL
- **빠름**: Vercel CDN 활용
- **실제 환경**: 프로덕션과 동일한 환경

### ⚠️ localhost 사용 시 (필요한 경우만)
- **복잡함**: ngrok 또는 IP 설정 필요
- **불안정**: 네트워크 변경 시 재설정
- **느림**: 로컬 네트워크 속도
- **제한적**: 웹 앱 개발 중에만 유용

---

## 🔧 개발 워크플로우

### 추천 방법

1. **웹 앱 수정** → Vercel에 자동 배포 (Git push)
2. **모바일 앱**이 자동으로 최신 버전 사용
3. 끝! 😎

### localhost가 필요한 경우

웹 앱을 실시간으로 테스트해야 할 때만:

1. `USE_LOCALHOST = true` 설정
2. 웹 앱 실행: `npm run dev`
3. ngrok: `ngrok http 3000`
4. ngrok URL을 `VERCEL_URL`에 임시로 입력

---

## 📝 예시

### 실제 설정 예시

```typescript
// mobile/components/WebViewScreen.tsx

// 실제 Vercel URL
const VERCEL_URL = 'https://todolist-for-me-abc123.vercel.app';

// 로컬 개발이 필요하면 true로 변경
const USE_LOCALHOST = false;

const WEB_APP_URL = __DEV__ && USE_LOCALHOST
  ? 'http://localhost:3000'
  : VERCEL_URL;  // 기본적으로 Vercel URL 사용
```

---

## 🎯 다음 단계

### 1. Vercel URL 확인
```bash
# Vercel CLI로 확인
vercel ls

# 또는 Vercel 대시보드에서 확인
# https://vercel.com/dashboard
```

### 2. WebView URL 설정
```typescript
const VERCEL_URL = 'https://실제URL.vercel.app';
```

### 3. 모바일 앱 실행
```bash
cd mobile
npm start
npm run ios  # 또는 npm run android
```

---

## 🔍 Vercel URL 찾기

### 방법 1: GitHub에서 확인
- GitHub 저장소 → Actions 또는 Deployments 탭
- Vercel 배포 링크 확인

### 방법 2: Vercel 대시보드
1. https://vercel.com 로그인
2. 프로젝트 선택
3. Domains 섹션에서 URL 확인

### 방법 3: Git 커밋 후 확인
```bash
git push origin main
# GitHub에서 Vercel 배포 코멘트 확인
```

---

## 📱 완료!

이제 **ngrok 없이** 바로 모바일 앱을 실행할 수 있습니다! 

Vercel URL만 설정하면 끝! 🚀

