import React, { useRef, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorScreen from './ErrorScreen';
import { parseWebViewMessage, WebToNativeMessageType } from '../utils/webview-bridge';

// Vercel 배포 URL (실제 URL로 변경하세요)
// 개발 환경에서도 Vercel URL을 사용하면 별도 터널링 불필요
const VERCEL_URL = 'https://your-app.vercel.app'; // 👈 실제 Vercel URL로 변경

// 로컬 개발 시에만 localhost 사용하려면 __DEV__를 true로 설정
const USE_LOCALHOST = false; // true면 localhost:3000, false면 Vercel URL

const WEB_APP_URL = __DEV__ && USE_LOCALHOST
  ? 'http://localhost:3000'  // 로컬 개발용 (ngrok 필요)
  : VERCEL_URL;  // Vercel 배포 URL (추천)

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // 웹에서 네이티브로 온 메시지 처리
  const handleMessage = useCallback((event: any) => {
    const message = parseWebViewMessage(event.nativeEvent.data);
    
    if (!message) return;
    
    console.log('Message from web:', message);
    
    switch (message.type) {
      case WebToNativeMessageType.REQUEST_NOTIFICATION_PERMISSION:
        // TODO: 알림 권한 요청 처리
        console.log('Notification permission requested');
        break;
        
      case WebToNativeMessageType.HAPTIC_FEEDBACK:
        // TODO: 햅틱 피드백
        console.log('Haptic feedback requested');
        break;
        
      case WebToNativeMessageType.BIOMETRIC_AUTH:
        // TODO: 생체인증 처리
        console.log('Biometric auth requested');
        break;
        
      case WebToNativeMessageType.SHARE_CONTENT:
        // TODO: 공유 기능
        console.log('Share requested:', message.data);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Android 뒤로 가기 버튼 처리
  React.useEffect(() => {
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

  const handleRetry = useCallback(() => {
    setError(false);
    webViewRef.current?.reload();
  }, []);

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
        cacheEnabled={true}
        
        // iOS 설정
        allowsBackForwardNavigationGestures={true}
        
        // 이벤트 핸들러
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError(true);
          setLoading(false);
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onMessage={handleMessage}
        
        // 로딩 인디케이터
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}
      />
      
      {error && <ErrorScreen onRetry={handleRetry} />}
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

