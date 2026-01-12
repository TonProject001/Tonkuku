
export type LoanType = 'individual' | 'group';

export type LoanDuration = '1month' | '3month' | '5month' | '10month' | 'custom';

export interface Payment {
  id: string;
  amount: number;
  date: string; // ISO string
  slipUrl?: string; // base64 or drive link
  note?: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  type: LoanType;
  principal: number;
  interestAmount: number; 
  duration: LoanDuration;
  startDate: string;
  dueDate?: string; 
  dueDayOfMonth?: number;
  status: 'active' | 'closed';
  payments: Payment[];
  createdAt: string;
  proofUrl?: string; // เพิ่มฟิลด์หลักฐานการปล่อยกู้
}

export interface SummaryStats {
  totalLent: number;
  totalPaid: number;
  totalActiveInterest: number;
  totalClosedInterest: number;
}
