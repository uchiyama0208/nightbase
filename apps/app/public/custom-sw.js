// Custom Service Worker for Push Notifications

// プッシュ通知を受信したときのハンドラ
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    try {
        const data = event.data.json();
        const options = {
            body: data.body || '',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: data.tag || 'default',
            data: {
                url: data.url || '/app/dashboard',
            },
            vibrate: [200, 100, 200],
            requireInteraction: data.requireInteraction || false,
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Nightbase', options)
        );
    } catch (error) {
        console.error('Error showing notification:', error);
    }
});

// 通知をクリックしたときのハンドラ
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/app/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 既存のウィンドウがあればフォーカス
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // 既存のウィンドウがなければ新しいウィンドウを開く
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Service Worker がアクティブになったときのハンドラ
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
