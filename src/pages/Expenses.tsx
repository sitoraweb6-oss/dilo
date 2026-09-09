import React from "react";
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Plus, Receipt, X, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sendPushNotificationToAll } from '../lib/pushNotifications';
import { motion, AnimatePresence } from 'motion/react';

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  loggedBy: string;
  loggedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: any;
  createdAt: any;
}

export function Expenses() {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    getDocs(q).then((snap) => {
      if (isMounted) setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description.trim() || !userProfile) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'expenses'), {
        amount: Number(amount),
        description,
        date,
        loggedBy: userProfile.id,
        loggedByName: userProfile.displayName,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'activityLog'), {
        description: `${userProfile.displayName} ৳${amount} এর একটি খরচের হিসাব জমা দিয়েছেন`,
        timestamp: serverTimestamp(),
      });
      setIsAdding(false);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error(error);
      alert('খরচ জমা দিতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (expense: Expense) => {
    if (processingId) return;
    try {
      setProcessingId(expense.id);
      await updateDoc(doc(db, 'expenses', expense.id), {
        status: 'approved',
        approvedBy: userProfile?.id,
        approvedByName: userProfile?.displayName,
        approvedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'activityLog'), {
        description: `${userProfile?.displayName} ৳${expense.amount} এর খরচটি অনুমোদন করেছেন`,
        timestamp: serverTimestamp(),
      });
      
      // Optimistic UI update
      setExpenses(expenses.map(e => 
        e.id === expense.id ? { ...e, status: 'approved' } : e
      ));

      // Send Push Notification
      await sendPushNotificationToAll('📊 নতুন হিসাব প্রকাশিত হয়েছে', 'সর্বশেষ হিসাব এখন দেখা যাচ্ছে।');
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (expense: Expense) => {
    if (processingId) return;
    try {
      setProcessingId(expense.id);
      await updateDoc(doc(db, 'expenses', expense.id), {
        status: 'rejected',
        approvedBy: userProfile?.id,
        approvedByName: userProfile?.displayName,
        approvedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'activityLog'), {
        description: `${userProfile?.displayName} ৳${expense.amount} এর খরচটি বাতিল করেছেন`,
        timestamp: serverTimestamp(),
      });

      // Optimistic UI update
      setExpenses(expenses.map(e => 
        e.id === expense.id ? { ...e, status: 'rejected' } : e
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={20} className="text-primary-500" />
            খরচের হিসাব
          </h1>
        </div>
        {isAdmin && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-primary-200 transition-colors"
          >
            <Plus size={16} />
            নতুন খরচ
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <AnimatePresence>
          {isAdding && isAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700">নতুন খরচের বিবরণ</h3>
                  <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">পরিমাণ (৳)</label>
                    <input 
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-primary-500"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">বিবরণ</label>
                    <input 
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">তারিখ</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={loading || !amount || !description.trim()}
                  className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'জমা হচ্ছে...' : 'খরচ জমা দিন'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Receipt className="mx-auto mb-2 opacity-50" size={32} />
              <p>কোনো খরচের হিসাব নেই</p>
            </div>
          ) : (
            expenses.map(expense => {
              const isMine = expense.loggedBy === userProfile?.id;
              return (
                <div key={expense.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{expense.description}</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      {format(new Date(expense.date), 'dd MMM yyyy')} • জমা দিয়েছেন: {expense.loggedByName}
                    </p>
                    
                    <div className="mt-2">
                      {expense.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                          <CheckCircle2 size={12} /> অনুমোদিত ({expense.approvedByName})
                        </span>
                      )}
                      {expense.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-md">
                          <XCircle size={12} /> বাতিল ({expense.approvedByName})
                        </span>
                      )}
                      {expense.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                          পেন্ডিং
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-lg text-slate-800">৳{expense.amount}</span>
                    
                    {expense.status === 'pending' && isAdmin && !isMine && (
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(expense)} disabled={processingId === expense.id} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                          <X size={16} />
                        </button>
                        <button onClick={() => handleApprove(expense)} disabled={processingId === expense.id} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
