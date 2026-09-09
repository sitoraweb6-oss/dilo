const fs = require('fs');
let file = fs.readFileSync('src/types.ts', 'utf8');

if (!file.includes('PinRecoveryRequest')) {
  file += `
export interface PinRecoveryRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  newPinHash: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedAt: any;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: any;
}
`;
  fs.writeFileSync('src/types.ts', file);
  console.log("types.ts updated with PinRecoveryRequest.");
}
