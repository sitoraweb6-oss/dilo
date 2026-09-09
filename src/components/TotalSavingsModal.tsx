import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Payment } from '../types';
import { useAuth } from '../lib/AuthContext';

interface TotalSavingsModalProps {
  onClose: () => void;
}

export const TotalSavingsModal: React.FC<TotalSavingsModalProps> = ({ onClose }) => {
  const { userProfile } = useAuth();
  const [memberSavings, setMemberSavings] = useState<{name: string, saved: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [usersSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'payments'), where('status', '==', 'approved')))
        ]);
        
        if (!isMounted) return;
        
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
        const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
        
        const savings = users.map(user => {
          const userPayments = payments.filter(p => p.userId === user.id);
          const totalSaved = userPayments.reduce((sum, p) => sum + p.amount, 0);
          return {
            id: user.id,
            name: user.displayName,
            saved: totalSaved
          };
        });
        
        savings.sort((a, b) => {
          if (a.id === userProfile?.id) return -1;
          if (b.id === userProfile?.id) return 1;
          return b.saved - a.saved;
        });
        
        setMemberSavings(savings);
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [userProfile?.id]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full max-w-md h-[80vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-800 font-heading">সদস্যদের মোট সঞ্চয়</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-center text-slate-500 py-4 text-sm">লোড হচ্ছে...</p>
          ) : (
            memberSavings.map((ms, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700 text-sm">{i + 1}. {ms.name}</span>
                <span className="font-bold text-primary-600">৳{ms.saved.toLocaleString('en-IN')}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
