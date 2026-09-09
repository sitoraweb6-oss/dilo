import React, { useState } from 'react';
import { Building2, Copy, Check } from 'lucide-react';

export function BankDetailsCard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  return (
    <section className="mb-6">
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-slate-800 text-base leading-tight">সমিতির ব্যাংক হিসাব</h3>
            <p className="text-[10px] text-slate-500">পেমেন্ট জমা দেওয়ার জন্য</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Account Number */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex justify-between items-center group">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Account Number</p>
              <p className="font-mono text-xl font-black text-slate-800 tracking-tight">1111570501805</p>
            </div>
            <button
              onClick={() => handleCopy('1111570501805', 'account')}
              className={`p-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                copiedField === 'account' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-sm'
              }`}
            >
              {copiedField === 'account' ? (
                <>
                  <Check size={16} />
                  <span className="text-[10px] font-bold">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span className="text-[10px] font-bold">কপি</span>
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Bank Name */}
            <div className="bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center">
              <div className="pr-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Bank</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">Dutch Bangla Bank PLC</p>
              </div>
              <button
                onClick={() => handleCopy('Dutch Bangla Bank PLC', 'bank')}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  copiedField === 'bank' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50'
                }`}
              >
                {copiedField === 'bank' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            
            {/* A/C Name (Replaced Location) */}
            <div className="bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center">
              <div className="pr-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">A/C Name</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">MD GOLAM KIBRIYA</p>
              </div>
              <button
                onClick={() => handleCopy('MD GOLAM KIBRIYA', 'acName')}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  copiedField === 'acName' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50'
                }`}
              >
                {copiedField === 'acName' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Branch (Updated with location) */}
            <div className="bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center">
              <div className="pr-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">Bangabandhu Road branch, Narayanganj</p>
              </div>
              <button
                onClick={() => handleCopy('Bangabandhu Road branch, Narayanganj', 'branch')}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  copiedField === 'branch' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50'
                }`}
              >
                {copiedField === 'branch' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            
            {/* Routing Number */}
            <div className="bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center">
              <div className="pr-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Routing Number</p>
                <p className="text-sm font-mono font-bold text-slate-700 leading-tight">090670079</p>
              </div>
              <button
                onClick={() => handleCopy('090670079', 'routing')}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  copiedField === 'routing' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50'
                }`}
              >
                {copiedField === 'routing' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
