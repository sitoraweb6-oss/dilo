const fs = require('fs');
let file = fs.readFileSync('src/components/home/PendingApprovalsSection.tsx', 'utf8');

const importStatement = `import { PendingMigrationItem } from '../PendingMigrationItem';\nimport { AccountMigration } from '../../types';`;

// Add imports
file = file.replace(`import { Layers } from 'lucide-react';`, `import { Layers } from 'lucide-react';\n${importStatement}`);

// Add state
const stateAdd = `const [pendingMigrations, setPendingMigrations] = useState<AccountMigration[]>([]);`;
file = file.replace(`const [pendingSlotRequests, setPendingSlotRequests] = useState<SlotRequest[]>([]);`, `const [pendingSlotRequests, setPendingSlotRequests] = useState<SlotRequest[]>([]);\n  ${stateAdd}`);

// Add subscription
const subAdd = `    const unsubMigrations = onSnapshot(query(collection(db, 'accountMigrations'), where('status', 'in', ['SUBMITTED', 'UNDER_REVIEW'])), (snap) => {
      setPendingMigrations(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountMigration)));
    }, console.error);`;

file = file.replace(`const unsubRequests = onSnapshot(query(collection(db, 'profileChangeRequests'),`, `${subAdd}\n    const unsubRequests = onSnapshot(query(collection(db, 'profileChangeRequests'),`);

// Add cleanup
file = file.replace(`unsubRequests();`, `unsubRequests();\n      unsubMigrations();`);

// Add count
file = file.replace(`const totalPending = pendingMembers.length + pendingPayments.length + pendingRequests.length + pendingSlotRequests.length;`, `const totalPending = pendingMembers.length + pendingPayments.length + pendingRequests.length + pendingSlotRequests.length + pendingMigrations.length;`);

// Render the migrations
const renderMigrations = `
        {pendingMigrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              অ্যাকাউন্ট মাইগ্রেশন ({pendingMigrations.length})
            </h3>
            {pendingMigrations.map(req => (
              <PendingMigrationItem key={req.id} migration={req} currentUser={userProfile!} />
            ))}
          </div>
        )}
`;

file = file.replace(`{pendingRequests.length > 0 && (`, `${renderMigrations}\n        {pendingRequests.length > 0 && (`);

fs.writeFileSync('src/components/home/PendingApprovalsSection.tsx', file);
console.log("PendingApprovalsSection updated.");
