import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, startAfter, QueryDocumentSnapshot, getDocs } from 'firebase/firestore';
import { ActivityLog } from '../types';
import { ArrowLeft, Search, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function ActivityHistory() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, 'activityLog'), orderBy('timestamp', sortOrder), limit(20));
    
    getDocs(q).then((snap) => {
      if (isMounted) {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
        setActivities(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === 20);
        setLoading(false);
      }
    }).catch(e => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    
    return () => { isMounted = false; };
  }, [sortOrder]);

  const loadMore = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    
    const q = query(
      collection(db, 'activityLog'), 
      orderBy('timestamp', sortOrder), 
      startAfter(lastDoc),
      limit(20)
    );
    
    const snap = await getDocs(q);
    const newData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
    setActivities(prev => [...prev.filter(a => !newData.find(n => n.id === a.id)), ...newData]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === 20);
    setLoadingMore(false);
  };

  const filteredActivities = activities.filter(a => 
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 text-lg">অ্যাক্টিভিটি হিস্ট্রি</h1>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full pb-20">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="অ্যাক্টিভিটি খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 whitespace-nowrap"
          >
            <Calendar size={16} className="text-primary-500" />
            {sortOrder === 'desc' ? 'নতুনগুলো আগে' : 'পুরোনো আগে'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">কোনো অ্যাক্টিভিটি পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((act) => (
                <div key={act.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                  <div className="mt-1">
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center border border-primary-100 text-primary-600">
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{act.description}</p>
                    {act.timestamp && (
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        {format(act.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {hasMore && !searchTerm && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                  আরো দেখুন
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
