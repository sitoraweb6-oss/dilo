const fs = require('fs');
let file = fs.readFileSync('src/components/home/FloatingAdminActions.tsx', 'utf8');

file = file.replace(
  "import { Plus, Bell, Receipt, Vote, UserPlus, Megaphone, Image as ImageIcon, BookOpen, Settings, ShieldCheck } from 'lucide-react';",
  "import { Plus, Bell, Receipt, Vote, UserPlus, Megaphone, Image as ImageIcon, BookOpen, Settings, ShieldCheck, TrendingUp } from 'lucide-react';"
);

file = file.replace(
  "{ id: 'expense', icon: Receipt, label: 'Add Expense', color: 'bg-rose-500', onClick: () => { setIsOpen(false); navigate('/expenses'); } },",
  "{ id: 'investment', icon: TrendingUp, label: 'Investments', color: 'bg-emerald-600', onClick: () => { setIsOpen(false); navigate('/investments'); } },\n    { id: 'expense', icon: Receipt, label: 'Add Expense', color: 'bg-rose-500', onClick: () => { setIsOpen(false); navigate('/expenses'); } },"
);

fs.writeFileSync('src/components/home/FloatingAdminActions.tsx', file);
