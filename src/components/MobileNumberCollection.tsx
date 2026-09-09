import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { Phone, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

export function MobileNumberCollection() {
  const { userProfile, updateUserProfileLocal } = useAuth();
  const [personalMobile, setPersonalMobile] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateMobile = (mobile: string) => {
    return /^01\d{9}$/.test(mobile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    if (!validateMobile(personalMobile)) {
      setError('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }
    
    if (emergencyMobile && !validateMobile(emergencyMobile)) {
      setError('সঠিক ১১ সংখ্যার জরুরি মোবাইল নম্বর দিন');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if personal mobile is unique
      const q = query(collection(db, 'users'), where('personalMobile', '==', personalMobile));
      const snap = await getDocs(q);
      
      // If someone else has this number
      if (!snap.empty) {
        const otherUser = snap.docs.find(d => d.id !== userProfile.id);
        if (otherUser) {
          setError('এই মোবাইল নম্বরটি ইতোমধ্যে অন্য একটি অ্যাকাউন্টে ব্যবহৃত হয়েছে।');
          setLoading(false);
          return;
        }
      }

      // Update document
      await updateDoc(doc(db, 'users', userProfile.id), {
        personalMobile,
        emergencyContactMobile: emergencyMobile || null,
        emergencyContactName: emergencyName || null
      });

      // Update local React state immediately (Optimistic UI update)
      updateUserProfileLocal({
        personalMobile,
        emergencyContactMobile: emergencyMobile || undefined,
        emergencyContactName: emergencyName || undefined
      });
    } catch (e) {
      console.error(e);
      setError('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8"
      >
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Phone className="w-8 h-8 text-blue-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">আপনার মোবাইল নম্বর যুক্ত করা হয়নি</h2>
        <p className="text-slate-500 text-center text-sm mb-8">
          অনুগ্রহ করে আপনার ১১ সংখ্যার ব্যক্তিগত মোবাইল নম্বর প্রদান করুন।
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              ব্যক্তিগত মোবাইল নম্বর <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={personalMobile}
              onChange={(e) => setPersonalMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="01XXXXXXXXX"
              maxLength={11}
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
              value={emergencyMobile}
              onChange={(e) => setEmergencyMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="01XXXXXXXXX"
              maxLength={11}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              জরুরি যোগাযোগের ব্যক্তির নাম (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="উদা: বাবা / মা / ভাই"
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || personalMobile.length !== 11}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors mt-8"
          >
            {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
