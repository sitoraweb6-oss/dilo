import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs, getDoc, runTransaction } from 'firebase/firestore';
import { UserProfile, Payment, ProfileChangeRequest, AdminRequest } from '../../types';
import { CheckCircle2, XCircle, Clock, Edit2, ShieldCheck, UserX, AlertTriangle, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { PendingPaymentItem, PendingMemberItem } from '../../pages/tabs/PendingApprovals';
import { sendPushNotificationToUsers } from '../../lib/pushNotifications';
import { PendingAdminRequestItem } from './PendingAdminRequestItem';

export function PendingApprovalsSection() {
  const { userProfile, isAdmin } = useAuth();
  const canViewApprovals = isAdmin;
  
  const [pendingMembers, setPendingMembers] = useState<UserProfile[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [pendingProfileReqs, setPendingProfileReqs] = useState<ProfileChangeRequest[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  
  useEffect(() => {
    if (!canViewApprovals) return;
    
    const unsubMembers = onSnapshot(query(collection(db, 'users'), where('status', '==', 'pending_approval')), (snap) => {
      setPendingMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    }, console.error);
    
    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', 'in', ['pending', 'level_1_approved'])), (snap) => {
      setPendingPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    }, console.error);
    
    const unsubProfileReqs = onSnapshot(query(collection(db, 'profileChangeRequests'), where('status', 'in', ['pending', 'level_1_approved'])), (snap) => {
      setPendingProfileReqs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProfileChangeRequest)));
    }, console.error);
    
    const unsubAdminReqs = onSnapshot(query(collection(db, 'adminRequests'), where('status', 'in', ['PENDING', 'LEVEL_1_APPROVED'])), (snap) => {
      setAdminRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminRequest)));
    }, console.error);
    
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const map: Record<string, UserProfile> = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() } as UserProfile; });
      setUsersMap(map);
    }, console.error);
    
    return () => {
      unsubMembers();
      unsubPayments();
      unsubProfileReqs();
      unsubAdminReqs();
      unsubUsers();
    };
  }, [canViewApprovals]);

  const totalPendingCount = pendingMembers.length + pendingPayments.length + pendingProfileReqs.length + adminRequests.length;
  if (!canViewApprovals || totalPendingCount === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          অপেক্ষমাণ অনুমোদন
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {totalPendingCount}
          </span>
        </h3>
      </div>
      
      <div className="space-y-3">
        {pendingMembers.map(member => (
          <PendingMemberItem key={member.id} member={member} currentUser={userProfile!} />
        ))}
        
        {adminRequests.map(req => (
          <PendingAdminRequestItem key={req.id} request={req} currentUser={userProfile!} usersMap={usersMap} />
        ))}
        
        {pendingPayments.map(payment => (
          <PendingPaymentItem key={payment.id} payment={payment} user={usersMap[payment.userId]} currentUser={userProfile!} usersMap={usersMap} />
        ))}
        
      </div>
    </section>
  );
}
