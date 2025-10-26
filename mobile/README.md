# TodoList For Me - Mobile App

React Native + WebView를 사용한 모바일 앱

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd mobile
npm install
```

### 2. 개발 서버 실행

#### 웹 앱 먼저 실행 (필수!)

```bash
# 프로젝트 루트에서
npm run dev
```

또는 ngrok으로 터널링:

```bash
# 터미널 1: 웹 앱 실행
npm run dev

# 터미널 2: ngrok 터널
ngrok http 3000
# 나온 https URL을 components/WebViewScreen.tsx의 WEB_APP_URL에 입력
```

#### 모바일 앱 실행

```bash
cd mobile

# Expo 개발 서버 시작
npm start

# iOS 시뮬레이터 (macOS만)
npm run ios

# Android 에뮬레이터
npm run android

# 실제 디바이스 (Expo Go 앱 필요)
# QR 코드 스캔
```

## 📱 개발 환경 설정

### iOS (macOS만)

1. Xcode 설치
2. CocoaPods 설치: `sudo gem install cocoapods`
3. iOS 시뮬레이터 실행

### Android

1. Android Studio 설치
2. Android SDK 설정
3. Android 에뮬레이터 생성 및 실행

## 🔧 설정

### WebView URL 변경

`components/WebViewScreen.tsx` 파일의 `WEB_APP_URL` 수정:

```typescript
const WEB_APP_URL = __DEV__ 
  ? 'https://your-ngrok-url.ngrok.io'  // 개발
  : 'https://your-production-url.com';  // 프로덕션
```

## 📂 프로젝트 구조

```
mobile/
├── app/                    # Expo Router 페이지
│   ├── _layout.tsx        # 루트 레이아웃
│   └── index.tsx          # 메인 페이지
├── components/            # React 컴포넌트
│   ├── WebViewScreen.tsx  # WebView 화면
│   └── ErrorScreen.tsx    # 에러 화면
├── services/              # 네이티브 서비스
│   ├── notifications.ts   # 푸시 알림 (TODO)
│   └── biometric.ts       # 생체인증 (TODO)
├── utils/                 # 유틸리티
│   └── webview-bridge.ts  # 웹-네이티브 통신
├── assets/                # 이미지, 아이콘
├── app.json              # Expo 설정
└── package.json
```

## 🔗 웹-네이티브 통신

### 웹에서 네이티브로 메시지 보내기

웹 앱(Next.js)에서:

```typescript
if (window.ReactNativeWebView) {
  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'HAPTIC_FEEDBACK',
      data: { intensity: 'light' }
    })
  );
}
```

### 네이티브에서 웹으로 메시지 보내기

모바일 앱에서:

```typescript
import { sendMessageToWeb, NativeToWebMessageType } from './utils/webview-bridge';

sendMessageToWeb(webViewRef, NativeToWebMessageType.NETWORK_STATUS, {
  isOnline: true
});
```

## 📋 다음 단계 (TODO)

### Phase 3: 네이티브 기능 추가

- [ ] 푸시 알림 구현
- [ ] 생체인증 추가
- [ ] 로컬 알림 (리마인더)
- [ ] 오프라인 지원
- [ ] 공유 기능

### Phase 4: UI/UX 개선

- [ ] 앱 아이콘 제작
- [ ] 스플래시 스크린 디자인
- [ ] Pull to Refresh
- [ ] 햅틱 피드백

### Phase 5: 빌드 및 배포

- [ ] EAS Build 설정
- [ ] iOS 빌드
- [ ] Android 빌드
- [ ] App Store 제출
- [ ] Play Store 제출

## 🐛 문제 해결

### "Unable to resolve module" 에러

```bash
cd mobile
npm install
npx expo start -c  # 캐시 클리어
```

### iOS 시뮬레이터 안 뜸

```bash
# Xcode Command Line Tools 확인
xcode-select --install
```

### Android 에뮬레이터 연결 안 됨

```bash
# ADB 재시작
adb kill-server
adb start-server
```

## 📚 참고 자료

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [Expo Router](https://expo.github.io/router/docs/)

