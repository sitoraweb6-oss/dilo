const fs = require('fs');

const content = `
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ShieldCheck, AlertCircle, Copy, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, Payment } from '../types';

export function AccountMigration() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedOldAccount, setSelectedOldAccount] = useState<UserProfile | null>(null);
  const [migrationType, setMigrationType] = useState<'copy' | 'transfer' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [oldAccountStats, setOldAccountStats] = useState({
    slots: 0,
    slotNames: [] as string[],
    monthlyDue: 0,
    paidTotal: 0,
    advanceTotal: 0,
    due: 0,
    paymentCount: 0,
    fundOwnership: 0,
  });

  const [existingRequest, setExistingRequest] = useState<any>(null);

  useEffect(() => {
    // Check if user already has a pending migration request
    if (!userProfile) return;
    const checkExisting = async () => {
      const q = query(
        collection(db, 'accountMigrations'),
        where('destinationUserId', '==', userProfile.id),
        where('status', 'in', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PROCESSING'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setExistingRequest(snap.docs[0].data());
      }
    };
    checkExisting();
  }, [userProfile]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Basic search: fetch active/inactive users and filter by name or mobile locally
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const allUsers = snap.docs.map(d => d.data() as UserProfile);
      
      const term = searchQuery.toLowerCase();
      const results = allUsers.filter(u => 
        u.id !== userProfile?.id && 
        u.status !== 'migrated' &&
        u.status !== 'pending_deletion' &&
        (
          u.displayName?.toLowerCase().includes(term) || 
          u.personalMobile?.includes(term) ||
          u.emergencyContactMobile?.includes(term)
        )
      );
      
      setSearchResults(results);
      if (results.length === 0) {
        setError('কোনো অ্যাকাউন্ট পাওয়া যায়নি।');
      }
    } catch (err) {
      console.error(err);
      setError('অনুসন্ধান করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (user: UserProfile) => {
    setSelectedOldAccount(user);
    setSearchResults([]);
    setSearchQuery('');
    
    // Fetch stats for preview
    setLoading(true);
    try {
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', user.id), where('status', '==', 'approved')));
      const payments = paymentsSnap.docs.map(d => d.data() as Payment);
      
      const slots = user.names?.length || 0;
      const slotNames = user.names?.map(n => n.label) || [];
      const monthlyDue = user.names?.reduce((sum, n) => sum + (n.monthlyDue || 0), 0) || 0;
      
      let paidTotal = 0;
      let advanceTotal = 0;
      payments.forEach(p => {
        if (p.paymentType === 'advance') advanceTotal += p.amount;
        else paidTotal += p.amount;
      });
      
      setOldAccountStats({
        slots,
        slotNames,
        monthlyDue,
        paidTotal,
        advanceTotal,
        due: 0, // Simplified due calculation for preview
        paymentCount: payments.length,
        fundOwnership: paidTotal + advanceTotal,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOldAccount || !migrationType || !reason.trim() || !userProfile) return;
    setLoading(true);
    try {
      // Final check for duplicates
      const checkQ = query(collection(db, 'accountMigrations'), where('sourceUserId', '==', selectedOldAccount.id), where('status', 'in', ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING']));
      const checkSnap = await getDocs(checkQ);
      if (!checkSnap.empty) {
        throw new Error('এই পুরোনো অ্যাকাউন্টের জন্য ইতিমধ্যে একটি মাইগ্রেশন প্রক্রিয়াধীন আছে।');
      }

      await addDoc(collection(db, 'accountMigrations'), {
        sourceUserId: selectedOldAccount.id,
        destinationUserId: userProfile.id,
        migrationType,
        status: 'SUBMITTED',
        reason,
        requestedBy: userProfile.id,
        requestedAt: serverTimestamp(),
        snapshot: {
          sourceName: selectedOldAccount.displayName,
          sourceMobile: selectedOldAccount.personalMobile || '',
          sourceSlots: oldAccountStats.slots,
          sourceSlotNames: oldAccountStats.slotNames,
          sourceMonthlyDue: oldAccountStats.monthlyDue,
          sourcePaidTotal: oldAccountStats.paidTotal,
          sourceAdvanceTotal: oldAccountStats.advanceTotal,
          sourceDue: oldAccountStats.due,
          sourcePaymentCount: oldAccountStats.paymentCount,
          sourceFundOwnership: oldAccountStats.fundOwnership,
          sourceCreatedAt: selectedOldAccount.createdAt,
          destName: userProfile.displayName,
          destMobile: userProfile.personalMobile || '',
          destCreatedAt: userProfile.createdAt,
        }
      });
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'মাইগ্রেশন রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (success || existingRequest) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="w-20 h-20 text-emerald-500 mb-4 mx-auto" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">আপনার অ্যাকাউন্ট মাইগ্রেশনের আবেদন পর্যালোচনাধীন।</h1>
        <p className="text-slate-600 mb-6 max-w-sm">
          আপনার আবেদনটি অ্যাডমিনদের কাছে পাঠানো হয়েছে। অনুগ্রহ করে অনুমোদনের জন্য অপেক্ষা করুন।
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold">
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
          <h1 className="font-bold text-lg text-slate-800">অ্যাকাউন্ট মাইগ্রেশন</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!selectedOldAccount ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 mb-1">পুরোনো অ্যাকাউন্ট খুঁজুন</h2>
            <p className="text-xs text-slate-500 mb-4">আপনার আগের অ্যাকাউন্টের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন</p>
            
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="নাম বা মোবাইল নম্বর..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'খুঁজছে...' : 'খুঁজুন'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">ফলাফল</h3>
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{user.displayName}</p>
                      <p className="text-xs text-slate-500">{user.personalMobile || 'মোবাইল নম্বর নেই'}</p>
                    </div>
                    <button 
                      onClick={() => handleSelect(user)}
                      className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg"
                    >
                      নির্বাচন করুন
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold text-slate-800">মাইগ্রেশন প্রিভিউ</h2>
                <button onClick={() => setSelectedOldAccount(null)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">পরিবর্তন করুন</button>
              </div>

              <div className="grid grid-cols-2 gap-4 relative">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">পুরোনো অ্যাকাউন্ট</p>
                  <p className="font-bold text-slate-800 text-sm mb-0.5">{selectedOldAccount.displayName}</p>
                  <p className="text-xs text-slate-500 mb-3">{selectedOldAccount.personalMobile}</p>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">স্লট:</span><span className="font-bold">{oldAccountStats.slots}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">মাসিক প্রদেয়:</span><span className="font-bold">৳{oldAccountStats.monthlyDue}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">মোট জমা:</span><span className="font-bold text-emerald-600">৳{oldAccountStats.paidTotal}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">অগ্রিম:</span><span className="font-bold">৳{oldAccountStats.advanceTotal}</span></div>
                  </div>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-slate-200 shadow-sm z-10">
                  <ArrowRightLeft size={16} className="text-slate-400" />
                </div>

                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">নতুন অ্যাকাউন্ট</p>
                  <p className="font-bold text-indigo-900 text-sm mb-0.5">{userProfile?.displayName}</p>
                  <p className="text-xs text-indigo-600 mb-3">{userProfile?.personalMobile || 'বর্তমান অ্যাকাউন্ট'}</p>
                  
                  <div className="space-y-1 text-xs opacity-70">
                    <p className="italic text-indigo-600/70">এই অ্যাকাউন্টে তথ্য যুক্ত হবে</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-3">মাইগ্রেশন পদ্ধতি</h2>
              <div className="space-y-3">
                <label className={\`block border rounded-xl p-4 cursor-pointer transition-all \${migrationType === 'copy' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200'}\`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <input type="radio" name="migrationType" value="copy" checked={migrationType === 'copy'} onChange={() => setMigrationType('copy')} className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5"><Copy size={16} className="text-indigo-500"/> Copy (কপি)</h3>
                      <p className="text-xs text-slate-600 mt-1">পুরোনো অ্যাকাউন্টের তথ্য নতুন অ্যাকাউন্টে কপি হবে। পুরোনো অ্যাকাউন্ট সক্রিয় থাকবে।</p>
                    </div>
                  </div>
                </label>

                <label className={\`block border rounded-xl p-4 cursor-pointer transition-all \${migrationType === 'transfer' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-200'}\`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <input type="radio" name="migrationType" value="transfer" checked={migrationType === 'transfer'} onChange={() => setMigrationType('transfer')} className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5"><ArrowRightLeft size={16} className="text-emerald-500"/> Transfer (স্থানান্তর)</h3>
                      <p className="text-xs text-slate-600 mt-1">পুরোনো অ্যাকাউন্টের তথ্য ও আর্থিক সম্পর্ক নতুন অ্যাকাউন্টে স্থানান্তর হবে। পুরোনো অ্যাকাউন্ট মাইগ্রেটেড/বন্ধ হবে।</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-1">কারণ</h2>
              <p className="text-xs text-slate-500 mb-3">কেন আপনি এই অ্যাকাউন্টটি মাইগ্রেট করতে চাচ্ছেন?</p>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="যেমন: পুরোনো জিমেইল হারিয়ে গেছে..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 min-h-[100px] resize-none"
              />
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading || !migrationType || !reason.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'প্রক্রিয়াধীন...' : 'মাইগ্রেশন আবেদন জমা দিন'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
`;
fs.writeFileSync('src/pages/AccountMigration.tsx', content);
console.log('AccountMigration.tsx generated.');
