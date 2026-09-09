import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function ProfileChangeModal({ onClose }: { onClose: () => void }) {
  const { userProfile } = useAuth();
  
  const [requestedName, setRequestedName] = useState(userProfile?.displayName || '');
  const [requestedMobile, setRequestedMobile] = useState(userProfile?.personalMobile || '');
  const [requestedEmergencyName, setRequestedEmergencyName] = useState(userProfile?.emergencyContactName || '');
  const [requestedEmergencyMobile, setRequestedEmergencyMobile] = useState(userProfile?.emergencyContactMobile || '');
  
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateMobile = (mobile: string) => {
    return /^01\d{9}$/.test(mobile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    if (!requestedName.trim()) {
      setError('নাম খালি রাখা যাবে না');
      return;
    }

    if (!validateMobile(requestedMobile)) {
      setError('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }
    
    if (requestedEmergencyMobile && !validateMobile(requestedEmergencyMobile)) {
      setError('জরুরি যোগাযোগের জন্য সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন');
      return;
    }
    
    if (!reason.trim()) {
      setError('পরিবর্তনের কারণ উল্লেখ করুন');
      return;
    }

    // Check if nothing changed
    if (
      requestedName === userProfile.displayName && 
      requestedMobile === userProfile.personalMobile &&
      requestedEmergencyName === (userProfile.emergencyContactName || '') &&
      requestedEmergencyMobile === (userProfile.emergencyContactMobile || '')
    ) {
      setError('কোনো তথ্য পরিবর্তন করা হয়নি');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Duplicate check (1 read)
      const q = query(
        collection(db, 'profileChangeRequests'), 
        where('memberUid', '==', userProfile.id), 
        where('status', 'in', ['pending', 'level_1_approved'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError('আপনার একটি পরিবর্তনের আবেদন ইতোমধ্যে অপেক্ষমাণ রয়েছে।');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'profileChangeRequests'), {
        requestType: 'PROFILE_CHANGE',
        memberUid: userProfile.id,
        memberName: userProfile.displayName,
        currentName: userProfile.displayName,
        requestedName: requestedName !== userProfile.displayName ? requestedName : null,
        currentPersonalMobile: userProfile.personalMobile || '',
        requestedPersonalMobile: requestedMobile !== userProfile.personalMobile ? requestedMobile : null,
        currentEmergencyContactName: userProfile.emergencyContactName || '',
        requestedEmergencyContactName: requestedEmergencyName !== (userProfile.emergencyContactName || '') ? requestedEmergencyName : null,
        currentEmergencyContactNumber: userProfile.emergencyContactMobile || '',
        requestedEmergencyContactNumber: requestedEmergencyMobile !== (userProfile.emergencyContactMobile || '') ? requestedEmergencyMobile : null,
        reason,
        status: 'pending',
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activityLog'), {
        description: `${userProfile.displayName} প্রোফাইল পরিবর্তনের অনুরোধ করেছেন`,
        timestamp: serverTimestamp(),
      });

      alert('আপনার অনুরোধটি সফলভাবে পাঠানো হয়েছে। এডমিন প্যানেল থেকে অনুমোদনের পর পরিবর্তন কার্যকর হবে।');
      onClose();
    } catch (e) {
      console.error(e);
      setError('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden my-auto"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">প্রোফাইল পরিবর্তন অনুরোধ</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-sm text-blue-800">
            <strong>লক্ষ্য করুন:</strong> আপনার নাম বা মোবাইল নম্বর পরিবর্তন করতে এডমিনের অনুমোদনের প্রয়োজন। অনুরোধ সাবমিট করার পর ২ জন এডমিন অনুমোদন দিলে তা আপডেট হবে।
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                আপনার নাম
              </label>
              <input
                type="text"
                value={requestedName}
                onChange={(e) => setRequestedName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ব্যক্তিগত মোবাইল নম্বর <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={requestedMobile}
                onChange={(e) => setRequestedMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                placeholder="01XXXXXXXXX"
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                জরুরি যোগাযোগের মোবাইল নম্বর (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={requestedEmergencyMobile}
                onChange={(e) => setRequestedEmergencyMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                placeholder="01XXXXXXXXX"
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                জরুরি যোগাযোগের ব্যক্তির নাম (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={requestedEmergencyName}
                onChange={(e) => setRequestedEmergencyName(e.target.value)}
                placeholder="নাম লিখুন"
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                পরিবর্তনের কারণ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="কেন পরিবর্তন করতে চাচ্ছেন সংক্ষেপে লিখুন..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'সাবমিট করা হচ্ছে...' : 'অনুরোধ সাবমিট করুন'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
