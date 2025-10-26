# React Native WebView 구현 가이드

## 📱 프로젝트 개요

**접근 방식**: React Native + WebView로 기존 Next.js 앱 감싸기  
**예상 소요 시간**: 3-4주  
**난이도**: 중급  

---

## ✅ 전체 TODO 체크리스트

### Phase 1: 환경 설정 및 기본 프로젝트 생성 (Day 1-3)

- [ ] **1.1** Node.js 및 개발 환경 확인
  - [ ] Node.js 18+ 설치 확인
  - [ ] Xcode 설치 (iOS 개발용, macOS만)
  - [ ] Android Studio 설치
  - [ ] CocoaPods 설치 (iOS용)

- [ ] **1.2** Expo (또는 React Native CLI) 프로젝트 생성
  - [ ] Expo 프로젝트 초기화
  - [ ] TypeScript 설정
  - [ ] 기본 폴더 구조 생성

- [ ] **1.3** React Native WebView 설치
  - [ ] react-native-webview 패키지 설치
  - [ ] iOS 네이티브 의존성 설치
  - [ ] Android 설정

- [ ] **1.4** 개발 서버 테스트
  - [ ] Expo Go로 기본 화면 테스트
  - [ ] iOS 시뮬레이터 실행
  - [ ] Android 에뮬레이터 실행

### Phase 2: WebView 통합 및 기본 기능 (Day 4-7)

- [ ] **2.1** 기존 Next.js 앱과 연결
  - [ ] Next.js 개발 서버 URL로 WebView 설정
  - [ ] 로컬 개발 환경 WebView 연결
  - [ ] 프로덕션 URL 환경 변수 설정

- [ ] **2.2** WebView 기본 설정
  - [ ] JavaScript 활성화
  - [ ] DOM Storage 활성화
  - [ ] 쿠키 설정
  - [ ] 캐시 정책 설정

- [ ] **2.3** 로딩 및 에러 처리
  - [ ] 로딩 인디케이터 추가
  - [ ] 에러 페이지 구현
  - [ ] 네트워크 오류 처리
  - [ ] 재시도 버튼 구현

- [ ] **2.4** 웹-네이티브 통신 설정
  - [ ] postMessage 설정
  - [ ] onMessage 리스너 구현
  - [ ] 양방향 통신 테스트

### Phase 3: 네이티브 기능 통합 (Day 8-14)

- [ ] **3.1** 네비게이션 개선
  - [ ] 뒤로 가기 버튼 처리
  - [ ] 앱 종료 방지 로직
  - [ ] 하드웨어 백 버튼 처리 (Android)

- [ ] **3.2** 푸시 알림 구현
  - [ ] Firebase Cloud Messaging 설정
  - [ ] APNs (Apple Push Notification) 설정
  - [ ] 알림 권한 요청
  - [ ] 알림 수신 핸들러
  - [ ] 알림 클릭 시 딥링크

- [ ] **3.3** 로컬 알림
  - [ ] 로컬 알림 패키지 설치
  - [ ] 할 일 리마인더 구현
  - [ ] 알림 스케줄링

- [ ] **3.4** 생체인증
  - [ ] React Native Biometrics 설치
  - [ ] Face ID/Touch ID 설정
  - [ ] 로그인 시 생체인증 통합

- [ ] **3.5** 오프라인 지원
  - [ ] NetInfo 패키지 설치
  - [ ] 네트워크 상태 감지
  - [ ] 오프라인 알림 표시
  - [ ] WebView에 네트워크 상태 전달

- [ ] **3.6** 공유 기능
  - [ ] React Native Share 설치
  - [ ] 할 일 공유 기능
  - [ ] 스크린샷 공유

### Phase 4: UI/UX 개선 (Day 15-17)

- [ ] **4.1** 스플래시 스크린
  - [ ] 스플래시 이미지 제작
  - [ ] iOS 스플래시 스크린 설정
  - [ ] Android 스플래시 스크린 설정
  - [ ] 스플래시 지속 시간 조정

- [ ] **4.2** 앱 아이콘
  - [ ] 1024x1024 앱 아이콘 제작
  - [ ] iOS 아이콘 세트 생성
  - [ ] Android 아이콘 생성
  - [ ] 적응형 아이콘 (Android)

- [ ] **4.3** 상태바 및 네비게이션 바
  - [ ] 상태바 스타일 설정
  - [ ] Safe Area 처리
  - [ ] 다크 모드 대응

- [ ] **4.4** 제스처 및 햅틱
  - [ ] Pull to Refresh 구현
  - [ ] 스와이프 제스처
  - [ ] 햅틱 피드백

### Phase 5: 성능 최적화 (Day 18-19)

- [ ] **5.1** 앱 시작 시간 최적화
  - [ ] Hermes 엔진 활성화
  - [ ] 불필요한 패키지 제거
  - [ ] 번들 크기 분석

- [ ] **5.2** WebView 성능 개선
  - [ ] 하드웨어 가속 활성화
  - [ ] 메모리 사용량 최적화
  - [ ] 캐시 전략 개선

- [ ] **5.3** 이미지 최적화
  - [ ] WebP 지원 확인
  - [ ] 이미지 캐싱
  - [ ] Lazy loading

### Phase 6: 테스트 (Day 20-22)

- [ ] **6.1** 기능 테스트
  - [ ] 모든 탭 동작 확인
  - [ ] Todo/계획/버킷리스트 CRUD
  - [ ] 푸시 알림 수신
  - [ ] 생체인증
  - [ ] 공유 기능

- [ ] **6.2** 성능 테스트
  - [ ] 앱 시작 시간 측정
  - [ ] 메모리 사용량 확인
  - [ ] 배터리 소모 테스트
  - [ ] 느린 네트워크 테스트

- [ ] **6.3** 디바이스 테스트
  - [ ] iPhone (최신, 구형)
  - [ ] Android (다양한 제조사)
  - [ ] 태블릿 (iPad, Android)

- [ ] **6.4** 엣지 케이스 테스트
  - [ ] 오프라인 모드
  - [ ] 앱 백그라운드/포그라운드
  - [ ] 메모리 부족 상황
  - [ ] 권한 거부 시나리오

### Phase 7: 앱 스토어 준비 (Day 23-25)

- [ ] **7.1** iOS 준비
  - [ ] Bundle Identifier 설정
  - [ ] 서명 인증서 생성
  - [ ] 프로비저닝 프로필
  - [ ] App Store Connect 앱 생성
  - [ ] 스크린샷 촬영 (5 sizes)
  - [ ] 앱 설명 작성

- [ ] **7.2** Android 준비
  - [ ] Package Name 설정
  - [ ] 서명 키 생성
  - [ ] AAB 빌드 설정
  - [ ] Google Play Console 앱 생성
  - [ ] 스크린샷 촬영
  - [ ] 기능 그래픽 제작

- [ ] **7.3** 공통 준비
  - [ ] 개인정보 처리방침 작성
  - [ ] 이용약관 작성
  - [ ] 지원 이메일/웹사이트
  - [ ] 프로모션 텍스트
  - [ ] 키워드 선정

### Phase 8: 베타 테스트 및 출시 (Day 26-28)

- [ ] **8.1** 베타 배포
  - [ ] TestFlight 베타 (iOS)
  - [ ] Google Play 내부 테스트
  - [ ] 베타 테스터 모집
  - [ ] 피드백 수집

- [ ] **8.2** 최종 수정
  - [ ] 베타 피드백 반영
  - [ ] 버그 수정
  - [ ] 마지막 테스트

- [ ] **8.3** 정식 출시
  - [ ] iOS 리뷰 제출
  - [ ] Android 프로덕션 출시
  - [ ] 출시 공지
  - [ ] 리뷰 모니터링

---

## 📝 단계별 상세 가이드

### Phase 1: 환경 설정 (Day 1-3)

#### Step 1.1: 개발 환경 확인

```bash
# Node.js 버전 확인
node --version  # v18 이상 필요

# npm 버전 확인
npm --version

# macOS: Xcode 설치 확인
xcode-select --version

# CocoaPods 설치 (macOS)
sudo gem install cocoapods

# Android Studio 설치 확인
# - Android SDK 설치
# - Android SDK Platform-Tools
# - Android Emulator
```

#### Step 1.2: React Native 프로젝트 생성

```bash
# Expo 방식 (추천 - 더 쉬움)
npx create-expo-app todolist-mobile --template blank-typescript
cd todolist-mobile

# 또는 React Native CLI 방식
# npx react-native init TodoListMobile --template react-native-template-typescript
```

**프로젝트 구조:**
```
todolist-mobile/
├── app/
│   ├── (tabs)/           # 탭 네비게이션
│   ├── _layout.tsx       # 루트 레이아웃
│   └── index.tsx         # 메인 WebView
├── components/
│   ├── WebViewScreen.tsx # WebView 컴포넌트
│   ├── LoadingScreen.tsx # 로딩 화면
│   └── ErrorScreen.tsx   # 에러 화면
├── services/
│   ├── notifications.ts  # 푸시 알림
│   ├── biometric.ts      # 생체인증
│   └── storage.ts        # 로컬 저장소
├── utils/
│   ├── webview-bridge.ts # 웹-네이티브 통신
│   └── constants.ts      # 상수
├── assets/              # 이미지, 아이콘
├── app.json            # Expo 설정
└── package.json
```

#### Step 1.3: React Native WebView 설치

```bash
# WebView 패키지 설치
npx expo install react-native-webview

# iOS 의존성 설치 (macOS만)
cd ios && pod install && cd ..

# 추가 유용한 패키지들
npx expo install expo-status-bar
npx expo install @react-navigation/native
npx expo install react-native-safe-area-context
```

**package.json 확인:**
```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-webview": "^13.6.3",
    "expo-status-bar": "~1.11.0"
  }
}
```

#### Step 1.4: 개발 서버 테스트

```bash
# Expo 개발 서버 시작
npx expo start

# iOS 시뮬레이터에서 실행
npx expo start --ios

# Android 에뮬레이터에서 실행
npx expo start --android

# 실제 디바이스 (Expo Go 앱 필요)
# QR 코드 스캔
```

---

### Phase 2: WebView 통합 (Day 4-7)

#### Step 2.1: 기본 WebView 컴포넌트 생성

**파일: `components/WebViewScreen.tsx`**

```typescript
import React, { useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorScreen from './ErrorScreen';

// 환경에 따라 URL 변경
const WEB_APP_URL = __DEV__ 
  ? 'http://localhost:3000'  // 개발 환경
  : 'https://your-app.vercel.app';  // 프로덕션

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        
        // 기본 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        
        // 이벤트 핸들러
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setError(true)}
        
        // 로딩 인디케이터
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}
      />
      
      {error && (
        <ErrorScreen 
          onRetry={() => {
            setError(false);
            webViewRef.current?.reload();
          }} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
```

**파일: `components/ErrorScreen.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorScreenProps {
  onRetry: () => void;
}

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>연결 실패</Text>
      <Text style={styles.message}>
        인터넷 연결을 확인하고 다시 시도해주세요.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**파일: `app/index.tsx`**

```typescript
import React from 'react';
import WebViewScreen from '../components/WebViewScreen';

export default function Index() {
  return <WebViewScreen />;
}
```

#### Step 2.2: 로컬 개발 환경 설정

**문제**: iOS/Android 에뮬레이터에서 `localhost:3000` 접근 불가

**해결책 1: ngrok 사용 (추천)**

```bash
# ngrok 설치 (macOS)
brew install ngrok

# Next.js 개발 서버 실행 (터미널 1)
cd /path/to/todolist-for-me
npm run dev

# ngrok으로 터널링 (터미널 2)
ngrok http 3000

# 출력된 https URL을 WebViewScreen.tsx에 입력
# 예: https://abc123.ngrok.io
```

**해결책 2: 같은 네트워크의 IP 사용**

```bash
# 내 IP 확인 (macOS)
ifconfig | grep "inet " | grep -v 127.0.0.1

# Next.js를 모든 네트워크 인터페이스에서 실행
# package.json 수정
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"
  }
}

# WebView URL을 IP로 변경
# 예: http://192.168.1.100:3000
```

#### Step 2.3: 웹-네이티브 통신 설정

**파일: `utils/webview-bridge.ts`**

```typescript
export interface WebViewMessage {
  type: string;
  data?: any;
}

// 웹에서 네이티브로 보낼 메시지 타입
export enum WebToNativeMessageType {
  REQUEST_NOTIFICATION_PERMISSION = 'REQUEST_NOTIFICATION_PERMISSION',
  SCHEDULE_NOTIFICATION = 'SCHEDULE_NOTIFICATION',
  BIOMETRIC_AUTH = 'BIOMETRIC_AUTH',
  SHARE_CONTENT = 'SHARE_CONTENT',
  HAPTIC_FEEDBACK = 'HAPTIC_FEEDBACK',
}

// 네이티브에서 웹으로 보낼 메시지 타입
export enum NativeToWebMessageType {
  NETWORK_STATUS = 'NETWORK_STATUS',
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED',
  BIOMETRIC_RESULT = 'BIOMETRIC_RESULT',
}

// 메시지 파서
export const parseWebViewMessage = (message: string): WebViewMessage | null => {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

// 웹으로 메시지 전송
export const sendMessageToWeb = (
  webViewRef: any,
  type: NativeToWebMessageType,
  data?: any
) => {
  const message = JSON.stringify({ type, data });
  webViewRef.current?.injectJavaScript(`
    window.postMessage(${message}, '*');
    true;
  `);
};
```

**WebView 컴포넌트에 통신 추가:**

```typescript
// components/WebViewScreen.tsx 수정
import { parseWebViewMessage, WebToNativeMessageType } from '../utils/webview-bridge';

export default function WebViewScreen() {
  // ... 기존 코드

  const handleMessage = (event: any) => {
    const message = parseWebViewMessage(event.nativeEvent.data);
    
    if (!message) return;
    
    switch (message.type) {
      case WebToNativeMessageType.REQUEST_NOTIFICATION_PERMISSION:
        // 알림 권한 요청 처리
        requestNotificationPermission();
        break;
        
      case WebToNativeMessageType.HAPTIC_FEEDBACK:
        // 햅틱 피드백
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
        
      // ... 기타 케이스
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: WEB_APP_URL }}
      onMessage={handleMessage}  // 추가
      // ... 기타 props
    />
  );
}
```

**웹 앱 측 코드 (Next.js):**

```typescript
// lib/native-bridge.ts (웹 앱에 추가)
export const isReactNativeWebView = () => {
  return typeof window !== 'undefined' && 
         (window as any).ReactNativeWebView !== undefined;
};

export const sendMessageToNative = (type: string, data?: any) => {
  if (isReactNativeWebView()) {
    (window as any).ReactNativeWebView.postMessage(
      JSON.stringify({ type, data })
    );
  }
};

// 사용 예시: 햅틱 피드백 요청
export const triggerHaptic = () => {
  sendMessageToNative('HAPTIC_FEEDBACK');
};
```

---

### Phase 3: 네이티브 기능 통합 (Day 8-14)

#### Step 3.1: 뒤로 가기 버튼 처리

```typescript
// components/WebViewScreen.tsx에 추가
import { BackHandler } from 'react-native';
import { useEffect } from 'react';

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Android 뒤로 가기 버튼 처리
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true; // 이벤트 처리됨
        }
        return false; // 앱 종료
      }
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  return (
    <WebView
      ref={webViewRef}
      onNavigationStateChange={(navState) => {
        setCanGoBack(navState.canGoBack);
      }}
      // ... 기타 props
    />
  );
}
```

#### Step 3.2: 푸시 알림 구현

```bash
# 필요한 패키지 설치
npx expo install expo-notifications
npx expo install expo-device
npx expo install expo-constants
```

**파일: `services/notifications.ts`**

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 푸시 알림 권한 요청
export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = 
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('푸시 알림 권한이 필요합니다!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    console.log('Push token:', token);
    // 이 토큰을 Supabase에 저장
    
  } else {
    alert('실제 디바이스에서만 푸시 알림을 사용할 수 있습니다.');
  }

  return token;
}

// 로컬 알림 예약 (할 일 리마인더용)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  scheduledTime: Date
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      date: scheduledTime,
    },
  });
}

// 알림 수신 리스너
export function addNotificationListener(
  onNotificationReceived: (notification: any) => void
) {
  const subscription = Notifications.addNotificationReceivedListener(
    onNotificationReceived
  );
  
  return subscription;
}

// 알림 클릭 리스너
export function addNotificationResponseListener(
  onNotificationClicked: (response: any) => void
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    onNotificationClicked
  );
  
  return subscription;
}
```

**App.tsx에서 알림 초기화:**

```typescript
// app/_layout.tsx
import { useEffect, useRef } from 'react';
import { registerForPushNotifications, addNotificationListener, addNotificationResponseListener } from '../services/notifications';

export default function RootLayout() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // 푸시 알림 등록
    registerForPushNotifications();

    // 알림 수신 리스너
    notificationListener.current = addNotificationListener((notification) => {
      console.log('Notification received:', notification);
    });

    // 알림 클릭 리스너
    responseListener.current = addNotificationResponseListener((response) => {
      console.log('Notification clicked:', response);
      // WebView에 메시지 전송하여 해당 페이지로 이동
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    // ... 기존 레이아웃
  );
}
```

#### Step 3.3: 생체인증

```bash
# 생체인증 패키지 설치
npx expo install expo-local-authentication
```

**파일: `services/biometric.ts`**

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// 생체인증 사용 가능 여부 확인
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  return hasHardware && isEnrolled;
}

// 지원하는 생체인증 타입 확인
export async function getSupportedBiometricTypes() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  // 1 = 지문, 2 = 얼굴인식, 3 = 홍채인식
  return types;
}

// 생체인증 실행
export async function authenticateWithBiometric(
  promptMessage: string = '로그인하려면 인증이 필요합니다'
): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    
    if (!available) {
      alert('생체인증을 사용할 수 없습니다.');
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: '비밀번호 사용',
      cancelLabel: '취소',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Biometric auth error:', error);
    return false;
  }
}
```

**WebView에서 생체인증 사용:**

```typescript
// WebView 메시지 핸들러에 추가
case WebToNativeMessageType.BIOMETRIC_AUTH:
  const success = await authenticateWithBiometric();
  sendMessageToWeb(webViewRef, NativeToWebMessageType.BIOMETRIC_RESULT, {
    success,
  });
  break;
```

---

### Phase 4: UI/UX 개선 (Day 15-17)

#### Step 4.1: 스플래시 스크린

```bash
# 스플래시 스크린 패키지 설치
npx expo install expo-splash-screen
```

**app.json 설정:**

```json
{
  "expo": {
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#3b82f6"
    }
  }
}
```

**스플래시 이미지 준비:**
- `assets/splash.png` - 1242x2436 (iPhone 해상도)
- 앱 로고 중앙 배치
- 단순하고 깔끔한 디자인

**App.tsx에서 스플래시 제어:**

```typescript
import * as SplashScreen from 'expo-splash-screen';

// 스플래시 자동 숨김 방지
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 필요한 초기화 작업
        await registerForPushNotifications();
        // ...
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    // ... 앱 컴포넌트
  );
}
```

#### Step 4.2: 앱 아이콘

**아이콘 준비:**
- `assets/icon.png` - 1024x1024 (정사각형)
- iOS: 모서리 둥글게, 그림자 없음
- Android: 적응형 아이콘 고려

**app.json 설정:**

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "ios": {
      "icon": "./assets/icon.png"
    },
    "android": {
      "icon": "./assets/icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#3b82f6"
      }
    }
  }
}
```

#### Step 4.3: Pull to Refresh

```typescript
// components/WebViewScreen.tsx에 추가
import { RefreshControl } from 'react-native';

export default function WebViewScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <WebView
        // ... props
      />
    </ScrollView>
  );
}
```

---

### Phase 5: 프로덕션 빌드 (Day 18-20)

#### Step 5.1: EAS Build 설정

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 로그인
eas login

# 프로젝트 설정
eas build:configure
```

**eas.json 생성:**

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

#### Step 5.2: iOS 빌드

```bash
# iOS 프로덕션 빌드
eas build --platform ios --profile production

# TestFlight 자동 제출
eas submit --platform ios --latest
```

**필요한 것:**
- Apple Developer 계정 ($99/년)
- Bundle Identifier (예: com.todolist.forme)
- App Store Connect에 앱 생성

#### Step 5.3: Android 빌드

```bash
# Android 프로덕션 빌드 (AAB)
eas build --platform android --profile production

# Google Play 제출
eas submit --platform android --latest
```

**필요한 것:**
- Google Play 개발자 계정 ($25 일회성)
- 서명 키 (EAS가 자동 생성)
- Google Play Console에 앱 생성

---

## 📊 예상 일정 요약

| 단계 | 기간 | 난이도 | 핵심 작업 |
|------|------|--------|-----------|
| Phase 1 | 3일 | ⭐ | 환경 설정 |
| Phase 2 | 4일 | ⭐⭐ | WebView 통합 |
| Phase 3 | 7일 | ⭐⭐⭐ | 네이티브 기능 |
| Phase 4 | 3일 | ⭐⭐ | UI/UX 개선 |
| Phase 5 | 3일 | ⭐⭐ | 성능 최적화 |
| Phase 6 | 3일 | ⭐⭐ | 테스트 |
| Phase 7 | 3일 | ⭐⭐ | 앱 스토어 준비 |
| Phase 8 | 3일 | ⭐ | 베타 및 출시 |
| **합계** | **4주** | - | - |

---

## 💰 예상 비용

| 항목 | 비용 | 비고 |
|------|------|------|
| Apple Developer | $99/년 | 필수 |
| Google Play | $25 | 일회성 필수 |
| EAS Build | 무료-$29/월 | 무료 플랜으로 시작 가능 |
| **총 초기 비용** | **$124** | - |

---

## 🎯 다음 단계

### 지금 바로 시작하기

```bash
# 1. 새 디렉토리로 이동
cd ~/Projects

# 2. React Native 프로젝트 생성
npx create-expo-app todolist-mobile --template blank-typescript

# 3. WebView 설치
cd todolist-mobile
npx expo install react-native-webview

# 4. 개발 서버 시작
npx expo start
```

이제 위의 체크리스트를 하나씩 따라하시면 됩니다! 궁금한 점이나 막히는 부분이 있으면 언제든지 물어보세요. 🚀

