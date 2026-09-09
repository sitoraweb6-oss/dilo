import React from "react";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, limit } from 'firebase/firestore';
import { AdminSupportMessage, UserProfile } from '../types';
import { ArrowLeft, Send, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function AdminSupport() {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [selectedThreadUser, setSelectedThreadUser] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadUserId = isAdmin ? selectedThreadUser : userProfile?.id;

  useEffect(() => {
    let isMounted = true;
    getDocs(collection(db, 'users')).then((snap) => {
      if (!isMounted) return;
      const usersMap: Record<string, UserProfile> = {};
      snap.forEach(doc => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() } as UserProfile;
      });
      setUsers(usersMap);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!threadUserId) {
      if (isAdmin) {
        // Fetch all messages to find active threads
        const q = query(collection(db, 'adminSupportMessages'), orderBy('timestamp', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSupportMessage)));
        });
        return () => unsub();
      }
      return;
    }

    const q = query(
      collection(db, 'adminSupportMessages'), 
      where('fromUserId', '==', threadUserId),
      orderBy('timestamp', 'asc')
    );
    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSupportMessage)));
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubMessages();
  }, [threadUserId, isAdmin]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile || !threadUserId) return;
    const text = newMessage;
    setNewMessage('');
    
    await addDoc(collection(db, 'adminSupportMessages'), {
      fromUserId: threadUserId,
      message: text,
      repliedBy: isAdmin ? userProfile.id : null,
      timestamp: serverTimestamp()
    });
  };

  // If admin and no thread selected, show list of threads
  if (isAdmin && !selectedThreadUser) {
    const threads = Array.from(new Set(messages.map(m => m.fromUserId)));
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="h-16 bg-white shadow-sm flex items-center px-4 shrink-0">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800">এডমিন সাপোর্ট ইনবক্স</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-2">
          {threads.length === 0 ? (
            <p className="text-center text-slate-500 mt-10">কোনো সাপোর্ট মেসেজ নেই</p>
          ) : (
            threads.map(uid => {
              const u = users[uid];
              if (!u) return null;
              return (
                <button 
                  key={uid} 
                  onClick={() => setSelectedThreadUser(uid)}
                  className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 text-left"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                    {u.photoURL ? <img src={u.photoURL} className="rounded-full" /> : <User size={20} className="text-slate-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{u.displayName}</h3>
                    <p className="text-xs text-slate-500">মেসেজ দেখতে ক্লিক করুন</p>
                  </div>
                </button>
              );
            })
          )}
        </main>
      </div>
    );
  }

  const threadUser = users[threadUserId || ''];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="h-16 bg-white shadow-sm flex items-center px-4 shrink-0">
        <button 
          onClick={() => {
            if (isAdmin) setSelectedThreadUser(null);
            else navigate(-1);
          }} 
          className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-slate-800">
          {isAdmin ? `${threadUser?.displayName} এর মেসেজ` : 'এডমিন সাপোর্ট'}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isMe = isAdmin ? !!msg.repliedBy : !msg.repliedBy;
          const senderId = msg.repliedBy || msg.fromUserId;
          const sender = users[senderId];
          
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-500">
                {sender?.photoURL ? <img src={sender.photoURL} alt="avatar" /> : sender?.displayName?.charAt(0) || '?'}
              </div>
              <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[10px] text-slate-500 mb-1 ml-1">{sender?.displayName}</span>}
                <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 rounded-tl-sm'}`}>
                  <p className="text-sm">{msg.message}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">
                  {msg.timestamp ? format(msg.timestamp.toDate(), 'hh:mm a') : '...'}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      <footer className="bg-white p-3 border-t border-slate-200 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 max-w-2xl mx-auto w-full">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="মেসেজ লিখুন..."
            className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-primary-500 rounded-full px-4 py-2 text-sm outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
