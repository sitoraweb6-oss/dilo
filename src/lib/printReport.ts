/**
 * Clean, printable Bangla reports.
 *
 * jsPDF cannot shape Bangla text, so names came out as garbage. Instead we build a
 * styled HTML page and let the browser print it — "Save as PDF" gives a crisp PDF
 * with correct Bangla, on desktop and on Android Chrome alike.
 */
import { format } from 'date-fns';
import { Expense, Payment, UserProfile } from '../types';
import {
  MemberLedger, MonthLine, collectionByCoveredMonth, getPaymentCoverage, monthLabelBn, monthListLabelBn,
  monthRange, paidDateOf, systemApproved, toBnDigits,
} from './ledger';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const tk = (n: number) => `৳${toBnDigits(Math.round(n).toLocaleString('en-IN'))}`;
const bnDate = (d: Date | null) => (d ? toBnDigits(format(d, 'dd/MM/yyyy')) : '—');
const bnDay = (d: Date | null) => (d ? toBnDigits(format(d, 'dd/MM')) : '');

const STATUS: Record<MonthLine['status'], [string, string]> = {
  paid: ['পরিশোধিত', 'ok'],
  pending: ['অপেক্ষমাণ', 'wait'],
  overdue: ['বকেয়া', 'due'],
  current: ['বাকি', 'due'],
  upcoming: ['—', 'muted'],
};

function shell(title: string, body: string, landscape = false) {
  return `<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 10mm 9mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Nirmala UI', 'Vrinda', sans-serif; color: #0f172a; margin: 0; font-size: 12.5px; line-height: 1.4; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 16px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0b4f4a; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 700; color: #0b4f4a; }
  .brand small { display: block; font-size: 12px; color: #475569; font-weight: 500; }
  .meta { text-align: right; color: #475569; font-size: 11px; }
  h2 { font-size: 14px; color: #0b4f4a; margin: 18px 0 8px; border-left: 4px solid #0b4f4a; padding-left: 8px; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
  .card b { display: block; font-size: 15px; margin-top: 2px; }
  .card.green b { color: #047857; } .card.red b { color: #b91c1c; } .card.amber b { color: #b45309; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0b4f4a; color: #fff; font-weight: 600; text-align: left; padding: 5px 6px; font-size: 10.5px; }
  td { border-bottom: 1px solid #e2e8f0; padding: 4px 6px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .ok { background: #d1fae5; color: #065f46; } .wait { background: #fef3c7; color: #92400e; }
  .due { background: #fee2e2; color: #991b1b; } .muted { color: #94a3b8; }
  .man { background: #e0e7ff; color: #3730a3; }
  .small { font-size: 9.5px; color: #64748b; }
  .grid td, .grid th { text-align: center; padding: 3px 1px; font-size: 10.5px; }
  .grid td.name, .grid th.name { text-align: left; padding-left: 6px; white-space: nowrap; }
  .cell { display: block; border-radius: 3px; padding: 2px 0; font-weight: 600; }
  tfoot td { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #0b4f4a; }
  .sign { display: flex; justify-content: space-between; margin-top: 36px; break-inside: avoid; }
  .sign div { width: 30%; border-top: 1px solid #334155; text-align: center; padding-top: 4px; color: #475569; }
  .note { color: #64748b; font-size: 10px; margin-top: 6px; }
  /* print: use the full page width so nothing gets shrunk and pages stay full */
  @media print { .wrap { max-width: none; width: 100%; padding: 0; margin: 0; box-shadow: none; } thead { display: table-header-group; } tr { break-inside: avoid; } h2 { break-after: avoid; } }
  @media screen { body { background: #e2e8f0; } .wrap { background: #fff; margin: 16px auto; box-shadow: 0 2px 12px rgba(0,0,0,.08); } }
  .avoid { break-inside: avoid; }
</style></head><body><div class="wrap">${body}</div>
<script>
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
    .then(function(){ setTimeout(function(){ window.print(); }, 300); });
</script></body></html>`;
}

function header(title: string, subtitle: string) {
  return `<header><div class="brand">মিছাক | ميثاق<small>${esc(title)}</small></div>
  <div class="meta">${esc(subtitle)}<br>তৈরি: ${bnDate(new Date())}</div></header>`;
}

function openPrint(html: string) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('রিপোর্ট খুলতে পপ-আপ অনুমতি দিন।');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export interface ReportData {
  ledgers: MemberLedger[];
  payments: Payment[];
  users: UserProfile[];
  expenses?: Expense[];
}

const nameMap = (users: UserProfile[]) => {
  const m: Record<string, string> = {};
  users.forEach(u => { m[u.id] = u.displayName; });
  return m;
};

function approvers(p: Payment | undefined, names: Record<string, string>) {
  if (!p) return '';
  const a = p.firstApprovedByName || (p.firstApprovedBy ? names[p.firstApprovedBy] : '');
  const b = p.secondApprovedByName || ((p.secondApprovedBy || p.approvedBy) ? names[(p.secondApprovedBy || p.approvedBy)!] : '');
  return [a, b].filter(Boolean).map(esc).join(' ও ');
}

function duesTable(ledgers: MemberLedger[]) {
  const rows = ledgers.filter(l => l.hasDues).sort((a, b) => b.dueAmount - a.dueAmount);
  if (!rows.length) return '<p class="note">কারো কোনো বকেয়া নেই।</p>';
  let i = 0;
  const body = rows.flatMap(l => l.slots.filter(s => s.dueAmount > 0).map(s => {
    const months = s.months.filter(x => x.status === 'overdue' || x.status === 'current');
    const fine = months.reduce((t, x) => t + x.lateFine, 0);
    const years = s.annual.filter(a => a.status === 'overdue').map(a => toBnDigits(a.year));
    return `<tr><td>${toBnDigits(++i)}</td><td>${esc(l.member.displayName)}</td><td>${esc(s.slot.label)}</td>
      <td>${esc(monthListLabelBn(months.map(x => x.month)))}${years.length ? `<br><span class="small">বার্ষিক: ${years.join(', ')}</span>` : ''}</td>
      <td class="num">${tk(fine)}</td><td class="num"><b>${tk(s.dueAmount)}</b></td></tr>`;
  })).join('');
  const total = rows.reduce((t, l) => t + l.dueAmount, 0);
  return `<table><thead><tr><th>#</th><th>সদস্য</th><th>স্লট</th><th>বকেয়া মাস</th><th class="num">জরিমানা</th><th class="num">মোট বকেয়া</th></tr></thead>
    <tbody>${body}</tbody><tfoot><tr><td colspan="5">সর্বমোট বকেয়া</td><td class="num">${tk(total)}</td></tr></tfoot></table>`;
}

const signBlock = `<div class="sign avoid"><div>প্রস্তুতকারী</div><div>প্রথম অনুমোদনকারী</div><div>দ্বিতীয় অনুমোদনকারী</div></div>`;

// ---------------------------------------------------------------------------------------------
export function printMonthlyReport(month: string, d: ReportData) {
  const names = nameMap(d.users);
  const byMonth = collectionByCoveredMonth(d.payments);
  const col = byMonth.get(month) || { base: 0, fine: 0 };

  const rows = d.ledgers.flatMap(l => l.slots.map(s => ({
    member: l.member, slot: s.slot, line: [...s.months, ...s.upcoming].find(x => x.month === month),
  }))).filter(r => r.line)
    .sort((a, b) => a.member.displayName.localeCompare(b.member.displayName));

  const expected = rows.reduce((t, r) => t + r.line!.baseAmount, 0);
  const cnt = (st: MonthLine['status'][]) => rows.filter(r => st.includes(r.line!.status)).length;
  const received = systemApproved(d.payments).filter(p => {
    const pd = paidDateOf(p);
    return pd ? format(pd, 'yyyy-MM') === month : p.month === month;
  }).reduce((t, p) => t + (p.amount || 0), 0);

  const body = rows.map((r, i) => {
    const l = r.line!;
    const p = l.payment;
    const part = p ? getPaymentCoverage(p).perMonth[month] : undefined;
    const [label, cls] = STATUS[l.status];
    return `<tr>
      <td>${toBnDigits(i + 1)}</td>
      <td>${esc(r.member.displayName)}</td>
      <td>${esc(r.slot.label)}</td>
      <td><span class="tag ${cls}">${label}</span>${p?.entryType === 'manual' ? ' <span class="tag man">ম্যানুয়াল</span>' : ''}</td>
      <td class="num">${tk(part ? part.base : l.baseAmount)}</td>
      <td class="num">${part ? (part.fine ? tk(part.fine) : '—') : (l.lateFine ? `<span class="small">${tk(l.lateFine)}</span>` : '—')}</td>
      <td>${p ? bnDate(paidDateOf(p)) : '—'}</td>
      <td>${p ? `${esc(p.paymentMethod || '')}${p.transactionId ? `<br><span class="small">${esc(p.transactionId)}</span>` : ''}` : ''}</td>
      <td class="small">${approvers(p, names)}</td>
    </tr>`;
  }).join('');

  const html = shell(`মাসিক রিপোর্ট ${month}`, `
    ${header(`মাসিক রিপোর্ট — ${monthLabelBn(month)}`, `${toBnDigits(rows.length)}টি স্লট`)}
    <div class="cards">
      <div class="card">প্রত্যাশিত চাঁদা<b>${tk(expected)}</b></div>
      <div class="card green">আদায় (এই মাসের চাঁদা)<b>${tk(col.base)}</b></div>
      <div class="card amber">আদায় (জরিমানা)<b>${tk(col.fine)}</b></div>
      <div class="card">এই মাসে মোট জমা<b>${tk(received)}</b></div>
    </div>
    <div class="cards" style="margin-top:8px">
      <div class="card green">পরিশোধিত<b>${toBnDigits(cnt(['paid']))}টি স্লট</b></div>
      <div class="card amber">অপেক্ষমাণ<b>${toBnDigits(cnt(['pending']))}টি স্লট</b></div>
      <div class="card red">বাকি<b>${toBnDigits(cnt(['overdue', 'current']))}টি স্লট</b></div>
      <div class="card">আদায়ের হার<b>${expected ? toBnDigits(Math.round((col.base / expected) * 100)) : '০'}%</b></div>
    </div>
    <p class="note">"আদায়" মানে এই মাসের চাঁদা বাবদ অনুমোদিত টাকা (অগ্রিম/পরে দেওয়া সহ)। "এই মাসে মোট জমা" মানে এই মাসে হাতে আসা সব টাকা।</p>

    <h2>সদস্যভিত্তিক হিসাব</h2>
    <table><thead><tr><th>#</th><th>সদস্য</th><th>স্লট</th><th>অবস্থা</th><th class="num">চাঁদা</th><th class="num">জরিমানা</th><th>জমার তারিখ</th><th>মাধ্যম</th><th>অনুমোদন</th></tr></thead>
    <tbody>${body}</tbody></table>

    <h2>বর্তমান বকেয়া তালিকা (সব মাস মিলিয়ে)</h2>
    ${duesTable(d.ledgers)}
    ${signBlock}
  `);
  openPrint(html);
}

// ---------------------------------------------------------------------------------------------
export function printYearlyReport(year: string, d: ReportData) {
  const months = monthRange(`${year}-01`, `${year}-12`);
  const byMonth = collectionByCoveredMonth(d.payments);
  const annualCol = systemApproved(d.payments).reduce((t, p) => t + (getPaymentCoverage(p).perAnnual[year] || 0), 0);
  const BN_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

  // month summary
  let totExp = 0, totBase = 0, totFine = 0;
  const monthRows = months.map(m => {
    const lines = d.ledgers.flatMap(l => l.slots.map(s => s.months.find(x => x.month === m))).filter(Boolean) as MonthLine[];
    const exp = lines.reduce((t, x) => t + x.baseAmount, 0);
    const v = byMonth.get(m) || { base: 0, fine: 0 };
    totExp += exp; totBase += v.base; totFine += v.fine;
    if (!lines.length && !v.base) return '';
    return `<tr><td>${monthLabelBn(m, false)}</td><td class="num">${tk(exp)}</td><td class="num">${tk(v.base)}</td><td class="num">${tk(v.fine)}</td>
      <td class="num">${toBnDigits(lines.filter(x => x.status === 'paid').length)}</td>
      <td class="num">${toBnDigits(lines.filter(x => x.status === 'pending').length)}</td>
      <td class="num">${toBnDigits(lines.filter(x => x.status === 'overdue' || x.status === 'current').length)}</td></tr>`;
  }).join('');

  const yearExpenses = (d.expenses || [])
    .filter(e => (e as any).status === 'approved' && String(e.date || '').startsWith(year))
    .reduce((t, e) => t + (e.amount || 0), 0);

  // year grid: only months that have any slot or collection, so columns stay readable
  const gridMonths = months.filter(m =>
    d.ledgers.some(l => l.slots.some(s => [...s.months, ...s.upcoming].some(x => x.month === m && x.status !== 'upcoming'))) ||
    (byMonth.get(m)?.base || 0) > 0
  );
  const gridRows = d.ledgers
    .slice().sort((a, b) => a.member.displayName.localeCompare(b.member.displayName))
    .flatMap(l => l.slots.map(s => {
      const all = [...s.months, ...s.upcoming];
      let rowTotal = 0;
      const cells = gridMonths.map(m => {
        const line = all.find(x => x.month === m);
        if (!line) return '<td></td>';
        if (line.status === 'paid' && line.payment) {
          const part = getPaymentCoverage(line.payment).perMonth[m];
          rowTotal += part ? part.base + part.fine : line.baseAmount;
          return `<td><span class="cell ok">${bnDay(paidDateOf(line.payment))}${line.payment.entryType === 'manual' ? '*' : ''}</span></td>`;
        }
        if (line.status === 'pending') return '<td><span class="cell wait">…</span></td>';
        if (line.status === 'overdue' || line.status === 'current') return '<td><span class="cell due">✗</span></td>';
        return '<td></td>';
      }).join('');
      const a = s.annual.find(x => x.year === year);
      if (a?.status === 'paid' && a.payment) rowTotal += getPaymentCoverage(a.payment).perAnnual[year] || 0;
      const aCell = !a ? '' : a.status === 'paid' ? `<span class="cell ok">${bnDay(a.payment ? paidDateOf(a.payment) : null)}</span>`
        : a.status === 'pending' ? '<span class="cell wait">…</span>' : a.status === 'overdue' ? '<span class="cell due">✗</span>' : '<span class="cell muted">○</span>';
      return `<tr><td class="name">${esc(l.member.displayName)}${l.member.names.length > 1 ? ` <span class="small">${esc(s.slot.label)}</span>` : ''}</td>${cells}<td>${aCell}</td><td class="num">${tk(rowTotal)}</td></tr>`;
    })).join('');

  const html = shell(`বার্ষিক রিপোর্ট ${year}`, `
    ${header(`বার্ষিক রিপোর্ট — ${toBnDigits(year)}`, `${toBnDigits(d.ledgers.length)} জন সদস্য`)}
    <div class="cards">
      <div class="card green">মাসিক চাঁদা আদায়<b>${tk(totBase)}</b></div>
      <div class="card amber">জরিমানা আদায়<b>${tk(totFine)}</b></div>
      <div class="card green">বার্ষিক চাঁদা আদায়<b>${tk(annualCol)}</b></div>
      <div class="card red">এ বছরের খরচ<b>${tk(yearExpenses)}</b></div>
    </div>

    <h2>মাসভিত্তিক সারাংশ</h2>
    <table><thead><tr><th>মাস</th><th class="num">প্রত্যাশিত</th><th class="num">চাঁদা আদায়</th><th class="num">জরিমানা</th><th class="num">পরিশোধিত স্লট</th><th class="num">অপেক্ষমাণ</th><th class="num">বাকি স্লট</th></tr></thead>
    <tbody>${monthRows}</tbody>
    <tfoot><tr><td>মোট</td><td class="num">${tk(totExp)}</td><td class="num">${tk(totBase)}</td><td class="num">${tk(totFine)}</td><td colspan="3"></td></tr></tfoot></table>

    <h2>বার্ষিক ছক (ঘরে জমার তারিখ)</h2>
    <table class="grid"><thead><tr><th class="name">সদস্য</th>${gridMonths.map(m => `<th>${BN_SHORT[Number(m.slice(5)) - 1]}</th>`).join('')}<th>বার্ষিক</th><th class="num">মোট</th></tr></thead>
    <tbody>${gridRows}</tbody></table>
    <p class="note">ঘরের তারিখ = যেদিন টাকা জমা হয়েছে (দিন/মাস) • … অপেক্ষমাণ • ✗ বকেয়া • ○ এ বছরে দিতে হবে • * ম্যানুয়াল এন্ট্রি</p>

    <h2>বর্তমান বকেয়া তালিকা</h2>
    ${duesTable(d.ledgers)}
    ${signBlock}
  `, true);
  openPrint(html);
}
