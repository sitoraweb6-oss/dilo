import { NotificationPrompt } from './components/NotificationPrompt';
import { setupForegroundListener } from './lib/pushNotifications';
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { VerifyPin } from './pages/VerifyPin';
import { Dashboard } from './pages/Dashboard';
import { PendingApproval } from './pages/PendingApproval';
import { Rejected } from './pages/Rejected';
import { Investments } from './pages/Investments';
import { CommunityChat } from './pages/CommunityChat';
import { AdminSupport } from './pages/AdminSupport';
import { Expenses } from './pages/Expenses';
import { ManageMembers } from './pages/ManageMembers';
import { Polls } from './pages/Polls';
import { ActivityHistory } from './pages/ActivityHistory';
import { ManageCarousel } from './pages/ManageCarousel';
import { ManageHadith } from './pages/ManageHadith';
import { AdminPaymentSettings } from './pages/AdminPaymentSettings';
import { AccountRecovery } from './pages/AccountRecovery';
import { AccountMigration } from './pages/AccountMigration';
import { LoadingScreen } from './components/LoadingScreen';
import { MobileNumberCollection } from './components/MobileNumberCollection';
import { useState } from 'react';
import { CoreAttribution } from './components/core-attribution';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const { firebaseUser, userProfile, loading, pinVerified, logout } = useAuth();
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleError = (e: any) => {
      if (e.message?.includes('Quota limit exceeded') || e.message?.includes('resource-exhausted') || (e.reason && (e.reason.message?.includes('Quota limit exceeded') || e.reason.message?.includes('resource-exhausted')))) {
        setQuotaExceeded(true);
        e.preventDefault();
      }
    };
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    window.addEventListener('quota_exceeded', handleQuota);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('quota_exceeded', handleQuota);
    };
  }, []);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(true);

  useEffect(() => {
    setupForegroundListener();
  }, []);

  if (showLoadingAnimation) {
    return <LoadingScreen isFirebaseLoaded={!loading} onAnimationComplete={() => setShowLoadingAnimation(false)} />;
  }

  if (loading) {
    return null;
  }
  if (!firebaseUser) {
    return <Login />;
  }
  if (!userProfile) {
    return <Onboarding />;
  }
  if (userProfile.status === 'pending_approval') {
    return <PendingApproval />;
  }
  if (userProfile.status === 'rejected') {
    return <Rejected />;
  }
    if (userProfile.status === 'migrated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <AlertTriangle className="text-amber-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Migrated</h1>
        <p className="text-slate-600 max-w-md">
          এই অ্যাকাউন্টটি নতুন অ্যাকাউন্টে মাইগ্রেট করা হয়েছে।
        </p>
        <button onClick={logout} className="mt-6 px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold">
          লগআউট করুন
        </button>
      </div>
    );
  }
if (!pinVerified) {
    return <VerifyPin />;
  }

  if (userProfile.status === 'active' && (!userProfile.personalMobile || userProfile.personalMobile.trim() === '')) {
    return <MobileNumberCollection />;
  }

  if (quotaExceeded) {
    return (
      <CoreAttribution>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Database Quota Exceeded</h1>
          <p className="text-slate-600 max-w-md">
            The free daily limit for database operations has been reached. Please try again tomorrow when the quota resets.
          </p>
        </div>
      </CoreAttribution>
    );
  }

  return (
    <CoreAttribution>

      <NotificationPrompt />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<CommunityChat />} />
        <Route path="/support" element={<AdminSupport />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/manage-members" element={<ManageMembers />} />
        <Route path="/polls" element={<Polls />} />
        <Route path="/manage-carousel" element={<ManageCarousel />} />
        <Route path="/manage-hadith" element={<ManageHadith />} />
        <Route path="/payment-settings" element={<AdminPaymentSettings />} />
        <Route path="/account-recovery" element={<AccountRecovery />} />
        <Route path="/account-migration" element={<AccountMigration />} />
        <Route path="/activities" element={<ActivityHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CoreAttribution>
  );
}
