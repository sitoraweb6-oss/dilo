import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { usePaymentSettings, DEFAULT_PAYMENT_SETTINGS } from '../lib/usePaymentSettings';
import { ArrowLeft, Save } from 'lucide-react';

export function AdminPaymentSettings() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { settings, loading, exists } = usePaymentSettings();
  
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFormData(settings);
    }
  }, [settings, loading]);

  useEffect(() => {
    if (isAdmin && !loading && exists === false) {
      // Auto create
      setDoc(doc(db, 'settings', 'payment'), DEFAULT_PAYMENT_SETTINGS).catch(console.error);
    }
  }, [exists, loading, isAdmin]);

  if (!isAdmin) {
    return <div className="p-4">Access Denied</div>;
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'settings', 'payment'), {
        monthlyFee: Number(formData.monthlyFee),
        dueDate: Number(formData.dueDate),
        firstLateFeeStartDay: Number(formData.firstLateFeeStartDay),
        lateFee: Number(formData.lateFee),
        secondPenaltyDate: Number(formData.secondPenaltyDate),
        secondPenaltyAmount: Number(formData.secondPenaltyAmount),
        isAnnualPaymentEnabled: Boolean(formData.isAnnualPaymentEnabled),
        annualAmount: Number(formData.annualAmount),
        annualEligibleMonths: formData.annualEligibleMonths || [],
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 text-lg">Payment Settings</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
          <Save size={16} /> Save
        </button>
      </header>
      
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Fee (৳)</label>
              <input type="number" value={formData.monthlyFee} onChange={e => setFormData({...formData, monthlyFee: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Due Day (1-31)</label>
              <input type="number" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" min="1" max="31" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Late Fee Start Day (1-31)</label>
              <input type="number" value={formData.firstLateFeeStartDay} onChange={e => setFormData({...formData, firstLateFeeStartDay: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" min="1" max="31" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Late Fee Amount (৳)</label>
              <input type="number" value={formData.lateFee} onChange={e => setFormData({...formData, lateFee: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Second Late Fee Start Day (1-31)</label>
              <input type="number" value={formData.secondPenaltyDate} onChange={e => setFormData({...formData, secondPenaltyDate: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" min="1" max="31" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Second Late Fee Amount (৳)</label>
              <input type="number" value={formData.secondPenaltyAmount} onChange={e => setFormData({...formData, secondPenaltyAmount: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          
            <div className="pt-4 border-t border-slate-200 mt-4">
              <h2 className="font-bold text-slate-800 text-base mb-3">Annual Payment Settings</h2>
              
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Enable Annual Payment</p>
                  <p className="text-[10px] text-slate-500">Allow members to pay annually</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.isAnnualPaymentEnabled} onChange={e => setFormData({...formData, isAnnualPaymentEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {formData.isAnnualPaymentEnabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Annual Amount (৳)</label>
                    <input type="number" value={formData.annualAmount} onChange={e => setFormData({...formData, annualAmount: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Eligible Months</label>
                    <p className="text-[10px] text-slate-500 mb-2">Select months when annual payment is allowed</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNum = String(i + 1).padStart(2, '0');
                        const monthName = new Date(2024, i, 1).toLocaleString('default', { month: 'short' });
                        const isSelected = (formData.annualEligibleMonths || []).includes(monthNum);
                        return (
                          <label key={monthNum} className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={(e) => {
                                const newMonths = e.target.checked 
                                  ? [...(formData.annualEligibleMonths || []), monthNum]
                                  : (formData.annualEligibleMonths || []).filter(m => m !== monthNum);
                                setFormData({ ...formData, annualEligibleMonths: newMonths });
                              }}
                            />
                            <span className="text-xs font-medium">{monthName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
</div>
        )}
      </main>
    </div>
  );
}
