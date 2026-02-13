export type Member = {
  id: string;
  gymId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  isActive: boolean;
};

export type Trainer = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  joiningDate: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
};

export type Invoice = {
  id: string;
  invoiceId: string;
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
};

export type Attendance = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  checkInTime: string;
  status: 'Checked-in' | 'Absent';
};

// Mock data is removed as we are now using Firestore
export const plans: Plan[] = [
  { id: 'p01', name: 'Monthly', price: 50, duration: 30 },
  { id: 'p02', name: 'Quarterly', price: 135, duration: 90 },
  { id: 'p03', name: 'Annual', price: 500, duration: 365 },
];
