/**
 * Web Push & Service Worker utilities for Member Portal
 * Supports modern Android, Chrome, Edge, Firefox, and iOS 16.4+ (when added to Home Screen).
 */

/**
 * Convert URL-safe base64 string to Uint8Array for PushManager
 */
export function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if browser supports Web Push & Service Worker
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Checks if device is iOS (iPhone/iPad)
 */
export function isIosDevice() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Checks if app is running as an installed PWA (Standalone)
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Register Service Worker at root (/sw.js)
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Get current push subscription from browser if active
 */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (err) {
    console.warn('Failed to retrieve push subscription:', err);
    return null;
  }
}

/**
 * Request notification permission and subscribe to PushManager
 */
export async function subscribeUserToPush(vapidPublicKey) {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  // Request system permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Could not register service worker.');
  }

  const convertedKey = urlB64ToUint8Array(vapidPublicKey);

  // Subscribe with PushManager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });

  return subscription.toJSON();
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeUserFromPush() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error unsubscribing push:', err);
    return false;
  }
}
