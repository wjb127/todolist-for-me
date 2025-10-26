import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// 스플래시 스크린 자동 숨김 방지
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // 앱 준비되면 스플래시 숨김
    const prepare = async () => {
      try {
        // 여기에 초기화 작업 추가 (푸시 알림 등록 등)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}

