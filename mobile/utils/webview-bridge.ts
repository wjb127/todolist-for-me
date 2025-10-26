/**
 * WebView와 네이티브 앱 간 통신을 위한 브리지
 */

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
  PUSH_TOKEN = 'PUSH_TOKEN',
}

// 메시지 파서
export const parseWebViewMessage = (message: string): WebViewMessage | null => {
  try {
    return JSON.parse(message);
  } catch (error) {
    console.error('Failed to parse WebView message:', error);
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
  const script = `
    (function() {
      window.postMessage(${JSON.stringify({ type, data })}, '*');
    })();
    true;
  `;
  
  webViewRef.current?.injectJavaScript(script);
};

