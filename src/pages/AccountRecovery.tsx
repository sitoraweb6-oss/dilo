import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { ShieldCheck, Search, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function AccountRecovery() {
  const { userProfile, isAdmin, firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'create'>('pending');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [reason, setReason] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetchRequests();
    fetchUsers();
  }, [isAdmin]);

  const fetchRequests = async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/recovery-requests?idToken=${token}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('status', '==', 'active')));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleFetchOldEmail = async (uid: string) => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/get-user-email?idToken=${token}&targetUid=${uid}`);
      const data = await res.json();
      if (data.success) {
        setOldEmail(data.email);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    setSearchQuery(u.displayName);
    setOldEmail('');
    handleFetchOldEmail(u.id);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedUser) return;
    if (!newEmail || !reason || !oldEmail) return;
    try {
      setCreateLoading(true);
      setError('');
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/create-recovery-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: token,
          memberId: selectedUser.id,
          memberName: selectedUser.displayName,
          oldEmail,
          newEmail,
          reason,
          requestedByName: userProfile?.displayName
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUser(null);
        setSearchQuery('');
        setNewEmail('');
        setReason('');
        setOldEmail('');
        setActiveTab('pending');
        fetchRequests();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      setError('');
      const token = await firebaseUser.getIdToken();
      const endpoint = action === 'approve' ? '/api/admin/approve-recovery-request' : '/api/admin/reject-recovery-request';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: token,
          requestId,
          resolvedByName: userProfile?.displayName
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  const filteredRequests = requests.filter(r => r.status === activeTab);
  const filteredUsers = searchQuery ? users.filter(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-30 flex items-center gap-3">
        <ShieldCheck className="text-red-500" size={24} />
        <h1 className="text-xl font-heading font-bold text-slate-800">Account Recovery</h1>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Pending</button>
          <button onClick={() => setActiveTab('approved')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'approved' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Approved</button>
          <button onClick={() => setActiveTab('rejected')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'rejected' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Rejected</button>
          <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'create' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Create Request</button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {activeTab === 'create' ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">New Recovery Request</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Search Member</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm" placeholder="Enter member name..." />
                </div>
                {searchQuery && !selectedUser && filteredUsers.length > 0 && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto absolute z-10 w-full max-w-sm">
                    {filteredUsers.map(u => (
                      <button key={u.id} type="button" onClick={() => handleSelectUser(u)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0">
                        {u.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Old Email</label>
                    <input type="email" value={oldEmail} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">New Email</label>
                    <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm" placeholder="Enter new email address..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Reason for Recovery</label>
                    <textarea required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm h-24 resize-none" placeholder="Explain why this account needs recovery..." />
                  </div>
                  <button type="submit" disabled={createLoading || !oldEmail} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {createLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </>
              )}
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-slate-500 py-10 text-sm">Loading...</p>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <ShieldCheck className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-slate-500 text-sm">No requests found.</p>
              </div>
            ) : (
              filteredRequests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{req.memberName}</h3>
                      <p className="text-[10px] text-slate-500">{new Date(req.requestedAt).toLocaleString()}</p>
                    </div>
                    {req.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Pending</span>}
                    {req.status === 'approved' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Approved</span>}
                    {req.status === 'rejected' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">Rejected</span>}
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 text-xs space-y-1.5 border border-slate-100">
                    <p><span className="text-slate-500">Old Email:</span> <span className="font-medium text-slate-700">{req.oldEmail}</span></p>
                    <p><span className="text-slate-500">New Email:</span> <span className="font-bold text-indigo-600">{req.newEmail}</span></p>
                    <p><span className="text-slate-500">Requested By:</span> <span className="font-medium text-slate-700">{req.requestedByName}</span></p>
                    {req.resolvedByName && <p><span className="text-slate-500">Resolved By:</span> <span className="font-medium text-slate-700">{req.resolvedByName}</span></p>}
                    <div className="pt-1 mt-1 border-t border-slate-200">
                      <p className="text-slate-600 italic">"{req.reason}"</p>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      {req.requestedBy === firebaseUser?.uid ? (
                        <p className="text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded-lg w-full text-center flex items-center justify-center gap-1">
                          <Clock size={14} /> Awaiting another admin's approval
                        </p>
                      ) : (
                        <>
                          <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-xl transition-colors text-xs flex items-center justify-center gap-1">
                            <XCircle size={16} /> Reject
                          </button>
                          <button onClick={() => handleAction(req.id, 'approve')} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold py-2 rounded-xl transition-colors text-xs flex items-center justify-center gap-1">
                            <CheckCircle size={16} /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
