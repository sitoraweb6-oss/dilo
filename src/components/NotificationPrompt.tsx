import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission } from '../lib/pushNotifications';
import { useAuth } from '../lib/AuthContext';

export function NotificationPrompt() {
  const { userProfile } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if user is logged in
    if (!userProfile) return;
    
    // Check if notifications are supported
    if (!('Notification' in window)) return;
    
    // Check current permission
    if (Notification.permission === 'granted') {
      // Silently refresh token
      requestNotificationPermission(userProfile.id);
      return;
    }
    if (Notification.permission === 'denied') {
      return;
    }
    
    // Check if we already asked in this session
    const hasAsked = sessionStorage.getItem('notificationPromptDismissed');
    if (!hasAsked) {
      // Small delay so it doesn't pop up immediately
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userProfile]);

  const handleAccept = async () => {
    setShow(false);
    sessionStorage.setItem('notificationPromptDismissed', 'true');
    if (userProfile) {
      await requestNotificationPermission(userProfile.id);
    }
  };

  const handleDecline = () => {
    setShow(false);
    sessionStorage.setItem('notificationPromptDismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          <div className="p-5 flex gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 text-primary-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-800 mb-1">🔔 নোটিফিকেশন চালু করুন</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                মীসাকের গুরুত্বপূর্ণ আপডেট, নতুন নোটিশ, নতুন ভোট, সদস্যপদ অনুমোদন, জমা অনুমোদন এবং হিসাব প্রকাশের নোটিফিকেশন পেতে অনুগ্রহ করে নোটিফিকেশন চালু করুন।
              </p>
            </div>
            <button onClick={handleDecline} className="text-slate-400 hover:text-slate-600 self-start">
              <X size={18} />
            </button>
          </div>
          <div className="flex border-t border-slate-100 divide-x divide-slate-100">
            <button
              onClick={handleDecline}
              className="flex-1 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              এখন নয়
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-3 text-xs font-bold text-primary-600 hover:bg-primary-50 transition-colors"
            >
              নোটিফিকেশন চালু করুন
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
