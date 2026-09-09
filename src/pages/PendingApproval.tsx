import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function PendingApproval() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <Clock size={40} />
        </div>
        <h2 className="text-2xl font-bold font-heading text-slate-800 mb-3">অনুমোদনের অপেক্ষায়</h2>
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
          আপনার অ্যাকাউন্ট এডমিনের অনুমোদনের অপেক্ষায় আছে। অনুমোদন হলে আপনি জানতে পারবেন।
        </p>
        
        <button 
          onClick={logout}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors"
        >
          লগ আউট করুন
        </button>
      </motion.div>
    </div>
  );
}
