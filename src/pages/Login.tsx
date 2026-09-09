import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { LogIn, AlertCircle } from 'lucide-react';
import { MithaqLogo } from '../components/MithaqLogo';

export function Login() {
  const { signInWithGoogle } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('লগইন পপআপ বাতিল করা হয়েছে। দয়া করে পপআপ অ্যালাউ করুন অথবা অ্যাপটি নতুন ট্যাবে ওপেন করুন।');
      } else {
        setErrorMsg('লগইন করতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center"
      >
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 p-2 mx-auto mb-6">
          <MithaqLogo className="w-full h-full drop-shadow-sm" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2 mt-2">
          <h1 className="text-3xl font-bold text-slate-800 font-serif" style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}>ميثاق</h1>
          <span className="text-slate-300 text-xl font-light">|</span>
          <h2 className="text-2xl font-bold font-sans text-primary-600">মিছাক</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">কমিউনিটি সেভিংস গ্রুপে স্বাগতম। দয়া করে আপনার গুগল একাউন্ট দিয়ে লগইন করুন।</p>
        
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-start text-left gap-2 border border-red-100">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3.5 rounded-xl transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          গুগল দিয়ে লগইন
        </button>
      </motion.div>
    </div>
  );
}
