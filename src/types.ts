export type UserRole = 'admin' | 'viewer';

export type UserStatus = 'active' | 'suspended' | 'blocked';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status?: UserStatus;
  createdAt: string;
}

export type DiscountType = 'percentage' | 'amount';
export type BookingStatus = 'pending' | 'complete';

export interface Booking {
  id: string;
  customerName: string;
  mobileNumber: string;
  hallName: string;
  fromDate: string;
  toDate: string;
  totalAmount: number;
  discountType: DiscountType;
  discountValue: number;
  netAmount: number;
  paidAmount: number;
  returnableAmount: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'advance' | 'installment' | 'return';

export interface Transaction {
  id: string;
  bookingId: string;
  amount: number;
  type: TransactionType;
  date: string;
  recordedBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  category?: 'finance' | 'activity';
  changes: any;
  performedBy: string;
  timestamp: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  imageUrl?: string;
  youtubeUrl?: string;
  createdAt: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  authorId: string;
  imageUrl?: string;
  youtubeUrl?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  url: string;
  fileName?: string;
  category?: string;
  createdAt: string;
}
