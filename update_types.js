const fs = require('fs');
let file = fs.readFileSync('src/types.ts', 'utf8');

const migrationTypes = `
export type MigrationType = 'copy' | 'transfer';
export type MigrationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'FAILED';

export interface AccountMigration {
  id: string;
  sourceUserId: string;
  destinationUserId: string;
  migrationType: MigrationType;
  status: MigrationStatus;
  reason: string;
  requestedBy: string; // usually same as destinationUserId
  requestedAt: any;
  reviewedBy?: string;
  reviewedAt?: any;
  completedAt?: any;
  rejectedBy?: string;
  rejectedAt?: any;
  
  // Snapshots for audit and review
  snapshot: {
    sourceName: string;
    sourceMobile: string;
    sourceSlots: number;
    sourceSlotNames: string[];
    sourceMonthlyDue: number;
    sourcePaidTotal: number;
    sourceAdvanceTotal: number;
    sourceDue: number;
    sourcePaymentCount: number;
    sourceFundOwnership: number;
    sourceCreatedAt: any;
    
    destName: string;
    destMobile: string;
    destCreatedAt: any;
  };
}
`;

if (!file.includes('AccountMigration')) {
  file += migrationTypes;
  fs.writeFileSync('src/types.ts', file);
  console.log("Types updated.");
} else {
  console.log("Types already include AccountMigration.");
}
