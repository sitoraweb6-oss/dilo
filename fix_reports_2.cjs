const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/ReportsTab.tsx', 'utf8');

file = file.replace(
  "import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';",
  "import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';\nimport { InvestmentTransaction } from '../../types';"
);

file = file.replace(
  "const [expenses, setExpenses] = useState<Expense[]>([]);",
  "const [expenses, setExpenses] = useState<Expense[]>([]);\n  const [investmentTxns, setInvestmentTxns] = useState<InvestmentTransaction[]>([]);"
);

file = file.replace(
  "const [paymentsSnap, expensesSnap, membersSnap] = await Promise.all([\n          getDocs(collection(db, 'payments')),\n          getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),\n          getDocs(collection(db, 'users'))\n        ]);",
  "const [paymentsSnap, expensesSnap, membersSnap, invTxnSnap] = await Promise.all([\n          getDocs(collection(db, 'payments')),\n          getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),\n          getDocs(collection(db, 'users')),\n          getDocs(collection(db, 'investmentTransactions'))\n        ]);"
);

file = file.replace(
  "setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));",
  "setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));\n        setInvestmentTxns(invTxnSnap.docs.map(d => ({ id: d.id, ...d.data() } as InvestmentTransaction)));"
);

file = file.replace(
  "const netBalance = totalCollection - totalExpense;",
  "const invOutflow = investmentTxns.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);\n  const invReturn = investmentTxns.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);\n  const netBalance = totalCollection - totalExpense - invOutflow + invReturn;"
);

// We need to change the "বর্তমান ব্যালেন্স" (Current Balance) calculation and display.
file = file.replace(
  "<p className=\"text-2xl font-bold text-white font-heading\">৳ {netBalance.toLocaleString('en-IN')}</p>",
  "<p className=\"text-2xl font-bold text-white font-heading\">৳ {netBalance.toLocaleString('en-IN')}</p>\n          {(invOutflow > 0 || invReturn > 0) && <p className=\"text-[10px] text-slate-300 mt-1\">বিনিয়োগ সমন্বয় করা হয়েছে</p>}"
);

fs.writeFileSync('src/pages/tabs/ReportsTab.tsx', file);
