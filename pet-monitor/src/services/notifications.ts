import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { FirebaseConfig } from '../types';

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export async function initializeFirebase(config: FirebaseConfig): Promise<void> {
  if (firebaseApp) return;

  if (!config.apiKey || !config.projectId || !config.messagingSenderId) {
    console.log('[Notifications] Firebase config incomplete, skipping initialization');
    return;
  }

  try {
    firebaseApp = initializeApp(config);
    messaging = getMessaging(firebaseApp);
    console.log('[Notifications] Firebase initialized');
  } catch (error) {
    console.warn('[Notifications] Failed to initialize Firebase:', error);
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Notifications] Permission:', permission);
  return permission;
}

export async function getFCMToken(): Promise<string | null> {
  if (!messaging || !VAPID_KEY) {
    console.log('[Notifications] Firebase messaging not available');
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[Notifications] Notification permission not granted');
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (currentToken) {
      console.log('[Notifications] FCM Token obtained');
      return currentToken;
    } else {
      console.log('[Notifications] No FCM token available');
      return null;
    }
  } catch (error) {
    console.log('[Notifications] FCM token error (expected if not configured):', (error as Error).message);
    return null;
  }
}

export function onForegroundMessage(
  callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): (() => void) | undefined {
  if (!messaging) {
    console.warn('[Notifications] Firebase messaging not initialized');
    return undefined;
  }

  return onMessage(messaging, (payload) => {
    console.log('[Notifications] Foreground message received:', payload);
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });
  });
}

export async function sendMotionNotification(
  tokens: string[],
  roomCode: string
): Promise<boolean> {
  if (tokens.length === 0) {
    console.log('[Notifications] No tokens to send to');
    return false;
  }

  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens,
        roomCode,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Notifications] Push notification sent:', result);
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to send push notification:', error);
    return false;
  }
}

export function showLocalNotification(
  title: string,
  body: string,
  options: NotificationOptions = {}
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('[Notifications] Cannot show notification');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'motion-alert',
    renotify: true,
    ...options,
  } as NotificationOptions);

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

export function playAlertSound(): void {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 880;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}
