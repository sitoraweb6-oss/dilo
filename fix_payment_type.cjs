const fs = require('fs');
let file = fs.readFileSync('src/types.ts', 'utf8');

if (!file.includes('isCopiedRecord')) {
  file = file.replace(/submittedAt: any;\n\}/g, "submittedAt: any;\n  originalUserId?: string;\n  originalPaymentId?: string;\n  migrationId?: string;\n  isCopiedRecord?: boolean;\n}");
  fs.writeFileSync('src/types.ts', file);
  console.log("types.ts fixed for Payment.");
}

if (!file.includes('migratedTo?: string')) {
  file = file.replace(/status: 'active' \| 'inactive' \| 'pending_approval' \| 'rejected' \| 'migrated' \| 'pending_deletion';/g, "status: 'active' | 'inactive' | 'pending_approval' | 'rejected' | 'migrated' | 'pending_deletion';\n  migratedTo?: string;");
  fs.writeFileSync('src/types.ts', file);
  console.log("types.ts fixed for UserProfile.");
}
