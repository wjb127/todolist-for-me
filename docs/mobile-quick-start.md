# 모바일 앱 빠른 시작 가이드 ⚡

## 📱 1단계: 의존성 설치 (5분)

```bash
cd mobile
npm install
```

## 🌐 2단계: 웹 앱 접근 설정 (5분)

### 옵션 A: ngrok 사용 (추천)

```bash
# 터미널 1: 웹 앱 실행 (프로젝트 루트에서)
npm run dev

# 터미널 2: ngrok 설치 및 실행
brew install ngrok  # macOS
ngrok http 3000

# 출력된 https URL을 복사
# 예: https://abc123.ngrok.io
```

`mobile/components/WebViewScreen.tsx` 파일 수정:

```typescript
const WEB_APP_URL = __DEV__ 
  ? 'https://abc123.ngrok.io'  // 👈 여기에 ngrok URL 입력
  : 'https://your-app.vercel.app';
```

### 옵션 B: 로컬 IP 사용

```bash
# 내 IP 확인 (macOS)
ifconfig | grep "inet " | grep -v 127.0.0.1
# 예: inet 192.168.1.100

# package.json 수정 (프로젝트 루트)
"scripts": {
  "dev": "next dev -H 0.0.0.0"
}

# 웹 앱 재실행
npm run dev
```

`mobile/components/WebViewScreen.tsx` 파일 수정:

```typescript
const WEB_APP_URL = __DEV__ 
  ? 'http://192.168.1.100:3000'  // 👈 여기에 자신의 IP 입력
  : 'https://your-app.vercel.app';
```

## 🚀 3단계: 모바일 앱 실행 (2분)

```bash
cd mobile

# Expo 개발 서버 시작
npm start

# 그러면 QR 코드가 나타남
```

### iOS에서 실행 (macOS만)

```bash
# 시뮬레이터
npm run ios

# 또는 Expo 서버에서 'i' 키 입력
```

### Android에서 실행

```bash
# 에뮬레이터
npm run android

# 또는 Expo 서버에서 'a' 키 입력
```

### 실제 디바이스

1. **Expo Go 앱 설치**
   - iOS: App Store에서 "Expo Go" 검색
   - Android: Play Store에서 "Expo Go" 검색

2. **QR 코드 스캔**
   - iOS: 카메라 앱으로 스캔
   - Android: Expo Go 앱 내에서 스캔

## ✅ 확인사항

앱이 실행되면:
- ✅ 웹 앱이 WebView에 로드됨
- ✅ 모든 기능 정상 동작 (Todo, 계획, 버킷리스트 등)
- ✅ 하단 네비게이션 작동
- ✅ Android 뒤로 가기 버튼 작동

## 🐛 문제 해결

### "네트워크 에러" 표시

1. 웹 앱이 실행 중인지 확인
2. ngrok URL 또는 IP가 올바른지 확인
3. 모바일과 PC가 같은 Wi-Fi에 연결되어 있는지 확인 (IP 사용 시)

### "Unable to resolve module" 에러

```bash
cd mobile
rm -rf node_modules
npm install
npx expo start -c  # 캐시 클리어
```

### iOS 시뮬레이터가 안 열림

```bash
# Xcode Command Line Tools 설치
xcode-select --install

# 시뮬레이터 직접 실행
open -a Simulator
```

### Android 에뮬레이터 연결 안 됨

```bash
# ADB 확인
adb devices

# ADB 재시작
adb kill-server
adb start-server
```

## 📋 다음 단계

Phase 3로 이동: 네이티브 기능 추가
- 푸시 알림
- 생체인증
- 로컬 알림

자세한 내용은 `mobile/README.md` 참조

