export type Member = {
  id: string; // Firestore document ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  isActive: boolean;
  gymId: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
};

export type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  hireDate: string;
  bio?: string;
  isActive: boolean;
};

export type Attendance = {
  id: string; // Firestore document ID
  memberId: string; // Member document ID
  checkInTime: any; // Firestore Timestamp
  checkOutTime?: any; // Firestore Timestamp
  // Not in schema, but for UI
  memberName?: string;
};

export type Invoice = {
  id: string;
  invoiceId: string;
  memberId: string; // This is the gymId
  memberName: string;
  planName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
};


// Plans are kept as static data for now.
export const plans: Plan[] = [
  { id: 'p01', name: 'Monthly', price: 50, duration: 30 },
  { id: 'p02', name: 'Quarterly', price: 135, duration: 90 },
  { id: 'p03', name: 'Annual', price: 500, duration: 365 },
];
