const fs = require('fs');
let file = fs.readFileSync('src/types.ts', 'utf8');

file += `
export interface Investment {
  id: string;
  name: string;
  category: string;
  amount: number;
  purpose: string;
  description: string;
  expectedReturn: string;
  expectedRisk: string;
  duration: string;
  startDate: string;
  endDate?: string;
  createdBy: string;
  createdAt: any;
  status: 'DRAFT' | 'PROPOSED' | 'VOTING' | 'PENDING_ADMIN_APPROVAL' | 'FIRST_APPROVAL_50' | 'FULLY_APPROVED_100' | 'INVESTED' | 'COMPLETED' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
  
  votingRequired: boolean;
  votingDeadline?: any;
  totalVotes?: number;
  approveVotes?: number;
  rejectVotes?: number;
  votedUserIds?: string[];

  firstApproverId?: string;
  firstApproverName?: string;
  firstApprovedAt?: any;
  
  secondApproverId?: string;
  secondApproverName?: string;
  secondApprovedAt?: any;
  
  fundDeducted: boolean;
  fundDeductedAt?: any;
  financialTransactionId?: string;
  amountDeducted?: number;
  
  returnedAmount?: number;
  profit?: number;
  loss?: number;
  returnDate?: any;
  closedAt?: any;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  type: 'outflow' | 'return';
  amount: number;
  description: string;
  createdAt: any;
  approvedBy: string;
}
`;

fs.writeFileSync('src/types.ts', file);
