import React from "react";
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { PinEntry } from '../components/PinEntry';
import { hashPin } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

export function Onboarding() {
  const { firebaseUser, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [personalMobile, setPersonalMobile] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([{ id: crypto.randomUUID(), label: 'নিজস্ব' }]);
  
  const handleAddSlot = () => {
    setSlots([...slots, { id: crypto.randomUUID(), label: `স্লট ${slots.length + 1}` }]);
  };

  const handleRemoveSlot = (id: string) => {
    if (slots.length > 1) {
      setSlots(slots.filter(s => s.id !== id));
    }
  };

  const handleSlotLabelChange = (id: string, label: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, label } : s));
  };

  const validateMobile = (mobile: string) => {
    return /^01\d{9}$/.test(mobile);
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !slots.every(s => s.label.trim())) return;

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
      const q = query(collection(db, 'users'), where('personalMobile', '==', personalMobile));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setError('এই মোবাইল নম্বরটি ইতোমধ্যে অন্য একটি অ্যাকাউন্টে ব্যবহৃত হয়েছে।');
        setLoading(false);
        return;
      }
      setStep(2);
    } catch (e) {
      console.error(e);
      setError('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSet = async (confirmPin: string) => {
    // Save everything to Firestore
    if (!firebaseUser) return;
    
    const pinHash = await hashPin(confirmPin);
    const currentMonthString = format(new Date(), 'yyyy-MM');
    const names = slots.map(s => ({
      nameId: s.id,
      label: s.label,
      monthlyDue: 1000,
      activeFromMonth: currentMonthString
    }));

    // Create public profile
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      displayName,
      photoURL: firebaseUser.photoURL || '',
      role: 'member',
      names,
      createdAt: serverTimestamp(),
      status: 'pending_approval',
      personalMobile,
      emergencyContactMobile: emergencyMobile || null,
      emergencyContactName: emergencyName || null
    });

    // Create private profile
    await setDoc(doc(db, 'usersPrivate', firebaseUser.uid), {
      email: firebaseUser.email || '',
      pinHash
    });

    await refreshProfile();
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full max-w-md"
        >
          <h2 className="text-2xl font-heading font-bold text-primary-700 mb-6">প্রোফাইল সেটআপ</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">আপনার নাম</label>
              <input 
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                placeholder="আপনার পূর্ণ নাম"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ব্যক্তিগত মোবাইল নম্বর <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                maxLength={11}
                value={personalMobile}
                onChange={(e) => setPersonalMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                জরুরি যোগাযোগের মোবাইল নম্বর (ঐচ্ছিক)
              </label>
              <input 
                type="text"
                maxLength={11}
                value={emergencyMobile}
                onChange={(e) => setEmergencyMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                জরুরি যোগাযোগের ব্যক্তির নাম (ঐচ্ছিক)
              </label>
              <input 
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                placeholder="উদা: বাবা / মা / ভাই"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">নামের স্লট (প্রতিটি স্লট = ১০০০ ৳/মাস)</label>
              <div className="space-y-3">
                {slots.map((slot, index) => (
                  <div key={slot.id} className="flex gap-2 items-center">
                    <input 
                      type="text"
                      required
                      value={slot.label}
                      onChange={(e) => handleSlotLabelChange(slot.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                      placeholder={`স্লট ${index + 1} এর নাম`}
                    />
                    {slots.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button 
                type="button"
                onClick={handleAddSlot}
                className="mt-3 text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700 transition-colors"
              >
                <Plus size={18} /> আরো স্লট যোগ করুন
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'অপেক্ষা করুন...' : 'পরবর্তী ধাপ'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <PinEntry 
        isSetup 
        onSuccess={handlePinSet} 
        title="নতুন পিন সেট করুন" 
        subtitle="অ্যাপে প্রবেশের জন্য ৪-ডিজিটের পিন দিন"
      />
    </div>
  );
}
