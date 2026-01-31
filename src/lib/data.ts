export type Member = {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  joinDate: string;
  expiryDate: string;
  avatar: string;
};

export type Trainer = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  avatar: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
};

export type Payment = {
  id: string;
  memberName: string;
  planName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed';
};

export type Attendance = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  checkInTime: string;
  status: 'Checked-in' | 'Absent';
};

export const members: Member[] = [];

export const trainers: Trainer[] = [];

export const plans: Plan[] = [
  { id: 'p01', name: 'Monthly', price: 50, duration: 30 },
  { id: 'p02', name: 'Quarterly', price: 135, duration: 90 },
  { id: 'p03', name: 'Annual', price: 500, duration: 365 },
];

export const payments: Payment[] = [];

export const attendance: Attendance[] = [];

export const dashboardStats = {
  totalMembers: 0,
  activeMembers: 0,
  totalRevenue: 0,
  expiringSoon: 0,
};
