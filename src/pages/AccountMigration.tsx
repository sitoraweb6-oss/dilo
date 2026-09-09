import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { ArrowLeft, Search, User, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { getMemberSlotSummary } from '../lib/paymentUtils';

export function AccountMigration() {
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  const [searchOld, setSearchOld] = useState('');
  const [searchNew, setSearchNew] = useState('');
  
  const [selectedOld, setSelectedOld] = useState<UserProfile | null>(null);
  const [selectedNew, setSelectedNew] = useState<UserProfile | null>(null);
  
  const [migrationType, setMigrationType] = useState<'copy' | 'transfer'>('transfer');
  const [reason, setReason] = useState('');
  
  useEffect(() => {
    if (!isAdmin || userProfile?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
      
      const pSnap = await getDocs(collection(db, 'payments'));
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();
  }, [isAdmin, userProfile, navigate]);

  const filteredOld = allUsers.filter(u => 
    u.id !== selectedNew?.id && 
    (u.displayName?.toLowerCase().includes(searchOld.toLowerCase()) || u.personalMobile?.includes(searchOld))
  ).slice(0, 5);

  const filteredNew = allUsers.filter(u => 
    u.id !== selectedOld?.id && 
    (u.displayName?.toLowerCase().includes(searchNew.toLowerCase()) || u.personalMobile?.includes(searchNew))
  ).slice(0, 5);

  const handleSubmit = async () => {
    if (!selectedOld || !selectedNew || !migrationType || !reason.trim() || !userProfile) {
      setError('সব ফিল্ড পূরণ করুন');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Duplicate check
      const checkQ = query(
        collection(db, 'adminRequests'), 
        where('targetUserId', '==', selectedOld.id), 
        where('status', '==', 'PENDING'),
        where('requestType', '==', 'ACCOUNT_MIGRATION')
      );
      const checkSnap = await getDocs(checkQ);
      if (!checkSnap.empty) {
        throw new Error('এই পুরোনো অ্যাকাউন্টের জন্য ইতিমধ্যে একটি মাইগ্রেশন প্রক্রিয়াধীন আছে।');
      }

      // Calculate stats for old account
      const oldStats = {
        slots: selectedOld.names?.length || 0,
        slotNames: selectedOld.names?.map(n => n.label) || [],
        monthlyDue: (selectedOld.names?.length || 0) * 1000,
        paidTotal: payments.filter(p => p.userId === selectedOld.id && p.status === 'approved').reduce((sum, p) => sum + p.amount, 0),
        advanceTotal: 0,
        due: 0,
        paymentCount: payments.filter(p => p.userId === selectedOld.id).length,
        fundOwnership: payments.filter(p => p.userId === selectedOld.id && p.status === 'approved').reduce((sum, p) => sum + p.amount, 0)
      };

      await addDoc(collection(db, 'adminRequests'), {
        requestType: 'ACCOUNT_MIGRATION',
        status: 'PENDING',
        requestedBy: userProfile.id,
        requestedByName: userProfile.displayName,
        targetUserId: selectedOld.id,
        targetUserName: selectedOld.displayName,
        createdAt: serverTimestamp(),
        metadata: {
          destinationUserId: selectedNew.id,
          destinationUserName: selectedNew.displayName,
          migrationType,
          reason,
          snapshot: {
            sourceName: selectedOld.displayName,
            sourceMobile: selectedOld.personalMobile || '',
            sourceSlots: oldStats.slots,
            sourceSlotNames: oldStats.slotNames,
            sourceMonthlyDue: oldStats.monthlyDue,
            sourcePaidTotal: oldStats.paidTotal,
            sourceAdvanceTotal: oldStats.advanceTotal,
            sourceDue: oldStats.due,
            sourcePaymentCount: oldStats.paymentCount,
            sourceFundOwnership: oldStats.fundOwnership,
            destName: selectedNew.displayName,
            destMobile: selectedNew.personalMobile || ''
          }
        }
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'এরর');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="w-20 h-20 text-emerald-500 mb-4 mx-auto" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">আবেদন জমা হয়েছে</h1>
        <p className="text-slate-600 mb-6 max-w-sm">
          অ্যাকাউন্ট মাইগ্রেশনের আবেদন সফলভাবে তৈরি হয়েছে। অন্য অ্যাডমিনের অনুমোদনের জন্য অপেক্ষমাণ।
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold">
          ড্যাশবোর্ডে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-lg text-slate-800">অ্যাকাউন্ট মাইগ্রেশন (Super Admin)</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-4">১. পুরোনো সদস্য নির্বাচন</h2>
          {!selectedOld ? (
            <div>
              <input 
                type="text" 
                placeholder="নাম বা মোবাইল..." 
                value={searchOld} 
                onChange={e => setSearchOld(e.target.value)}
                className="w-full border rounded-xl p-3 mb-2 focus:ring-2 focus:ring-primary-500"
              />
              {searchOld && filteredOld.map(u => (
                <div key={u.id} onClick={() => setSelectedOld(u)} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold">{u.displayName[0]}</div>
                  <div>
                    <div className="font-bold">{u.displayName}</div>
                    <div className="text-xs text-slate-500">{u.personalMobile}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-700">{selectedOld.displayName[0]}</div>
                <div>
                  <div className="font-bold text-indigo-900">{selectedOld.displayName}</div>
                  <div className="text-xs text-indigo-600">{selectedOld.personalMobile}</div>
                </div>
              </div>
              <button onClick={() => setSelectedOld(null)} className="text-sm text-indigo-600 underline">পরিবর্তন</button>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-4">২. নতুন সদস্য নির্বাচন</h2>
          {!selectedNew ? (
            <div>
              <input 
                type="text" 
                placeholder="নাম বা মোবাইল..." 
                value={searchNew} 
                onChange={e => setSearchNew(e.target.value)}
                className="w-full border rounded-xl p-3 mb-2 focus:ring-2 focus:ring-primary-500"
              />
              {searchNew && filteredNew.map(u => (
                <div key={u.id} onClick={() => setSelectedNew(u)} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold">{u.displayName[0]}</div>
                  <div>
                    <div className="font-bold">{u.displayName}</div>
                    <div className="text-xs text-slate-500">{u.personalMobile}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center font-bold text-emerald-700">{selectedNew.displayName[0]}</div>
                <div>
                  <div className="font-bold text-emerald-900">{selectedNew.displayName}</div>
                  <div className="text-xs text-emerald-600">{selectedNew.personalMobile}</div>
                </div>
              </div>
              <button onClick={() => setSelectedNew(null)} className="text-sm text-emerald-600 underline">পরিবর্তন</button>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-4">৩. মাইগ্রেশন টাইপ ও কারণ</h2>
          <select 
            value={migrationType} 
            onChange={(e) => setMigrationType(e.target.value as any)}
            className="w-full p-3 border rounded-xl mb-4 bg-slate-50 focus:ring-2 focus:ring-primary-500"
          >
            <option value="copy">Copy (উভয় অ্যাকাউন্ট সক্রিয় থাকবে)</option>
            <option value="transfer">Transfer (পুরোনো অ্যাকাউন্ট নিষ্ক্রিয় হবে)</option>
          </select>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="মাইগ্রেশনের কারণ লিখুন..."
            className="w-full p-3 border rounded-xl bg-slate-50 h-24 focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !selectedOld || !selectedNew || !reason.trim()}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          মাইগ্রেশন আবেদন জমা দিন
        </button>
      </main>
    </div>
  );
}
