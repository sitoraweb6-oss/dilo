import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { PinEntry } from './PinEntry';
import { UserProfile } from '../types';

interface PinRecoveryModalProps {
  onClose: () => void;
  userProfile: UserProfile | null;
  firebaseUser: any;
}

export function PinRecoveryModal({ onClose, userProfile, firebaseUser }: PinRecoveryModalProps) {
  const [loading, setLoading] = useState(true);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userProfile) return;
    
    // Check if user is migrated
    if (userProfile.status === 'migrated' || userProfile.status === 'pending_deletion') {
      setError('আপনার অ্যাকাউন্টটি মাইগ্রেট করা হয়েছে। এই অ্যাকাউন্ট থেকে আবেদন করা সম্ভব নয়।');
      setLoading(false);
      return;
    }

    const checkExisting = async () => {
      try {
        const q = query(
          collection(db, 'adminRequests'),
          where('targetUserId', '==', userProfile.id),
          where('requestType', '==', 'PIN_RESET'),
          where('status', '==', 'PENDING')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setExistingRequest(snap.docs[0].data());
        }
      } catch (err) {
        console.error("Error checking existing request:", err);
      } finally {
        setLoading(false);
      }
    };
    checkExisting();
  }, [userProfile]);

  const handlePinSuccess = (pin: string) => {
    setNewPin(pin);
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    if (!userProfile || !newPin || submitting) return;
    setSubmitting(true);
    
    try {
      // Create hash of the new pin
      const encoder = new TextEncoder();
      const data = encoder.encode(newPin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Double check for duplicates
      const q = query(
        collection(db, 'adminRequests'),
        where('targetUserId', '==', userProfile.id),
        where('requestType', '==', 'PIN_RESET'),
        where('status', '==', 'PENDING')
      );
      const checkSnap = await getDocs(q);
      if (!checkSnap.empty) {
        throw new Error('আপনার একটি আবেদন ইতোমধ্যে পর্যালোচনাধীন আছে।');
      }

      await addDoc(collection(db, 'adminRequests'), {
        requestType: 'PIN_RESET',
        status: 'PENDING',
        requestedBy: userProfile.id,
        requestedByName: userProfile.displayName || '',
        targetUserId: userProfile.id,
        targetUserName: userProfile.displayName || '',
        createdAt: serverTimestamp(),
        metadata: {
          userMobile: userProfile.personalMobile || '',
          newPinHash: hashHex
        }
      });

      // Also log activity
      await addDoc(collection(db, 'activityLog'), {
        actorId: userProfile.id,
        action: 'PIN_RECOVERY_REQUESTED',
        targetId: userProfile.id,
        description: `সদস্য ${userProfile.displayName} PIN পরিবর্তনের আবেদন করেছেন।`,
        timestamp: serverTimestamp()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'আবেদন জমা দিতে সমস্যা হয়েছে।');
      setShowConfirm(false); // Go back to try again maybe, or just show error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="text-primary-500" />
              PIN পুনরুদ্ধার
            </h2>
            <button 
              onClick={onClose}
              disabled={submitting}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">লোড হচ্ছে...</div>
          ) : error && !existingRequest ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-700">{error}</p>
            </div>
          ) : success ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">আবেদন জমা হয়েছে</h3>
              <p className="text-slate-600 text-sm">
                আপনার PIN পরিবর্তনের আবেদন সফলভাবে জমা হয়েছে। Admin-এর অনুমোদনের অপেক্ষায় আছে।
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          ) : existingRequest ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock size={32} />
              </div>
              <p className="text-slate-700 font-medium">
                আপনার PIN পরিবর্তনের একটি আবেদন ইতোমধ্যে পর্যালোচনাধীন।
              </p>
              <p className="text-slate-500 text-sm">
                দয়া করে Admin-এর অনুমোদনের জন্য অপেক্ষা করুন।
              </p>
            </div>
          ) : showConfirm ? (
            <div className="py-6 space-y-6">
              <div className="bg-primary-50 text-primary-800 p-4 rounded-xl border border-primary-100">
                <p className="text-center font-medium">আপনি কি এই নতুন PIN সেট করার জন্য আবেদন করতে চান?</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {submitting ? 'অপেক্ষা করুন...' : 'আবেদন জমা দিন'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pb-4">
              <p className="text-sm text-slate-600 mb-6 text-center">
                আপনার PIN ভুলে গেলে নতুন PIN সেট করার জন্য আবেদন করতে পারেন। আবেদনটি একজন অনুমোদিত Admin যাচাই করে অনুমোদন করবেন।
              </p>
              <div className="scale-90 origin-top transform-gpu">
                <PinEntry 
                  isSetup={true} 
                  onSuccess={handlePinSuccess}
                  title="নতুন PIN"
                  subtitle="আপনার নতুন ৪-ডিজিটের পিন দিন"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
