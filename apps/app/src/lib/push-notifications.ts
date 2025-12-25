/**
 * プッシュ通知のクライアント側ユーティリティ
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * VAPID公開鍵をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
 * プッシュ通知がサポートされているかチェック
 */
export function isPushNotificationSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * 現在の通知許可状態を取得
 */
export function getNotificationPermission(): NotificationPermission | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return null;
    }
    return Notification.permission;
}

/**
 * 通知の許可をリクエスト
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPushNotificationSupported()) {
        throw new Error('プッシュ通知はこのブラウザでサポートされていません');
    }
    return await Notification.requestPermission();
}

/**
 * Service Workerを取得（タイムアウト付き）
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    // Service Workerが登録されているか確認
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
        throw new Error('Service Workerが登録されていません。本番環境でお試しください。');
    }

    // タイムアウト付きでService Workerの準備を待つ
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Service Workerの準備がタイムアウトしました')), 5000);
    });

    const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise,
    ]);

    return registration;
}

/**
 * プッシュ通知の購読を取得
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
    if (!isPushNotificationSupported()) {
        return null;
    }

    const registration = await getServiceWorkerRegistration();
    return await registration.pushManager.getSubscription();
}

/**
 * プッシュ通知を購読
 */
export async function subscribeToPush(): Promise<PushSubscription> {
    if (!isPushNotificationSupported()) {
        throw new Error('プッシュ通知はこのブラウザでサポートされていません');
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        throw new Error('通知の許可が得られませんでした');
    }

    const registration = await getServiceWorkerRegistration();

    // 既存のサブスクリプションがあればそれを返す
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        return existingSubscription;
    }

    // 新しいサブスクリプションを作成
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    return subscription;
}

/**
 * プッシュ通知の購読を解除
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    const subscription = await getPushSubscription();
    if (!subscription) {
        return true;
    }
    return await subscription.unsubscribe();
}

/**
 * PushSubscriptionをAPIに送信する形式に変換
 */
export function serializeSubscription(subscription: PushSubscription): {
    endpoint: string;
    p256dh: string;
    auth: string;
} {
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!key || !auth) {
        throw new Error('Invalid subscription keys');
    }

    return {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
    };
}
