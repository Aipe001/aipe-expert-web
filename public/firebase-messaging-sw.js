importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA38sb_Qi2BBthqL23APfY7Afc6JimNZ6c",
  authDomain: "aipe-edfeb.firebaseapp.com",
  projectId: "aipe-edfeb",
  messagingSenderId: "1032054778017",
  appId: "1:1032054778017:web:eae3e1de00ea2713faa8e0"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const data = payload.data || {};
    const type = data.type || 'general';

    // For incoming calls, show a high-priority notification that can wake the tab
    if (type === 'incoming_call' && !data.action) {
      const callerName = data.callerName || 'Someone';
      const callType = data.callType || 'audio';
      const title = callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Call';

      self.registration.showNotification(title, {
        body: `${callerName} is calling you`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `incoming-call-${data.bookingId}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: {
          type: 'incoming_call',
          bookingId: data.bookingId,
          url: `/chat/${data.bookingId}`,
        },
      });
      return;
    }

    // For call ended/cancelled/rejected, close the call notification
    if (type === 'call_ended' || type === 'incoming_call' && (data.action === 'ended' || data.action === 'cancelled' || data.action === 'rejected')) {
      self.registration.getNotifications({ tag: `incoming-call-${data.bookingId}` }).then(notifications => {
        notifications.forEach(n => n.close());
      });
      return;
    }

    // For other notifications, show a standard notification
    const notificationTitle = payload.notification?.title || data.title || 'New Notification';
    const notificationBody = payload.notification?.body || data.body || data.message || '';

    self.registration.showNotification(notificationTitle, {
      body: notificationBody,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: '/' },
    });
  });

  // Handle notification click
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: event.notification.data,
            });
            return;
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
    );
  });
} catch (error) {
  console.log('[sw] Firebase init failed', error);
}
