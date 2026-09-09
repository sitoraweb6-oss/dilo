import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PinEntry } from '../components/PinEntry';
import { LogOut, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { PinRecoveryModal } from '../components/PinRecoveryModal';

export function VerifyPin() {
  const { firebaseUser, userProfile, setPinVerified, logout } = useAuth();
  const [expectedHash, setExpectedHash] = useState<string | null>(null);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  useEffect(() => {
    const fetchPin = async () => {
      if (firebaseUser) {
        const docRef = doc(db, 'usersPrivate', firebaseUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setExpectedHash(snap.data().pinHash);
        }
      }
    };
    fetchPin();
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    const lockKey = `pin_lock_${firebaseUser.uid}`;
    const lockData = localStorage.getItem(lockKey);
    if (lockData) {
      try {
        const parsed = JSON.parse(lockData);
        if (parsed.lockUntil && parsed.lockUntil > Date.now()) {
          setLockUntil(parsed.lockUntil);
          setFailedAttempts(parsed.failedAttempts || 0);
        } else if (parsed.failedAttempts) {
          setFailedAttempts(parsed.failedAttempts);
        }
      } catch (e) {}
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!lockUntil) return;
    
    const updateRemaining = () => {
      const now = Date.now();
      if (lockUntil > now) {
        setTimeRemaining(Math.ceil((lockUntil - now) / 1000));
      } else {
        setLockUntil(null);
        setTimeRemaining(0);
      }
    };
    
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const handleError = async () => {
    if (!firebaseUser) return;
    
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    
    const lockKey = `pin_lock_${firebaseUser.uid}`;
    let lockData: any = { failedAttempts: newAttempts };
    
    const existing = localStorage.getItem(lockKey);
    if (existing) {
        try { lockData = { ...JSON.parse(existing), failedAttempts: newAttempts }; } catch(e) {}
    }

    if (newAttempts % 5 === 0) {
      let lockMinutes = 5;
      if (newAttempts === 10) lockMinutes = 15;
      else if (newAttempts === 15) lockMinutes = 30;
      else if (newAttempts >= 20) lockMinutes = 60;
      
      const newLockUntil = Date.now() + lockMinutes * 60 * 1000;
      lockData.lockUntil = newLockUntil;
      setLockUntil(newLockUntil);

      if (newAttempts === 15 && !lockData.hasLogged15 && userProfile) {
        try {
          await addDoc(collection(db, 'activityLog'), {
            description: `⚠️ ${userProfile.displayName} ১৫ বার ধারাবাহিকভাবে ভুল PIN প্রদান করেছেন।`,
            memberUid: userProfile.id,
            memberName: userProfile.displayName,
            totalFailedAttempts: 15,
            timestamp: serverTimestamp()
          });
          lockData.hasLogged15 = true;
        } catch (e) {
          console.error('Failed to log activity', e);
        }
      }
    }
    
    localStorage.setItem(lockKey, JSON.stringify(lockData));
  };

  const handleSuccess = () => {
    if (firebaseUser) {
      localStorage.removeItem(`pin_lock_${firebaseUser.uid}`);
    }
    setPinVerified(true);
  };

  if (!expectedHash) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">লোড হচ্ছে...</div>;
  }

  if (lockUntil && timeRemaining > 0) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-red-100 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} />
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 mb-3">পিন লক করা হয়েছে</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            আপনি একাধিকবার ভুল PIN প্রদান করেছেন।<br/>অনুগ্রহ করে <span className="font-bold text-red-600">{minutes}:{seconds.toString().padStart(2, '0')}</span> মিনিট পরে আবার চেষ্টা করুন।
          </p>
          
          <div className="flex items-center justify-center gap-2 text-slate-500 bg-slate-50 py-3 px-4 rounded-xl text-sm font-medium">
            <Clock size={16} />
            <span>অপেক্ষা করুন...</span>
          </div>
        </motion.div>
        
        <button 
          onClick={logout}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">লগআউট</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
            <PinEntry 
        expectedPinHash={expectedHash} 
        onSuccess={handleSuccess} 
        onError={handleError}
      />
      <div className="mt-6 text-center z-10">
        <button 
          onClick={() => setShowRecoveryModal(true)}
          className="text-primary-600 font-medium hover:text-primary-700 transition-colors text-sm underline decoration-primary-300 underline-offset-4"
        >
          PIN ভুলে গেছেন?
        </button>
      </div>
      
      {showRecoveryModal && <PinRecoveryModal onClose={() => setShowRecoveryModal(false)} userProfile={userProfile} firebaseUser={firebaseUser} />}
      <button 
        onClick={logout}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
      >
        <LogOut size={20} />
        <span className="hidden sm:inline">লগআউট</span>
      </button>
    </div>
  );
}
