import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ArrowLeft, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { hasPermission } from '../lib/AuthContext';
import { X, ShieldAlert } from 'lucide-react';
import { useCurrentMonthPayments } from '../lib/useCurrentMonthPayments';




const PermissionsModal = ({ 
  member, 
  onClose, 
  currentUser,
  allMembers
}: { 
  member: UserProfile; 
  onClose: () => void; 
  currentUser: UserProfile;
  allMembers: UserProfile[];
}) => {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(
    member.permissions || (String(member.role).toLowerCase() === 'super_admin' ? ['super_admin'] : String(member.role).toLowerCase() === 'admin' ? ['admin'] : ['member'])
  );

  const togglePermission = async (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const savePermissions = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', member.id), {
        permissions: permissions
      });

      // Find changed permissions for log
      const oldPerms = member.permissions || [String(member.role).toLowerCase()];
      const added = permissions.filter(p => !oldPerms.includes(p));
      const removed = oldPerms.filter(p => !permissions.includes(p));

      let logDesc = '';
      if (added.length > 0 && removed.length > 0) {
        logDesc = `${currentUser.displayName} ${member.displayName}-কে ${removed.join(', ')} থেকে ${added.join(', ')} করেছেন`;
      } else if (added.length > 0) {
        logDesc = `${currentUser.displayName} ${member.displayName}-কে ${added.join(', ')} করেছেন`;
      } else if (removed.length > 0) {
        logDesc = `${currentUser.displayName} ${member.displayName}-কে ${removed.join(', ')} থেকে বাদ দিয়েছেন`;
      }

      if (logDesc) {
        await addDoc(collection(db, 'activityLog'), {
          description: logDesc,
          timestamp: serverTimestamp(),
        });
      }

      onClose();
      window.location.reload(); // Simple reload to refresh allMembers
    } catch (error) {
      console.error(error);
      alert('Error updating permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800">পারমিশন ম্যানেজমেন্ট</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-500 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{member.displayName}</strong>-এর জন্য পারমিশন সিলেক্ট করুন:
          </p>

          <div className="space-y-2">
            {[
              { id: 'member', label: 'Member' },
              { id: 'admin', label: 'Admin' },
              { id: 'super_admin', label: 'Super Admin' }
            ].map(perm => (
              <label key={perm.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm.id)}
                  onChange={() => togglePermission(perm.id)}
                  className="w-5 h-5 accent-primary-600"
                />
                <span className="text-sm font-medium text-slate-800">{perm.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
            বাতিল
          </button>
          <button onClick={savePermissions} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};

export function ManageMembers() {
  const { userProfile, isAdmin } = useAuth();
  const { getMemberPaymentStatus } = useCurrentMonthPayments();
  const navigate = useNavigate();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const { isSuperAdmin } = useAuth();

  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === userProfile?.id) return -1;
    if (b.id === userProfile?.id) return 1;
    const statusOrder = { not_submitted: 0, pending: 1, partial: 2, approved: 3 };
    const statusA = getMemberPaymentStatus(a);
    const statusB = getMemberPaymentStatus(b);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    let isMounted = true;
    getDocs(query(collection(db, 'users'))).then((snap) => {
      if (isMounted) setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [userProfile, navigate, isAdmin]);

  

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="h-16 bg-white shadow-sm flex items-center px-4 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-slate-800 flex items-center gap-2">
          <UserCog size={20} className="text-primary-500" />
          সদস্য ব্যবস্থাপনা
        </h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-3">
        {sortedMembers.map(member => (
          <div key={member.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                {member.photoURL ? (
                  <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  member.displayName.charAt(0)
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                  {member.displayName}
                  {userProfile?.id === member.id && (
                    <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">• আপনি</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{member.status}</p>
              </div>
            </div>
            
            
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-1 justify-end">
                {hasPermission(member, 'super_admin') && <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 rounded-md px-1.5 py-0.5 font-bold">Super Admin</span>}
                {hasPermission(member, 'admin') && <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded-md px-1.5 py-0.5 font-bold">Admin</span>}
                {hasPermission(member, 'member') && !hasPermission(member, 'admin') && !hasPermission(member, 'super_admin') && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 rounded-md px-1.5 py-0.5 font-bold">Member</span>
                )}
              </div>
              {isSuperAdmin && (
                <button 
                  onClick={() => setEditingMember(member)}
                  className="text-[10px] bg-primary-50 text-primary-600 hover:bg-primary-100 px-2 py-1 rounded-md font-medium transition-colors border border-primary-100"
                >
                  Manage Permissions
                </button>
              )}
            </div>
  

          </div>
        ))}
      </main>
      {editingMember && userProfile && (
        <PermissionsModal 
          member={editingMember} 
          onClose={() => setEditingMember(null)} 
          currentUser={userProfile}
          allMembers={members}
        />
      )}
    </div>
  );
}
