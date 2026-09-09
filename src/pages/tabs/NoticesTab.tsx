import React from "react";
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Notice, UserProfile } from '../../types';
import { format } from 'date-fns';
import { Bell, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendPushNotificationToAll } from '../../lib/pushNotifications';

export function NoticesTab() {
  const { userProfile, isAdmin } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, 'notices'), orderBy('postedAt', 'desc'));
    getDocs(q).then((snap) => {
      if (isMounted) setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !userProfile) return;
    try {
      setLoading(true);
      if (editingId) {
        await updateDoc(doc(db, 'notices', editingId), {
          title,
          content,
        });
      } else {
        const newDoc = await addDoc(collection(db, 'notices'), {
          title,
          content,
          postedBy: userProfile.displayName,
          postedAt: serverTimestamp()
        });
        
        await addDoc(collection(db, 'activityLog'), {
          description: `${userProfile.displayName} একটি নতুন নোটিশ দিয়েছেন: "${title}"`,
          timestamp: serverTimestamp(),
        });
        
        // Optimistic UI
        const newNotice = {
          id: newDoc.id,
          title,
          content,
          postedBy: userProfile.displayName,
          postedAt: null as any
        };
        setNotices([newNotice, ...notices]);

        // Send Push Notification
        await sendPushNotificationToAll('📢 নতুন নোটিশ', title);
      }
      setIsAdding(false);
      setEditingId(null);
      setTitle('');
      setContent('');
    } catch (error) {
      console.error(error);
      alert('নোটিশ সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setTitle(notice.title);
    setContent(notice.content);
    setEditingId(notice.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই নোটিশটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (error) {
      console.error(error);
      alert('নোটিশ মুছতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-heading font-bold text-slate-800 text-lg flex items-center gap-2">
          <Bell className="text-primary-500" size={24} />
          নোটিশ বোর্ড
        </h2>
        {isAdmin && !isAdding && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setTitle('');
              setContent('');
            }}
            className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-primary-200 transition-colors"
          >
            <Plus size={16} />
            নতুন নোটিশ
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700">{editingId ? 'নোটিশ সম্পাদনা করুন' : 'নতুন নোটিশ লিখুন'}</h3>
                <button type="button" onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setTitle('');
                  setContent('');
                }} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="নোটিশের শিরোনাম"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm mb-3 outline-none focus:border-primary-500"
                required
              />

              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="বিস্তারিত বিবরণ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-32 resize-none mb-3 outline-none focus:border-primary-500"
                required
              />

              <button 
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : (editingId ? 'আপডেট করুন' : 'পাবলিশ করুন')}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Bell className="mx-auto mb-2 opacity-50" size={32} />
            <p>কোনো নোটিশ নেই</p>
          </div>
        ) : (
          notices.map(notice => (
            <div key={notice.id} className="bg-gradient-to-br from-white to-slate-50 rounded-[28px] p-6 shadow-xl shadow-slate-200/40 border border-slate-200/60 relative group">
              {isAdmin && (
                <div className="absolute top-5 right-5 flex items-center space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100">
                  <button 
                    onClick={() => handleEdit(notice)}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(notice.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0 shadow-inner">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-wider uppercase text-primary-600/80 mb-0.5">{notice.postedAt ? format(notice.postedAt.toDate(), 'dd MMM yyyy, hh:mm a') : ''}</p>
                  <p className="text-xs font-medium text-slate-500">প্রকাশক: {notice.postedBy}</p>
                </div>
              </div>

              <h3 className="font-heading font-extrabold text-slate-800 text-xl mb-3 pr-16 leading-snug">{notice.title}</h3>
              <div className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed bg-white/50 p-4 rounded-2xl border border-slate-100">
                {notice.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
