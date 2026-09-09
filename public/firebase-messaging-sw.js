importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBZqPcQWVeWlpeLp-8kpHvSdzNlu-KMq74",
  authDomain: "ai-studio-applet-webapp-e4b98.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-e4b98",
  storageBucket: "ai-studio-applet-webapp-e4b98.appspot.com",
  messagingSenderId: "434717289050",
  appId: "1:434717289050:web:c6612bdbfb1b4e8af04663"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
