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
  "getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),",
  "getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),\n          getDocs(collection(db, 'investmentTransactions')),"
);

file = file.replace(
  "const [paymentsSnap, yearlySnap, expensesSnap, membersSnap] = await Promise.all([",
  "const [paymentsSnap, yearlySnap, expensesSnap, invTxnSnap, membersSnap] = await Promise.all(["
);

file = file.replace(
  "setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));",
  "setExpenses(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));\n        setInvestmentTxns(invTxnSnap.docs.map(d => ({ id: d.id, ...d.data() } as InvestmentTransaction)));"
);

file = file.replace(
  "const netBalance = totalCollection - totalExpense;",
  "const invOutflow = investmentTxns.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);\n  const invReturn = investmentTxns.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);\n  const netBalance = totalCollection - totalExpense - invOutflow + invReturn;"
);

// We should also display investment outflows and inflows in the report
file = file.replace(
  "<div className=\"bg-white p-5 rounded-2xl border border-slate-200 shadow-sm\">",
  `<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">নিট ব্যালেন্স (তহবিল)</p>
          <p className="text-2xl font-black text-indigo-600 font-heading">৳ {netBalance.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">`
);

// Remove the old netBalance card if there was one. Oh wait, was there a netBalance card?
// Let's check ReportsTab for netBalance card.
