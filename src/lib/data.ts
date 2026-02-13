export type Member = {
  id: string; // Firestore document ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  isActive: boolean;
  gymId: string;
  gymName: string;
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
  id:string;
  memberId: string;
  checkInTime: any;
};

export type Invoice = {
  id: string; // Firestore document ID
  memberId: string; // Member document ID
  membershipId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  
  // These are for UI display and will be added after fetching
  memberName?: string;
  memberEmail?: string;
  planName?: string;
};


// Plans are kept as static data for now.
export const plans: Plan[] = [
  { id: 'p01', name: 'Monthly', price: 50, duration: 30 },
  { id: 'p02', name: 'Quarterly', price: 135, duration: 90 },
  { id: 'p03', name: 'Annual', price: 500, duration: 365 },
];
