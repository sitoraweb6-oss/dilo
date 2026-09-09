import React, { useState } from 'react';
import { UserProfile, PaymentSettings } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { X, Plus, Minus, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface Props {
  userProfile: UserProfile;
  settings: PaymentSettings;
  onClose: () => void;
}

export const SlotRequestModal: React.FC<Props> = ({ userProfile, settings, onClose }) => {
  const { userProfile: authUser } = useAuth();
  const [requestedSlots, setRequestedSlots] = useState(1);
  const [slotNames, setSlotNames] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCountChange = (newCount: number) => {
    if (newCount < 1) return;
    setRequestedSlots(newCount);
    setSlotNames(prev => {
      const next = [...prev];
      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) next.push('');
      } else {
        next.length = newCount;
      }
      return next;
    });
  };
  
  const currentSlotCount = userProfile.names.length;
  const currentMonthlyDue = currentSlotCount * (settings.monthlyFee || 1000);
  const newMonthlyDue = (currentSlotCount + requestedSlots) * (settings.monthlyFee || 1000);

  const handleSubmit = async () => {
    try {
      if (slotNames.some(n => !n.trim())) {
        alert('অনুগ্রহ করে প্রতিটি স্লটের নাম দিন।');
        return;
      }

      setIsSubmitting(true);
      
      // Check for existing pending request to avoid duplicates
      const pendingQuery = query(
        collection(db, 'adminRequests'),
        where('targetUserId', '==', userProfile.id),
        where('requestType', '==', 'SLOT_INCREASE'),
        where('status', 'in', ['PENDING', 'LEVEL_1_APPROVED'])
      );
      const pendingSnap = await getDocs(pendingQuery);
      
      if (!pendingSnap.empty) {
        alert('আপনার ইতোমধ্যেই একটি স্লট আবেদন অপেক্ষমাণ আছে। অনুগ্রহ করে সেটি অনুমোদনের জন্য অপেক্ষা করুন।');
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'adminRequests'), {
        requestType: 'SLOT_INCREASE',
        status: 'PENDING',
        requestedBy: userProfile.id,
        requestedByName: userProfile.displayName,
        targetUserId: userProfile.id,
        targetUserName: userProfile.displayName,
        createdAt: serverTimestamp(),
        metadata: {
          requestedSlotsCount: requestedSlots,
          requestedSlotNames: slotNames.map(n => n.trim()),
          monthlyDuePerSlot: settings.monthlyFee || 1000
        }
      });

      await addDoc(collection(db, 'activityLog'), {
        actorId: userProfile.id,
        action: 'SLOT_REQUEST',
        targetId: userProfile.id,
        description: `${userProfile.displayName} নতুন ${requestedSlots}টি স্লটের জন্য আবেদন করেছেন`,
        timestamp: serverTimestamp()
      });

      alert('আপনার নতুন স্লটের আবেদন সফলভাবে জমা হয়েছে। এডমিন অনুমোদনের পর এটি আপনার প্রোফাইলে যুক্ত হবে।');
      onClose();
    } catch (error) {
      console.error(error);
      alert('আবেদন জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-black font-heading text-slate-800">নতুন স্লটের আবেদন</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-sm font-bold text-indigo-900 mb-2">বর্তমান অবস্থা</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-indigo-700">বর্তমান স্লট সংখ্যা:</span>
              <span className="font-bold text-indigo-900">{currentSlotCount}টি</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-indigo-700">বর্তমান মোট মাসিক প্রদেয়:</span>
              <span className="font-bold text-indigo-900">৳{currentMonthlyDue}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800 mb-3">কয়টি নতুন স্লট যোগ করতে চান?</p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleCountChange(Math.max(1, requestedSlots - 1))}
                className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-700"
              >
                <Minus size={20} />
              </button>
              <div className="flex-1 text-center font-black text-3xl text-primary-600 font-heading">
                {requestedSlots}
              </div>
              <button 
                onClick={() => handleCountChange(requestedSlots + 1)}
                className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-700"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {Array.from({ length: requestedSlots }).map((_, i) => (
              <div key={i}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {requestedSlots > 1 ? `স্লট ${i + 1}-এর নাম *` : 'স্লটের নাম *'}
                </label>
                <input
                  type="text"
                  value={slotNames[i] || ''}
                  onChange={(e) => {
                    const newNames = [...slotNames];
                    newNames[i] = e.target.value;
                    setSlotNames(newNames);
                  }}
                  placeholder={`উদা: স্লট ${currentSlotCount + i + 1}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                  required
                />
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">প্রতি নতুন স্লটের মাসিক প্রদেয়:</span>
              <span className="font-bold text-slate-800">৳{settings.monthlyFee || 1000}</span>
            </div>
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">নতুন মোট স্লট সংখ্যা:</span>
              <span className="font-bold text-slate-800">{currentSlotCount + requestedSlots}টি</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-800 font-bold">নতুন মোট মাসিক প্রদেয়:</span>
              <span className="font-black text-primary-600 text-lg">৳{newMonthlyDue}</span>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary-600/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>জমা দেওয়া হচ্ছে...</span>
              </>
            ) : (
              <span>আবেদন জমা দিন</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
