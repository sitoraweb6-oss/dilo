export type Role = 'member' | 'admin' | 'super_admin';

export interface NameSlot {
  nameId: string;
  label: string;
  monthlyDue: number;
  activeFromMonth?: string;
}

export interface SlotRequest {
  id: string;
  userId: string;
  userName: string;
  requestedSlotsCount: number;
  requestedSlotNames?: string[];
  monthlyDuePerSlot: number;
  status: 'pending' | 'level_1_approved' | 'approved' | 'rejected';
  firstApprovedBy?: string;
  firstApprovedAt?: any;
  secondApprovedBy?: string;
  secondApprovedAt?: any;
  rejectedBy?: string;
  rejectReason?: string;
  rejectedAt?: any;
  createdAt: any;
}

export interface UserProfile {
  id: string; // from document ID
  displayName: string;
  photoURL: string;
  role: Role;
  permissions?: string[];
  names: NameSlot[];
  createdAt: any; // Firestore Timestamp
  status: 'active' | 'inactive' | 'pending_approval' | 'rejected' | 'migrated' | 'pending_deletion';
  migratedTo?: string;
  fcmTokens?: string[];
  personalMobile?: string;
  emergencyContactMobile?: string;
  emergencyContactName?: string;
}

export interface UserPrivate {
  email: string;
  pinHash: string;
}

export interface Payment {
  id: string;
  userId: string;
  nameId: string;
  month: string; // YYYY-MM
  amount: number;
  proofImageURL: string;
  message: string;
  status: 'pending' | 'level_1_approved' | 'approved' | 'rejected';
  approvedBy?: string;
  firstApprovedBy?: string;
  firstApprovedAt?: any;
  secondApprovedBy?: string;
  secondApprovedAt?: any;
  rejectReason?: string;
  rejectedBy?: string;
  rejectedAt?: any;
  approvedAt?: any;
  lateFine?: number;
  baseAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  paymentType?: 'monthly' | 'annual' | 'advance';
  coveredMonthsList?: string[];
  cashRecipientName?: string;
  senderBankAccountNumber?: string;
  senderBankAccountHolderName?: string;
  submittedAt: any;
  originalUserId?: string;
  originalPaymentId?: string;
  migrationId?: string;
  isCopiedRecord?: boolean;
}

export interface YearlyPayment {
  id: string;
  userId: string;
  nameId: string;
  year: number;
  amount: number;
  proofImageURL: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  submittedAt: any;
  originalUserId?: string;
  originalPaymentId?: string;
  migrationId?: string;
  isCopiedRecord?: boolean;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  postedBy: string;
  postedAt: any;
}

export interface PollOption {
  optionId: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  votedUserIds: string[];
  createdBy: string;
  createdAt: any;
  isActive: boolean;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  action: string;
  targetId: string;
  description: string;
  timestamp: any;
}

export interface CommunityMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: any;
}

export interface AdminSupportMessage {
  id: string;
  fromUserId: string;
  message: string;
  repliedBy?: string;
  timestamp: any;
}

export interface CarouselImage {
  id: string;
  title?: string;
  caption?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  uploadedBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Hadith {
  id: string;
  arabic: string;
  bangla: string;
  reference: string;
  displayOrder: number;
  isActive: boolean;
  uploadedBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: any;
  addedBy: string;
  receiptUrl?: string;
  createdAt: any;
}

export interface PaymentSettings {
  id?: string;
  monthlyFee: number;
  dueDate: number;
  firstLateFeeStartDay: number;
  lateFee: number;
  secondPenaltyDate: number;
  secondPenaltyAmount: number;
  isAnnualPaymentEnabled?: boolean;
  annualAmount?: number;
  annualEligibleMonths?: string[];
}

export interface ProfileChangeRequest {
  id: string;
  requestType: 'NAME_CHANGE' | 'MOBILE_CHANGE' | 'PROFILE_CHANGE';
  memberUid: string;
  memberName: string;
  currentName: string;
  requestedName: string | null;
  currentPersonalMobile: string;
  requestedPersonalMobile: string | null;
  currentEmergencyContactName: string;
  requestedEmergencyContactName: string | null;
  currentEmergencyContactNumber: string;
  requestedEmergencyContactNumber: string | null;
  reason: string;
  status: 'pending' | 'level_1_approved' | 'approved' | 'rejected' | 'expired';
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
  firstApprovedBy?: string;
  firstApprovedAt?: any;
  secondApprovedBy?: string;
  secondApprovedAt?: any;
  rejectedBy?: string;
  rejectedAt?: any;
}

export interface InvestmentOpinion {
  userId: string;
  userName: string;
  vote?: 'approve' | 'reject';
  text: string;
  timestamp: any;
}

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
  opinions?: InvestmentOpinion[];

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
