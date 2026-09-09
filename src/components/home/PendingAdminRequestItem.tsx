import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, addDoc, serverTimestamp, runTransaction, collection } from 'firebase/firestore';
import { AdminRequest, UserProfile } from '../../types';
import { CheckCircle2, XCircle, AlertCircle, Layers, ShieldCheck, UserX, AlertTriangle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { sendPushNotificationToUsers } from '../../lib/pushNotifications';

export const PendingAdminRequestItem: React.FC<{ request: AdminRequest, currentUser: UserProfile, usersMap: Record<string, UserProfile> }> = ({ request, currentUser, usersMap }) => {
  const [loading, setLoading] = useState(false);
  const targetUser = usersMap[request.targetUserId];
  
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;
  
  const canApprove = isAdmin && request.requestedBy !== currentUser.id && request.firstApprovedBy !== currentUser.id;

  const handleApprove = async () => {
    if (!canApprove) return;
    try {
      setLoading(true);
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, 'adminRequests', request.id);
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists()) throw new Error("Request not found");
        
        const currentData = reqDoc.data() as AdminRequest;
        
        // Ensure no double processing
        if (currentData.status === 'APPROVED' || currentData.status === 'REJECTED') {
          throw new Error("ইতোমধ্যে প্রসেস করা হয়েছে");
        }

        // Needs second approval if SuperAdmin didn't initiate? Or just two distinct admins?
        // Let's enforce two distinct admins for sensitive actions: MIGRATION, DEACTIVATION, DELETION
        const needsTwoAdmins = ['ACCOUNT_MIGRATION', 'MEMBER_DEACTIVATION', 'MEMBER_DELETION'].includes(request.requestType);
        
        let newStatus = 'APPROVED';
        let isFinal = true;

        if (needsTwoAdmins && currentData.status === 'PENDING') {
          newStatus = 'LEVEL_1_APPROVED';
          isFinal = false;
        }

        const updatePayload: any = {
          status: newStatus,
          updatedAt: serverTimestamp()
        };

        if (isFinal) {
          updatePayload.secondApprovedBy = currentUser.id;
          updatePayload.secondApprovedByName = currentUser.displayName;
          updatePayload.secondApprovedAt = serverTimestamp();
          
          // Execute the actual logic based on requestType
          if (request.requestType === 'SLOT_INCREASE') {
            const userRef = doc(db, 'users', request.targetUserId);
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              const currentNames = userData.names || [];
              const newNames = request.metadata.requestedSlotNames.map(name => ({
                nameId: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                label: name,
                monthlyDue: request.metadata.monthlyDuePerSlot || 1000
              }));
              transaction.update(userRef, { names: [...currentNames, ...newNames] });
            }
          }
          else if (request.requestType === 'PIN_RESET') {
            const privateRef = doc(db, 'usersPrivate', request.targetUserId);
            transaction.update(privateRef, { pinHash: request.metadata.newPinHash });
          }
          else if (request.requestType === 'ACCOUNT_MIGRATION') {
            const oldUserRef = doc(db, 'users', request.targetUserId);
            const newUserRef = doc(db, 'users', request.metadata.destinationUserId);
            
            // Logic for migration (simplified: deactivate old if transfer)
            if (request.metadata.migrationType === 'transfer') {
              transaction.update(oldUserRef, { 
                status: 'migrated', 
                migratedTo: request.metadata.destinationUserId 
              });
            }
          }
          else if (request.requestType === 'MEMBER_DEACTIVATION') {
            const userRef = doc(db, 'users', request.targetUserId);
            transaction.update(userRef, { status: 'inactive' });
            
            // Audit adjustment for active Fund ownership happens outside or via Cloud Function
            // But we will log it.
          }
          else if (request.requestType === 'MEMBER_DELETION') {
            const userRef = doc(db, 'users', request.targetUserId);
            transaction.update(userRef, { status: 'pending_deletion' });
          }
          
        } else {
          updatePayload.firstApprovedBy = currentUser.id;
          updatePayload.firstApprovedByName = currentUser.displayName;
          updatePayload.firstApprovedAt = serverTimestamp();
        }

        transaction.update(reqRef, updatePayload);
        
        // Log Activity
        const activityRef = doc(collection(db, 'activityLog'));
        transaction.set(activityRef, {
          actorId: currentUser.id,
          action: isFinal ? 'ADMIN_REQUEST_APPROVED' : 'ADMIN_REQUEST_LEVEL_1',
          targetId: request.targetUserId,
          description: `${currentUser.displayName} ${request.requestType} আবেদন ${isFinal ? 'চূড়ান্ত অনুমোদন' : 'প্রাথমিক অনুমোদন'} করেছেন।`,
          timestamp: serverTimestamp()
        });
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      const reqRef = doc(db, 'adminRequests', request.id);
      await updateDoc(reqRef, {
        status: 'REJECTED',
        rejectedBy: currentUser.id,
        rejectedByName: currentUser.displayName,
        rejectedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = () => {
    switch(request.requestType) {
      case 'SLOT_INCREASE': return { icon: <Layers size={16} className="text-blue-500" />, title: 'স্লট বৃদ্ধির আবেদন', color: 'bg-blue-50 border-blue-100' };
      case 'PIN_RESET': return { icon: <ShieldCheck size={16} className="text-emerald-500" />, title: 'PIN রিসেট', color: 'bg-emerald-50 border-emerald-100' };
      case 'ACCOUNT_MIGRATION': return { icon: <ArrowRight size={16} className="text-indigo-500" />, title: 'অ্যাকাউন্ট মাইগ্রেশন', color: 'bg-indigo-50 border-indigo-100' };
      case 'MEMBER_DEACTIVATION': return { icon: <UserX size={16} className="text-amber-500" />, title: 'সদস্য নিষ্ক্রিয়করণ', color: 'bg-amber-50 border-amber-100' };
      case 'MEMBER_DELETION': return { icon: <AlertTriangle size={16} className="text-red-500" />, title: 'সদস্য ডিলিট', color: 'bg-red-50 border-red-100' };
      default: return { icon: <AlertCircle size={16} />, title: 'অজানা আবেদন', color: 'bg-slate-50 border-slate-100' };
    }
  };

  const info = getTypeInfo();

  return (
    <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${info.color}`}>
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
            {info.icon}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{info.title}</h4>
            <p className="text-xs text-slate-500">
              {request.targetUserName} 
              {request.status === 'LEVEL_1_APPROVED' && <span className="ml-2 text-amber-600 font-bold">(১ম অনুমোদন সম্পন্ন)</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/60 p-3 rounded-xl border border-white/50 text-sm">
        {request.requestType === 'SLOT_INCREASE' && (
          <p>নতুন স্লট সংখ্যা: <b>{request.metadata?.requestedSlotsCount}</b></p>
        )}
        {request.requestType === 'ACCOUNT_MIGRATION' && (
          <p>
            <b>{request.targetUserName}</b> থেকে <b>{request.metadata?.destinationUserName}</b> 
            ({request.metadata?.migrationType})
          </p>
        )}
        {(request.requestType === 'MEMBER_DEACTIVATION' || request.requestType === 'MEMBER_DELETION') && (
          <p>কারণ: {request.metadata?.reason}</p>
        )}
        
        {request.firstApprovedByName && (
          <p className="text-xs text-blue-600 font-medium mt-1">
            প্রথম অনুমোদন করেছেন: {request.firstApprovedByName}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">আবেদনকারী: {request.requestedByName}</p>
      </div>

      {request.firstApprovedBy === currentUser.id && request.status === 'LEVEL_1_APPROVED' ? (
        <div className="text-center py-2 bg-blue-50 text-blue-600 font-medium text-xs rounded-xl border border-blue-100">
          আপনি ১ম অনুমোদন সম্পন্ন করেছেন। অন্য একজন অ্যাডমিনের চূড়ান্ত অনুমোদন প্রয়োজন।
        </div>
      ) : (
        <div className="flex gap-2 mt-1">
          <button 
            onClick={handleReject}
            disabled={loading}
            className="flex-1 py-2 bg-white text-red-600 font-bold rounded-xl text-xs hover:bg-red-50 border border-red-100"
          >
            বাতিল
          </button>
          <button 
            onClick={handleApprove}
            disabled={loading || !canApprove}
            className="flex-1 py-2 bg-primary-600 text-white font-bold rounded-xl text-xs hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'অপেক্ষা করুন...' : (request.status === 'PENDING' && ['ACCOUNT_MIGRATION', 'MEMBER_DEACTIVATION', 'MEMBER_DELETION'].includes(request.requestType) ? '১ম অনুমোদন' : 'চূড়ান্ত অনুমোদন')}
          </button>
        </div>
      )}
    </div>
  );
};
