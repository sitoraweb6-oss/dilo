const fs = require('fs');
let file = fs.readFileSync('src/components/home/PendingApprovalsSection.tsx', 'utf8');

const importStatement = `import { PendingPinRecoveryItem } from '../PendingPinRecoveryItem';\nimport { PinRecoveryRequest } from '../../types';`;

// Add imports
file = file.replace(`import { PendingMigrationItem }`, `${importStatement}\nimport { PendingMigrationItem }`);

// Add state
const stateAdd = `const [pendingPinRequests, setPendingPinRequests] = useState<PinRecoveryRequest[]>([]);`;
file = file.replace(`const [pendingMigrations, setPendingMigrations] = useState<AccountMigration[]>([]);`, `${stateAdd}\n  const [pendingMigrations, setPendingMigrations] = useState<AccountMigration[]>([]);`);

// Add subscription
const subAdd = `    const unsubPinRequests = onSnapshot(query(collection(db, 'pinRecoveryRequests'), where('status', '==', 'PENDING')), (snap) => {
      setPendingPinRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as PinRecoveryRequest)));
    }, console.error);`;

file = file.replace(`const unsubMigrations = onSnapshot(query(collection(db, 'accountMigrations')`, `${subAdd}\n    const unsubMigrations = onSnapshot(query(collection(db, 'accountMigrations')`);

// Add cleanup
file = file.replace(`unsubMigrations();`, `unsubMigrations();\n      unsubPinRequests();`);

// Add count
file = file.replace(`const totalPending = pendingMembers.length + pendingPayments.length + pendingRequests.length + pendingSlotRequests.length + pendingMigrations.length;`, `const totalPending = pendingMembers.length + pendingPayments.length + pendingRequests.length + pendingSlotRequests.length + pendingMigrations.length + pendingPinRequests.length;`);

// Render the requests
const renderPinRequests = `
        {pendingPinRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              PIN পরিবর্তনের আবেদন ({pendingPinRequests.length})
            </h3>
            {pendingPinRequests.map(req => (
              <PendingPinRecoveryItem key={req.id} request={req} currentUser={userProfile!} />
            ))}
          </div>
        )}
`;

file = file.replace(`{pendingMigrations.length > 0 && (`, `${renderPinRequests}\n        {pendingMigrations.length > 0 && (`);

fs.writeFileSync('src/components/home/PendingApprovalsSection.tsx', file);
console.log("PendingApprovalsSection updated with PinRecovery.");
