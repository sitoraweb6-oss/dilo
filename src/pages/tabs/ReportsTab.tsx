import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { InvestmentTransaction, Payment, UserProfile, Expense } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import { FileText, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import { usePaymentSettings } from '../../lib/usePaymentSettings';
import {
  buildMemberLedger, collectionByCoveredMonth, annualCollectionByYear, systemApproved, memberSavings,
  getPaymentCoverage, describePaymentBn, monthLabelBn, monthListLabelBn, monthRange, addMonths, toMonthKey,
  MonthLine, MemberLedger, toBnDigits,
} from '../../lib/ledger';
import { MemberStatement } from '../../components/MemberStatement';

const BN_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const taka = (n: number) => `৳ ${Math.round(n).toLocaleString('en-IN')}`;
const STATUS_BN: Record<MonthLine['status'], string> = {
  paid: 'পরিশোধিত', pending: 'অপেক্ষমাণ', overdue: 'বকেয়া', current: 'বাকি (চলতি)', upcoming: '—',
};
const STATUS_EN: Record<MonthLine['status'], string> = {
  paid: 'Paid', pending: 'Pending', overdue: 'Due', current: 'Due (current)', upcoming: '-',
};

export function ReportsTab() {
  const { settings, loading: settingsLoading } = usePaymentSettings();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [investmentTxns, setInvestmentTxns] = useState<InvestmentTransaction[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const currentMonth = toMonthKey(new Date());
  const [reportMonth, setReportMonth] = useState(currentMonth);
  const [matrixYear, setMatrixYear] = useState(currentMonth.slice(0, 4));
  const [statementMemberId, setStatementMemberId] = useState('');

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
        setAllUsers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      } catch (error) {
        console.error("Error fetching report data", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const activeMembers = useMemo(() => allUsers.filter(m => m.status === 'active'), [allUsers]);
  const ledgers: MemberLedger[] = useMemo(
    () => activeMembers.map(m => buildMemberLedger(m, payments, settings)),
    [activeMembers, payments, settings]
  );
  const approved = useMemo(() => systemApproved(payments), [payments]);
  const byMonth = useMemo(() => collectionByCoveredMonth(payments), [payments]);
  const annualByYear = useMemo(() => annualCollectionByYear(payments), [payments]);

  // Month options: from earliest ledger start (or 12 months back) to current month
  const earliest = ledgers.flatMap(l => l.slots.map(s => s.startMonth)).sort()[0] || addMonths(currentMonth, -11);
  const monthOptions = monthRange(earliest < addMonths(currentMonth, -35) ? addMonths(currentMonth, -35) : earliest, currentMonth).reverse();

  // ---- month-wise rows for the selected month ----
  type Row = { member: UserProfile; slotLabel: string; line?: MonthLine };
  const monthRows: Row[] = ledgers.flatMap(l =>
    l.slots.map(s => ({
      member: l.member,
      slotLabel: s.slot.label,
      line: [...s.months, ...s.upcoming].find(x => x.month === reportMonth),
    }))
  ).filter(r => r.line);
  const monthPaid = monthRows.filter(r => r.line!.status === 'paid').length;
  const monthPending = monthRows.filter(r => r.line!.status === 'pending').length;
  const monthDue = monthRows.filter(r => r.line!.status === 'overdue' || r.line!.status === 'current').length;
  const monthExpected = monthRows.reduce((s, r) => s + r.line!.baseAmount, 0);
  const monthCollected = byMonth.get(reportMonth) || { base: 0, fine: 0 };

  // ---- chart: last 12 months by the month the money PAYS FOR ----
  const chartData = monthRange(addMonths(currentMonth, -11), currentMonth).map(m => {
    const v = byMonth.get(m) || { base: 0, fine: 0 };
    return { name: monthLabelBn(m, false), চাঁদা: Math.round(v.base), জরিমানা: Math.round(v.fine) };
  });

  const paymentStatusData = [
    { name: 'পরিশোধিত', value: monthPaid, color: '#10b981' },
    { name: 'অপেক্ষমাণ', value: monthPending, color: '#f59e0b' },
    { name: 'বকেয়া', value: monthDue, color: '#ef4444' }
  ];

  // ---- dues list ----
  const duesList = ledgers
    .filter(l => l.hasDues)
    .sort((a, b) => b.dueAmount - a.dueAmount)
    .map(l => ({
      ledger: l,
      lines: l.slots.filter(s => s.dueAmount > 0).map(s => ({
        slot: s.slot.label,
        months: s.months.filter(x => x.status === 'overdue' || x.status === 'current').map(x => x.month),
        years: s.annual.filter(a => a.status === 'overdue').map(a => a.year),
        amount: s.dueAmount,
      })),
    }));
  const totalDues = duesList.reduce((s, d) => s + d.ledger.dueAmount, 0);

  const nameOf = (id: string) => allUsers.find(m => m.id === id)?.displayName || 'Unknown';
  const slotOf = (p: Payment) => allUsers.find(m => m.id === p.userId)?.names?.find(n => n.nameId === p.nameId)?.label || '';

  // ---- exports ----
  const exportToExcel = async () => {
    try {
      setExporting('excel');
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // 1. All approved payments
      const paymentsSheet = XLSX.utils.json_to_sheet(approved.map(p => {
        const cov = getPaymentCoverage(p);
        return {
          'Submitted': p.submittedAt?.toDate ? format(p.submittedAt.toDate(), 'yyyy-MM-dd') : p.month,
          'Approved': p.approvedAt?.toDate ? format(p.approvedAt.toDate(), 'yyyy-MM-dd') : '',
          'Member': nameOf(p.userId),
          'Slot': slotOf(p),
          'Months paid for': cov.months.join(', '),
          'Annual years': cov.annualYears.join(', '),
          'Base': Math.round(Object.values(cov.perMonth).reduce((s, v) => s + v.base, 0)),
          'Late fine': Math.round(Object.values(cov.perMonth).reduce((s, v) => s + v.fine, 0)),
          'Annual': Math.round(Object.values(cov.perAnnual).reduce((s, v) => s + v, 0)),
          'Total': p.amount,
          'Method': p.paymentMethod || '',
          'Transaction ID': p.transactionId || '',
        };
      }));
      XLSX.utils.book_append_sheet(wb, paymentsSheet, 'Payments');

      // 2. Member x month matrix (last 12 months)
      const months = monthRange(addMonths(currentMonth, -11), currentMonth);
      const matrix = ledgers.flatMap(l => l.slots.map(s => {
        const row: Record<string, string | number> = { 'Member': l.member.displayName, 'Slot': s.slot.label };
        months.forEach(m => {
          const line = s.months.find(x => x.month === m);
          row[m] = line ? STATUS_EN[line.status] : 'N/A';
        });
        row['Total due (BDT)'] = Math.round(s.dueAmount);
        return row;
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrix), 'Month-wise');

      // 3. Dues
      const dues = duesList.flatMap(d => d.lines.map(x => ({
        'Member': d.ledger.member.displayName,
        'Mobile': d.ledger.member.personalMobile || '',
        'Slot': x.slot,
        'Due months': x.months.join(', '),
        'Due annual years': x.years.join(', '),
        'Amount incl. fine (BDT)': Math.round(x.amount),
      })));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dues.length ? dues : [{ 'Member': 'No dues' }]), 'Dues');

      // 4. Monthly summary
      const summary = months.map(m => {
        const v = byMonth.get(m) || { base: 0, fine: 0 };
        const lines = ledgers.flatMap(l => l.slots.map(s => s.months.find(x => x.month === m))).filter(Boolean) as MonthLine[];
        return {
          'Month': m,
          'Expected (BDT)': lines.reduce((s, x) => s + x.baseAmount, 0),
          'Collected base (BDT)': Math.round(v.base),
          'Collected fine (BDT)': Math.round(v.fine),
          'Slots paid': lines.filter(x => x.status === 'paid').length,
          'Slots pending': lines.filter(x => x.status === 'pending').length,
          'Slots due': lines.filter(x => x.status === 'overdue' || x.status === 'current').length,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Monthly summary');

      XLSX.writeFile(wb, `mithaq_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Excel তৈরি করতে সমস্যা হয়েছে।');
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
      // jsPDF default fonts cannot render Bangla, so the PDF uses English labels.
      doc.text(`Mithaq Monthly Report - ${reportMonth}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Expected: ${monthExpected}  |  Collected: ${Math.round(monthCollected.base)} + fine ${Math.round(monthCollected.fine)}  |  Paid ${monthPaid}, Pending ${monthPending}, Due ${monthDue} slots`, 14, 22);
      autoTable(doc, {
        head: [['Member', 'Slot', 'Status', 'Amount (BDT)']],
        body: monthRows.map(r => [r.member.displayName, r.slotLabel, STATUS_EN[r.line!.status], String(r.line!.baseAmount + r.line!.lateFine)]),
        startY: 27,
      });
      const y = (doc as any).lastAutoTable?.finalY || 40;
      doc.text(`Total outstanding dues: ${Math.round(totalDues)} BDT`, 14, y + 10);
      autoTable(doc, {
        head: [['Member', 'Slot', 'Due months', 'Annual', 'Amount (BDT)']],
        body: duesList.flatMap(d => d.lines.map(x => [d.ledger.member.displayName, x.slot, x.months.join(', '), x.years.join(', '), String(Math.round(x.amount))])),
        startY: y + 14,
      });
      doc.save(`mithaq_report_${reportMonth}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('PDF তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setExporting(null);
    }
  };

  if (loading || settingsLoading) {
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="animate-spin text-primary-500 w-8 h-8" /></div>;
  }

  const totalCollection = approved.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalFines = [...byMonth.values()].reduce((s: number, v: { base: number; fine: number }) => s + v.fine, 0);
  const totalAnnual = [...annualByYear.values()].reduce((s: number, v: number) => s + v, 0);
  const totalExpense = expenses.filter(e => (e as any).status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const invOutflow = investmentTxns.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
  const invReturn = investmentTxns.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalCollection - totalExpense - invOutflow + invReturn;

  return (
    <div className="space-y-6 pb-20 print:bg-white print:text-black">
      <div className="flex justify-between items-center mb-2 print:hidden">
        <h2 className="text-xl font-bold font-heading text-slate-800">ফাইন্যান্স রিপোর্ট</h2>
        <div className="flex gap-2">
          <button onClick={exportToPDF} disabled={exporting !== null} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors" title="Export PDF">
            {exporting === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          </button>
          <button onClick={exportToExcel} disabled={exporting !== null} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors" title="Export Excel">
            {exporting === 'excel' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          </button>
          <button onClick={() => window.print()} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Print">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 mb-1">মোট সংগ্রহ</p>
          <p className="text-xl font-bold text-emerald-600 font-heading">{taka(totalCollection)}</p>
          <p className="text-[10px] text-slate-400 mt-1">বার্ষিক {taka(totalAnnual)} • জরিমানা {taka(totalFines)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 mb-1">মোট বকেয়া</p>
          <p className="text-xl font-bold text-red-600 font-heading">{taka(totalDues)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{duesList.length} জন সদস্য</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 mb-1">মোট খরচ</p>
          <p className="text-xl font-bold text-red-600 font-heading">{taka(totalExpense)}</p>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <p className="text-[11px] font-bold text-slate-400 mb-1">বর্তমান ব্যালেন্স</p>
          <p className="text-xl font-bold text-white font-heading">{taka(netBalance)}</p>
          {(invOutflow > 0 || invReturn > 0) && <p className="text-[10px] text-slate-300 mt-1">বিনিয়োগ সমন্বয় করা হয়েছে</p>}
        </div>
      </div>

      {/* Month-wise report */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:shadow-none">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800 font-heading">মাসভিত্তিক হিসাব</h3>
          <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none">
            {monthOptions.map(m => <option key={m} value={m}>{monthLabelBn(m)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
          <div className="bg-slate-50 rounded-xl p-2"><p className="text-[10px] text-slate-500">প্রত্যাশিত</p><p className="font-bold text-slate-800 text-sm">{taka(monthExpected)}</p></div>
          <div className="bg-emerald-50 rounded-xl p-2"><p className="text-[10px] text-emerald-600">আদায় (চাঁদা)</p><p className="font-bold text-emerald-700 text-sm">{taka(monthCollected.base)}</p></div>
          <div className="bg-orange-50 rounded-xl p-2"><p className="text-[10px] text-orange-600">আদায় (জরিমানা)</p><p className="font-bold text-orange-700 text-sm">{taka(monthCollected.fine)}</p></div>
          <div className="bg-red-50 rounded-xl p-2"><p className="text-[10px] text-red-600">বাকি স্লট</p><p className="font-bold text-red-700 text-sm">{monthDue}টি</p></div>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 border-b border-slate-100">
                <th className="py-2 font-bold">সদস্য</th>
                <th className="py-2 font-bold">স্লট</th>
                <th className="py-2 font-bold">অবস্থা</th>
                <th className="py-2 font-bold text-right">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              {monthRows
                .sort((a, b) => ['overdue', 'current', 'pending', 'paid', 'upcoming'].indexOf(a.line!.status) - ['overdue', 'current', 'pending', 'paid', 'upcoming'].indexOf(b.line!.status))
                .map(r => {
                  const st = r.line!.status;
                  const color = st === 'paid' ? 'text-emerald-600' : st === 'pending' ? 'text-amber-600' : st === 'upcoming' ? 'text-slate-400' : 'text-red-600';
                  return (
                    <tr key={r.member.id + r.slotLabel} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800 font-medium">{r.member.displayName}</td>
                      <td className="py-2 text-slate-500 text-xs">{r.slotLabel}</td>
                      <td className={`py-2 text-xs font-bold ${color}`}>{STATUS_BN[st]}</td>
                      <td className="py-2 text-right text-slate-700">{taka(r.line!.baseAmount + r.line!.lateFine)}</td>
                    </tr>
                  );
                })}
              {monthRows.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-400 text-xs">এই মাসে কোনো সক্রিয় স্লট নেই</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dues list */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:shadow-none">
        <h3 className="font-bold text-slate-800 mb-4 font-heading">বকেয়া তালিকা</h3>
        {duesList.length === 0 ? (
          <p className="text-sm text-emerald-600 text-center py-4">কারো কোনো বকেয়া নেই</p>
        ) : (
          <div className="space-y-3">
            {duesList.map(d => (
              <div key={d.ledger.member.id} className="border border-red-100 bg-red-50/40 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-800 text-sm">{d.ledger.member.displayName}</p>
                  <p className="font-bold text-red-600 text-sm">{taka(d.ledger.dueAmount)}</p>
                </div>
                {d.lines.map(x => (
                  <p key={x.slot} className="text-xs text-slate-600 mt-1">
                    <span className="font-medium">{x.slot}:</span>{' '}
                    {x.months.length > 0 && monthListLabelBn(x.months)}
                    {x.years.length > 0 && ` • বার্ষিক ${x.years.join(', ')}`}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Year grid: every member x every month */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:shadow-none">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-slate-800 font-heading">বার্ষিক ছক</h3>
          <select value={matrixYear} onChange={e => setMatrixYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none">
            {Array.from(new Set(monthOptions.map(m => m.slice(0, 4)))).map(y => <option key={y} value={y}>{toBnDigits(y)}</option>)}
          </select>
        </div>
        <p className="text-[10px] text-slate-500 mb-3">✓ পরিশোধিত • … অপেক্ষমাণ • ✗ বকেয়া • ফাঁকা = হিসাব শুরু হয়নি / ভবিষ্যৎ</p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="text-[11px] border-collapse min-w-max">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left font-bold py-1 pr-3 sticky left-0 bg-white">সদস্য / স্লট</th>
                {Array.from({ length: 12 }, (_, i) => `${matrixYear}-${String(i + 1).padStart(2, '0')}`).map(m => (
                  <th key={m} className="font-bold px-1 py-1">{BN_SHORT[Number(m.slice(5)) - 1]}</th>
                ))}
                <th className="font-bold px-1 py-1">বার্ষিক</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.flatMap(l => l.slots.map(sl => {
                const all = [...sl.months, ...sl.upcoming];
                const annual = sl.annual.find(a => a.year === matrixYear);
                return (
                  <tr key={l.member.id + sl.slot.nameId} className="border-t border-slate-50">
                    <td className="py-1 pr-3 sticky left-0 bg-white whitespace-nowrap">
                      <span className="font-medium text-slate-700">{l.member.displayName}</span>
                      {l.member.names.length > 1 && <span className="text-slate-400"> • {sl.slot.label}</span>}
                    </td>
                    {Array.from({ length: 12 }, (_, i) => `${matrixYear}-${String(i + 1).padStart(2, '0')}`).map(m => {
                      const line = all.find(x => x.month === m);
                      const st = line?.status;
                      const cls = st === 'paid' ? 'bg-emerald-100 text-emerald-700' : st === 'pending' ? 'bg-amber-100 text-amber-700' : st === 'overdue' || st === 'current' ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-300';
                      const sym = st === 'paid' ? '✓' : st === 'pending' ? '…' : st === 'overdue' || st === 'current' ? '✗' : '';
                      return <td key={m} className="px-0.5 py-0.5"><div className={`w-7 h-6 rounded flex items-center justify-center font-bold ${cls}`}>{sym}</div></td>;
                    })}
                    <td className="px-0.5 py-0.5">
                      <div className={`w-9 h-6 rounded flex items-center justify-center font-bold ${annual?.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : annual?.status === 'pending' ? 'bg-amber-100 text-amber-700' : annual?.status === 'overdue' ? 'bg-red-100 text-red-700' : annual ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-300'}`}>
                        {annual?.status === 'paid' ? '✓' : annual?.status === 'pending' ? '…' : annual?.status === 'overdue' ? '✗' : annual ? '○' : ''}
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* One member, everything */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:shadow-none">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800 font-heading">সদস্যের পূর্ণ বিবরণী</h3>
          <select value={statementMemberId} onChange={e => setStatementMemberId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none max-w-[55%]">
            <option value="">সদস্য বাছাই করুন</option>
            {[...activeMembers].sort((a, b) => a.displayName.localeCompare(b.displayName)).map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
          </select>
        </div>
        {statementMemberId && activeMembers.find(m => m.id === statementMemberId) ? (
          <MemberStatement member={activeMembers.find(m => m.id === statementMemberId)!} payments={payments} settings={settings} />
        ) : (
          <p className="text-xs text-slate-400 text-center py-3">কোনো সদস্য বাছাই করলে তার সব জমা, মাসভিত্তিক হিসাব, কে কবে অনুমোদন করেছে সব দেখা যাবে।</p>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none">
        <h3 className="font-bold text-slate-800 mb-1 font-heading">মাসিক সংগ্রহের ধারা</h3>
        <p className="text-[11px] text-slate-500 mb-4">যে মাসের চাঁদা, সেই মাসে দেখানো হয়েছে (অগ্রিম/বকেয়া সহ)। বার্ষিক চাঁদা আলাদা।</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="চাঁদা" stackId="a" fill="#10b981" />
              <Bar dataKey="জরিমানা" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:break-inside-avoid">
          <h3 className="font-bold text-slate-800 mb-4 font-heading">{monthLabelBn(reportMonth)} — স্লট স্ট্যাটাস</h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {paymentStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {paymentStatusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-slate-600 font-medium">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:break-inside-avoid overflow-hidden">
          <h3 className="font-bold text-slate-800 mb-4 font-heading">সর্বোচ্চ সঞ্চয়কারী</h3>
          <div className="space-y-3">
            {activeMembers
              .map(m => ({ ...m, total: memberSavings(m.id, payments) }))
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">{member.displayName.charAt(0)}</div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{member.displayName}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{taka(member.total)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent approved payments with what they cover */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <h3 className="font-bold text-slate-800 mb-4 font-heading">সাম্প্রতিক অনুমোদিত পেমেন্ট</h3>
        <div className="space-y-2">
          {[...approved]
            .sort((a, b) => (b.approvedAt?.toMillis?.() ?? 0) - (a.approvedAt?.toMillis?.() ?? 0))
            .slice(0, 10)
            .map(p => (
              <div key={p.id} className="flex justify-between gap-3 text-sm border-b border-slate-50 pb-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{nameOf(p.userId)} <span className="text-slate-400 text-xs">{slotOf(p)}</span></p>
                  <p className="text-[11px] text-slate-500">{describePaymentBn(p)}</p>
                </div>
                <p className="font-bold text-slate-800 shrink-0">{taka(p.amount || 0)}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
