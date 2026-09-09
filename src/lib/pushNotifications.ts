import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging, db } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Public VAPID Key for Web Push (Optional but recommended, otherwise FCM uses default)
// For now, we will let Firebase handle it if no VAPID is provided, or the user can add it to config.

export const requestNotificationPermission = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.warn('Messaging not supported or initialized');
        return false;
      }
      
      const currentToken = await getToken(messaging, {
        // vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE'
      });
      
      if (currentToken) {
        // Save the token to the user's document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        console.log('FCM Token registered');
        return true;
      }
    }
  } catch (error) {
    console.error('An error occurred while requesting permission ', error);
  }
  return false;
};

export const setupForegroundListener = async () => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Received foreground message:', payload);
    if (payload.notification) {
      // For foreground, we can show a browser notification if permission is granted
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title || 'New Notification', {
          body: payload.notification.body,
          icon: '/icon.png'
        });
      }
    }
  });
};

export const sendNotification = async (tokens: string[], title: string, body: string, data?: any) => {
  if (!tokens || tokens.length === 0) return;
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens,
        title,
        body,
        data,
      }),
    });
    const result = await response.json();
    if (!result.success) {
      console.warn('Failed to send notification via backend:', result);
    }
  } catch (err) {
    console.error('Error calling send-notification api', err);
  }
};

import { collection, getDocs, query, where, getDoc } from 'firebase/firestore';

export const sendPushNotificationToUsers = async (userIds: string[], title: string, body: string, data?: any) => {
  try {
    const tokens: string[] = [];
    for (const uid of userIds) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          tokens.push(...userData.fcmTokens);
        }
      }
    }
    
    if (tokens.length > 0) {
      await sendNotification(tokens, title, body, data);
    }
  } catch (err) {
    console.error('Error in sendPushNotificationToUsers', err);
  }
};

export const sendPushNotificationToAll = async (title: string, body: string, data?: any) => {
  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), where('status', '==', 'active')));
    const tokens: string[] = [];
    
    usersSnap.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        tokens.push(...userData.fcmTokens);
      }
    });

    if (tokens.length > 0) {
      await sendNotification(tokens, title, body, data);
    }
  } catch (err) {
    console.error('Error in sendPushNotificationToAll', err);
  }
};
