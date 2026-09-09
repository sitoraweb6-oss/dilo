const fs = require('fs');
let file = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `
export type AdminRequestType = 'SLOT_INCREASE' | 'PIN_RESET' | 'ACCOUNT_MIGRATION' | 'MEMBER_DEACTIVATION' | 'MEMBER_DELETION';
export type AdminRequestStatus = 'PENDING' | 'LEVEL_1_APPROVED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface AdminRequest {
  id: string;
  requestType: AdminRequestType;
  status: AdminRequestStatus;
  
  requestedBy: string;
  requestedByName: string;
  
  targetUserId: string; // The primary member this affects
  targetUserName: string;
  
  createdAt: any;
  
  firstApprovedBy?: string;
  firstApprovedAt?: any;
  
  secondApprovedBy?: string;
  secondApprovedAt?: any;
  
  reviewedBy?: string;
  reviewedAt?: any;
  
  rejectedBy?: string;
  rejectedAt?: any;
  rejectionReason?: string;
  
  // Type-specific details (Slot Increase, PIN Hash, Migration Snapshot)
  metadata: any; 
}
`;

file = file + newTypes;
fs.writeFileSync('src/types.ts', file);
console.log("Types updated.");
