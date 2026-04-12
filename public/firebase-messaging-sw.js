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
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Broadcast background messages to all open tabs so they can update their UI
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'firebase-messaging-sw-message',
          payload: payload
        });
      });
    });
  });
} catch (error) {
  console.log('[sw] Firebase init failed', error);
}
