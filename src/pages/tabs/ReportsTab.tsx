import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { InvestmentTransaction } from '../../types';
import { Payment, UserProfile, Expense } from '../../types';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Download, FileText, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getMemberStatus, getSystemSlotSummary } from '../../lib/paymentUtils';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export function ReportsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [investmentTxns, setInvestmentTxns] = useState<InvestmentTransaction[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [paymentsSnap, expensesSnap, membersSnap, invTxnSnap] = await Promise.all([
          getDocs(collection(db, 'payments')),
          getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'investmentTransactions'))
        ]);
        
        if (!isMounted) return;
        
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        setInvestmentTxns(invTxnSnap.docs.map(d => ({ id: d.id, ...d.data() } as InvestmentTransaction)));
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching report data", error);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const approvedPayments = payments.filter(p => p.status === 'approved');
  
  // Chart 1: Monthly Collection (Bar Chart)
  const monthlyDataMap = new Map<string, number>();
  approvedPayments.forEach(p => {
    const amount = p.amount || 0;
    monthlyDataMap.set(p.month, (monthlyDataMap.get(p.month) || 0) + amount);
  });
  
  const monthlyData = Array.from(monthlyDataMap.entries())
    .map(([month, amount]) => ({ name: month, amount }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-6); // Last 6 months

  // Chart 2: Due vs Paid Distribution (Pie Chart) for current month
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthPayments = payments.filter(p => p.month === currentMonth || (p.paymentType === 'advance' && p.coveredMonthsList && p.coveredMonthsList.includes(currentMonth)));
  const slotSummary = getSystemSlotSummary(members.filter(m => m.status === 'active'), currentMonthPayments, currentMonth);
  const currentPaid = slotSummary.paidSlots;
  const currentPending = slotSummary.pendingSlots;
  const currentDue = slotSummary.dueSlots;
  
  const paymentStatusData = [
    { name: 'পরিশোধিত', value: currentPaid, color: '#10b981' },
    { name: 'অপেক্ষমাণ', value: currentPending, color: '#f59e0b' },
    { name: 'বকেয়া', value: Math.max(0, currentDue), color: '#ef4444' }
  ];

  // Export Functions
  const exportToExcel = async () => {
    try {
      setExporting('excel');
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(approvedPayments.map(p => {
        const member = members.find(m => m.id === p.userId);
        return {
          'Date': p.approvedAt ? format(p.approvedAt.toDate(), 'yyyy-MM-dd') : 'N/A',
          'Month': p.month,
          'Type': p.paymentType === 'annual' ? 'Annual Contribution' : 'Monthly Contribution',
          'Member Name': member?.displayName || 'Unknown',
          'Amount': p.amount,
          'Status': p.status
        };
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payments");
      XLSX.writeFile(wb, `mithaq_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    try {
      setExporting('pdf');
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.text("Mithaq Financial Report", 14, 15);
      
      const tableData = approvedPayments.map(p => {
        const member = members.find(m => m.id === p.userId);
        return [
          p.approvedAt ? format(p.approvedAt.toDate(), 'yyyy-MM-dd') : 'N/A',
          p.month,
          p.paymentType === 'annual' ? 'Annual Contribution' : 'Monthly Contribution',
          member?.displayName || 'Unknown',
          p.amount.toString()
        ];
      });

      autoTable(doc, {
        head: [['Date', 'Month', 'Type', 'Member', 'Amount (BDT)']],
        body: tableData,
        startY: 25,
      });
      
      doc.save(`mithaq_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="animate-spin text-primary-500 w-8 h-8" /></div>;
  }

  const totalCollection = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = expenses.filter(e => (e as any).status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const invOutflow = investmentTxns.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
  const invReturn = investmentTxns.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalCollection - totalExpense - invOutflow + invReturn;

  return (
    <div className="space-y-6 pb-20 print:bg-white print:text-black">
      <div className="flex justify-between items-center mb-2 print:hidden">
        <h2 className="text-xl font-bold font-heading text-slate-800">ফাইন্যান্স রিপোর্ট</h2>
        <div className="flex gap-2">
          <button 
            onClick={exportToPDF} 
            disabled={exporting !== null}
            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors" 
            title="Export PDF"
          >
            {exporting === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          </button>
          <button 
            onClick={exportToExcel} 
            disabled={exporting !== null}
            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors" 
            title="Export Excel"
          >
            {exporting === 'excel' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          </button>
          <button onClick={handlePrint} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Print">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">মোট সংগ্রহ</p>
          <p className="text-2xl font-bold text-emerald-600 font-heading">৳ {totalCollection.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">মোট খরচ</p>
          <p className="text-2xl font-bold text-red-600 font-heading">৳ {totalExpense.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">বর্তমান ব্যালেন্স</p>
          <p className="text-2xl font-bold text-white font-heading">৳ {netBalance.toLocaleString('en-IN')}</p>
          {(invOutflow > 0 || invReturn > 0) && <p className="text-[10px] text-slate-300 mt-1">বিনিয়োগ সমন্বয় করা হয়েছে</p>}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none">
        <h3 className="font-bold text-slate-800 mb-4 font-heading">মাসিক সংগ্রহের ধারা</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="সংগ্রহ (৳)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:break-inside-avoid">
          <h3 className="font-bold text-slate-800 mb-4 font-heading">চলতি মাসের পেমেন্ট স্ট্যাটাস</h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {paymentStatusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:break-inside-avoid overflow-hidden">
          <h3 className="font-bold text-slate-800 mb-4 font-heading">সর্বোচ্চ সঞ্চয়কারী</h3>
          <div className="space-y-3">
            {members
              .map(m => {
                const total = approvedPayments.filter(p => p.userId === m.id).reduce((s, p) => s + p.amount, 0);
                return { ...m, total };
              })
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {member.displayName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{member.displayName}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">৳ {member.total.toLocaleString('en-IN')}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
