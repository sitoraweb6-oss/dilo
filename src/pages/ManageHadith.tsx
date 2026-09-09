import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Hadith } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, BookOpen, Trash2, Edit2, MoveUp, MoveDown, Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ManageHadith() {
  const { isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    arabic: '',
    bangla: '',
    reference: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    let isMounted = true;
    const q = query(collection(db, 'hadiths'), orderBy('displayOrder', 'asc'));
    getDocs(q).then((snap) => {
      if (isMounted) {
        setHadiths(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hadith)));
        setLoading(false);
      }
    }).catch((e) => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [isAdmin, navigate]);

  const resetForm = () => {
    setFormData({ arabic: '', bangla: '', reference: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.arabic || !formData.bangla || !formData.reference) {
      alert("Please fill all fields");
      return;
    }

    if (formData.isActive) {
      const activeCount = hadiths.filter(h => h.isActive && h.id !== editingId).length;
      if (activeCount >= 5) {
        alert("Maximum 5 Hadiths can be active at once. This will be saved as inactive.");
        formData.isActive = false;
      }
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        const docRef = doc(db, 'hadiths', editingId);
        await updateDoc(docRef, {
          arabic: formData.arabic.trim(),
          bangla: formData.bangla.trim(),
          reference: formData.reference.trim(),
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        const newDocRef = doc(collection(db, 'hadiths'));
        const nextOrder = hadiths.length > 0 ? Math.max(...hadiths.map(h => h.displayOrder)) + 1 : 1;
        
        await setDoc(newDocRef, {
          id: newDocRef.id,
          arabic: formData.arabic.trim(),
          bangla: formData.bangla.trim(),
          reference: formData.reference.trim(),
          displayOrder: nextOrder,
          isActive: formData.isActive,
          uploadedBy: userProfile?.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving hadith:", error);
      alert("An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (h: Hadith) => {
    setEditingId(h.id);
    setFormData({
      arabic: h.arabic || '',
      bangla: h.bangla || '',
      reference: h.reference || '',
      isActive: h.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this Hadith?")) {
      try {
        await deleteDoc(doc(db, 'hadiths', id));
      } catch (error) {
        console.error("Error deleting hadith:", error);
      }
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === hadiths.length - 1) return;

    const newHadiths = [...hadiths];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const tempOrder = newHadiths[index].displayOrder;
    newHadiths[index].displayOrder = newHadiths[targetIndex].displayOrder;
    newHadiths[targetIndex].displayOrder = tempOrder;

    try {
      const batch = [
        updateDoc(doc(db, 'hadiths', newHadiths[index].id), { displayOrder: newHadiths[index].displayOrder }),
        updateDoc(doc(db, 'hadiths', newHadiths[targetIndex].id), { displayOrder: newHadiths[targetIndex].displayOrder })
      ];
      await Promise.all(batch);
    } catch (err) {
      console.error("Error reordering:", err);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      if (!current) {
        const activeCount = hadiths.filter(h => h.isActive).length;
        if (activeCount >= 5) {
          alert('Maximum 5 active hadiths allowed.');
          return;
        }
      }
      await updateDoc(doc(db, 'hadiths', id), { isActive: !current });
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-50 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-heading font-bold text-slate-800 text-lg ml-2">Hadith Management</h1>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full pb-20">
        {!showForm ? (
          <>
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 px-4 font-bold flex items-center justify-center gap-2 mb-6 shadow-sm transition-colors"
            >
              <Plus size={20} />
              Add New Hadith
            </button>

            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : hadiths.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-medium text-slate-900">কোনো হাদিস এখনো যোগ করা হয়নি</h3>
                <p className="mt-1 text-xs text-slate-500">Get started by adding a Hadith for the home carousel.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {hadiths.map((h, index) => (
                  <motion.div 
                    layout
                    key={h.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-arabic text-xl md:text-2xl text-slate-800 mb-2" dir="rtl">{h.arabic}</p>
                        <p className="text-sm text-slate-600 mb-2">"{h.bangla}"</p>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{h.reference}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 shrink-0 ml-4">
                        <button onClick={() => moveOrder(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><MoveUp size={16} /></button>
                        <button onClick={() => moveOrder(index, 'down')} disabled={index === hadiths.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><MoveDown size={16} /></button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 mt-2">
                      <button 
                        onClick={() => toggleActive(h.id, h.isActive)} 
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${h.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {h.isActive ? <Check size={14} /> : <X size={14} />}
                        {h.isActive ? 'Active' : 'Disabled'}
                      </button>
                      <button onClick={() => handleEdit(h)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-1.5 ml-auto">
                        <Edit2 size={14} /> Edit
                      </button>
                      <button onClick={() => handleDelete(h.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 flex items-center gap-1.5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-800">{editingId ? 'Edit Hadith' : 'Add Hadith'}</h3>
              <button onClick={resetForm} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Arabic Text <span className="text-red-500">*</span></label>
                <textarea
                  value={formData.arabic}
                  onChange={e => setFormData({ ...formData, arabic: e.target.value })}
                  placeholder="الحديث..."
                  dir="rtl"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-lg font-arabic resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bangla Translation <span className="text-red-500">*</span></label>
                <textarea
                  value={formData.bangla}
                  onChange={e => setFormData({ ...formData, bangla: e.target.value })}
                  placeholder="বাংলা অনুবাদ..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reference <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={e => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="e.g. সহীহ বুখারী: ১২৩৪"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-slate-700">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    'Save Hadith'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </main>
    </div>
  );
}
