import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { CarouselImage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Image as ImageIcon, Trash2, Edit2, MoveUp, MoveDown, Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ManageCarousel() {
  const { isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    caption: '',
    buttonText: '',
    buttonLink: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    let isMounted = true;
    const q = query(collection(db, 'photoCarousel'), orderBy('displayOrder', 'asc'));
    getDocs(q).then((snap) => {
      if (isMounted) {
        setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as CarouselImage)));
        setLoading(false);
      }
    }).catch((e) => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [isAdmin, navigate]);

  const resetForm = () => {
    setFormData({ imageUrl: '', title: '', caption: '', buttonText: '', buttonLink: '', isActive: true });
    setPreviewUrl(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !formData.imageUrl.trim()) {
      alert("Please enter an image path");
      return;
    }
    
    if (formData.isActive) {
      const activeCount = images.filter(img => img.isActive && img.id !== editingId).length;
      if (activeCount >= 5) {
        alert('Maximum 5 active images allowed. Please disable another image first.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const imageUrl = formData.imageUrl.trim();

      if (editingId) {
        const docRef = doc(db, 'photoCarousel', editingId);
        const updateData: any = {
          title: formData.title.trim(),
          caption: formData.caption.trim(),
          buttonText: formData.buttonText.trim(),
          buttonLink: formData.buttonLink.trim(),
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        };
        if (imageUrl) {
          updateData.imageUrl = imageUrl;
        }
        await updateDoc(docRef, updateData);
      } else {
        const newDocRef = doc(collection(db, 'photoCarousel'));
        const nextOrder = images.length > 0 ? Math.max(...images.map(img => img.displayOrder)) + 1 : 1;
        
        await setDoc(newDocRef, {
          id: newDocRef.id,
          title: formData.title.trim(),
          caption: formData.caption.trim(),
          buttonText: formData.buttonText.trim(),
          buttonLink: formData.buttonLink.trim(),
          imageUrl,
          displayOrder: nextOrder,
          isActive: formData.isActive,
          uploadedBy: userProfile?.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      resetForm();
    } catch (error: any) {
      console.error("Error saving image:", error);
      alert(`An error occurred while saving: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (img: CarouselImage) => {
    setEditingId(img.id);
    setFormData({
      imageUrl: img.imageUrl || '',
      title: img.title || '',
      caption: img.caption || '',
      buttonText: img.buttonText || '',
      buttonLink: img.buttonLink || '',
      isActive: img.isActive,
    });
    setPreviewUrl(img.imageUrl);
    setShowForm(true);
  };

  const handleDelete = async (img: CarouselImage) => {
    if (window.confirm("Delete this image?")) {
      try {
        await deleteDoc(doc(db, 'photoCarousel', img.id));
        // Note: Ideally delete from storage too, but simple version ignores it to avoid permission issues if not set up
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap displayOrder values
    const tempOrder = newImages[index].displayOrder;
    newImages[index].displayOrder = newImages[targetIndex].displayOrder;
    newImages[targetIndex].displayOrder = tempOrder;
    
    // Also swap their array positions for immediate visual update
    const tempElement = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = tempElement;

    // Optimistic UI Update
    setImages(newImages);

    // Update in Firestore
    try {
      const batch = [
        updateDoc(doc(db, 'photoCarousel', newImages[index].id), { displayOrder: newImages[index].displayOrder }),
        updateDoc(doc(db, 'photoCarousel', newImages[targetIndex].id), { displayOrder: newImages[targetIndex].displayOrder })
      ];
      await Promise.all(batch);
    } catch (err) {
      console.error("Error reordering:", err);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      if (!current) {
        const activeCount = images.filter(img => img.isActive).length;
        if (activeCount >= 5) {
          alert('Maximum 5 active images allowed.');
          return;
        }
      }
      await updateDoc(doc(db, 'photoCarousel', id), { isActive: !current });
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
        <h1 className="font-heading font-bold text-slate-800 text-lg ml-2">Photo Carousel Management</h1>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full pb-20">
        {!showForm ? (
          <>
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 px-4 font-bold flex items-center justify-center gap-2 mb-6 shadow-sm transition-colors"
            >
              <Plus size={20} />
              Add New Image
            </button>

            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : images.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <ImageIcon className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-medium text-slate-900">কোনো ছবি এখনো যোগ করা হয়নি</h3>
                <p className="mt-1 text-xs text-slate-500">Get started by uploading an image for the home carousel.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {images.map((img, index) => (
                  <motion.div 
                    layout
                    key={img.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col sm:flex-row"
                  >
                    <div className="sm:w-48 h-32 sm:h-auto bg-slate-100 relative shrink-0">
                      <img src={img.imageUrl} alt={img.title || 'Carousel image'} className="w-full h-full object-cover" />
                      {!img.isActive && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Inactive</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-800 line-clamp-1">{img.title || <span className="text-slate-400 italic">No Title</span>}</h4>
                          {img.caption && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{img.caption}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => moveOrder(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><MoveUp size={16} /></button>
                          <button onClick={() => moveOrder(index, 'down')} disabled={index === images.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><MoveDown size={16} /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-auto pt-4">
                        <button 
                          onClick={() => toggleActive(img.id, img.isActive)} 
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 \${img.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {img.isActive ? <Check size={14} /> : <X size={14} />}
                          {img.isActive ? 'Active' : 'Disabled'}
                        </button>
                        <button onClick={() => handleEdit(img)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 flex items-center gap-1.5 ml-auto">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(img)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 flex items-center gap-1.5">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-800">{editingId ? 'Edit Image' : 'Add Image Path'}</h3>
              <button onClick={resetForm} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Image Path <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={e => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="e.g. /images/carousel/slide1.jpg"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                />
                {previewUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video flex items-center justify-center">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-contain absolute inset-0" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }} 
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                        e.currentTarget.nextElementSibling?.classList.add('hidden');
                      }} 
                    />
                    <div className="hidden text-slate-500 font-bold text-sm">Image not found</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Title <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 📷 সমিতির স্মৃতিচারণ"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Caption <span className="text-slate-400 font-normal">(Optional)</span></label>
                <textarea
                  value={formData.caption}
                  onChange={e => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="e.g. ২০২৬ সালের বার্ষিক সভার কিছু সুন্দর মুহূর্ত।"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Button Text <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={e => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="e.g. আরও দেখুন"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Button Link <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={formData.buttonLink}
                    onChange={e => setFormData({ ...formData, buttonLink: e.target.value })}
                    placeholder="e.g. https://..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-slate-700">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
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
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    'Save Image'
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
